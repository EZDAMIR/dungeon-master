import { FilesetResolver, GestureRecognizer, type GestureRecognizerOptions } from '@mediapipe/tasks-vision'
import { visionAssets, visionConfig } from '../core/config'
import { clamp } from '../core/geometry'
import type { GestureRecognizerAdapter, HandRecognitionSample } from './types'

export class MediaPipeGestureRecognizer implements GestureRecognizerAdapter {
  private recognizer: GestureRecognizer | null = null
  private pending: Promise<void> | null = null
  private disposed = false
  initialize(): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Recognizer disposed'))
    if (this.recognizer) return Promise.resolve()
    this.pending ??= this.load()
    return this.pending
  }
  private async load() {
    const files = await FilesetResolver.forVisionTasks(visionAssets.wasm)
    if (this.disposed) return
    const options: GestureRecognizerOptions = {
      runningMode: 'VIDEO', numHands: 1,
      minHandDetectionConfidence: visionConfig.minHandDetectionConfidence,
      minHandPresenceConfidence: visionConfig.minHandPresenceConfidence,
      minTrackingConfidence: visionConfig.minTrackingConfidence,
      baseOptions: { modelAssetPath: visionAssets.model, delegate: 'GPU' },
    }
    let recognizer: GestureRecognizer
    try { recognizer = await GestureRecognizer.createFromOptions(files, options) }
    catch (error) {
      if (this.disposed) throw error
      recognizer = await GestureRecognizer.createFromOptions(files, { ...options, baseOptions: { modelAssetPath: visionAssets.model, delegate: 'CPU' } })
    }
    if (this.disposed) recognizer.close()
    else this.recognizer = recognizer
  }
  recognize(video: HTMLVideoElement, at: number): HandRecognitionSample | null {
    if (this.disposed || !this.recognizer) return null
    const result = this.recognizer.recognizeForVideo(video, at)
    const landmarks = result.landmarks[0]
    if (!landmarks || landmarks.length !== 21) return null
    const category = result.gestures[0]?.[0]
    const handedness = result.handedness[0]?.[0]?.categoryName
    return {
      at, aspectRatio: video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1, landmarks: landmarks.map(p => ({ x: p.x, y: p.y, z: p.z })),
      gesture: category ? { name: category.categoryName, confidence: clamp(category.score) } : null,
      handedness: handedness === 'Left' || handedness === 'Right' ? handedness : null,
    }
  }
  close() { this.disposed = true; this.recognizer?.close(); this.recognizer = null }
}
