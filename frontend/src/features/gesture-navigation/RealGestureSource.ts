import type { VisionEvent } from '../../types/vision'
import { CameraManager, cameraMessages } from '../../vision/core/camera'
import { now } from '../../vision/core/clock'
import { visionConfig } from '../../vision/core/config'
import { GestureEngine } from '../../vision/gestures/gestureEngine'
import { MediaPipeGestureRecognizer } from '../../vision/gestures/gestureRecognizer'
import type { GestureRecognizerAdapter, HandRecognitionSample } from '../../vision/gestures/types'

export class RealGestureSource {
  private camera: CameraManager
  private engine = new GestureEngine()
  private disposed = false
  private ready = false
  private starting: Promise<void> | null = null
  private frame: number | null = null
  private lastInference = -Infinity
  private lastVideoTime = -1
  private frames = 0
  private fpsSince = 0
  private fps = 0
  private video: HTMLVideoElement
  private emit: (event: VisionEvent) => void
  private raw: (sample: HandRecognitionSample | null, fps: number, inferenceMs: number) => void
  private adapter: GestureRecognizerAdapter
  constructor(video: HTMLVideoElement, emit: (event: VisionEvent) => void,
    raw: (sample: HandRecognitionSample | null, fps: number, inferenceMs: number) => void,
    adapter: GestureRecognizerAdapter = new MediaPipeGestureRecognizer()) {
    this.video = video; this.emit = emit; this.raw = raw; this.adapter = adapter
    this.camera = new CameraManager(video, event => {
      if (this.disposed || event.type === 'camera.ready') return
      this.emit(event)
      if (event.type === 'camera.error') this.dispose()
    })
  }
  start(): Promise<void> {
    if (this.disposed || this.ready) return Promise.resolve()
    this.starting ??= this.open()
    return this.starting
  }
  private async open() {
    // Permission is requested directly from the user's start action, while the model loads.
    const camera = this.camera.start()
    try {
      const [cameraReady] = await Promise.all([camera, this.adapter.initialize()])
      if (this.disposed || !cameraReady) return
      this.ready = true
      this.emit({type:'camera.ready',at:now()})
      document.addEventListener('visibilitychange',this.visibility)
      this.schedule()
    } catch {
      if (!this.disposed) this.emit({type:'camera.error',at:now(),code:'model_load_failed',message:cameraMessages.model_load_failed})
      this.dispose()
    }
  }
  private schedule() {
    if (this.frame === null && this.ready && !this.disposed && !document.hidden) this.frame = requestAnimationFrame(this.tick)
  }
  private tick = (at: number) => {
    this.frame = null
    if (this.disposed || !this.ready || document.hidden) return
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime && at - this.lastInference >= visionConfig.inferenceIntervalMs) {
      this.lastInference = at; this.lastVideoTime = this.video.currentTime
      try {
        const began = import.meta.env.DEV ? now() : 0
        const sample = this.adapter.recognize(this.video,at)
        const duration = import.meta.env.DEV ? now() - began : 0
        if (import.meta.env.DEV) {
          this.frames++
          if (at - this.fpsSince >= 1000) { this.fps = this.frames * 1000 / (at - this.fpsSince); this.frames = 0; this.fpsSince = at }
        }
        this.raw(sample,this.fps,duration)
        for (const event of this.engine.update(sample,at,{width:window.innerWidth,height:window.innerHeight})) {
          if (this.disposed) break
          this.emit(event)
        }
      } catch {
        this.emit({type:'camera.error',at:now(),code:'unknown',message:'Распознавание остановлено. Повтори запуск камеры.'})
        this.dispose()
      }
    }
    this.schedule()
  }
  private visibility = () => {
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    this.frame = null
    this.engine.reset()
    this.raw(null,0,0)
    this.emit({type:'tracking.lost',at:now(),target:'hand'})
    if (!document.hidden) { this.lastVideoTime = -1; this.lastInference = -Infinity; this.schedule() }
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true; this.ready = false
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    this.frame = null
    document.removeEventListener('visibilitychange',this.visibility)
    this.engine.reset(); this.adapter.close(); this.camera.dispose()
    this.raw(null,0,0)
    this.emit({type:'tracking.lost',at:now(),target:'hand'})
  }
}
