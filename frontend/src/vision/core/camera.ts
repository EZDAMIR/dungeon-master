import type { CameraErrorCode, VisionEvent } from '../../types/vision'
import { now } from './clock'

export const cameraMessages: Record<CameraErrorCode, string> = {
  unsupported: 'Браузер не поддерживает камеру. Открой актуальный Chrome или Edge.',
  insecure_context: 'Камера доступна только на localhost или HTTPS.',
  not_allowed: 'Доступ к камере запрещён. Разреши его в настройках сайта и повтори.',
  not_found: 'Камера не найдена. Подключи камеру и повтори.',
  not_readable: 'Камера недоступна или отключена. Закрой другие приложения камеры и повтори.',
  model_load_failed: 'Не удалось загрузить модуль распознавания. Проверь подключение и повтори.',
  unknown: 'Не удалось включить камеру. Проверь подключение и повтори.',
}
type Environment = { secure: boolean; getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream> }

export class CameraManager {
  private stream: MediaStream | null = null
  private disposed = false
  private starting: Promise<boolean> | null = null
  private listeners: Array<() => void> = []
  constructor(private video: HTMLVideoElement, private emit: (event: VisionEvent) => void,
    private env: Environment = { secure: window.isSecureContext, getUserMedia: navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) }) {}

  start(): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false)
    if (this.stream) return Promise.resolve(true)
    if (this.starting) return this.starting
    this.starting = this.open().finally(() => { this.starting = null })
    return this.starting
  }
  private error(code: CameraErrorCode) {
    if (!this.disposed) this.emit({ type: 'camera.error', at: now(), code, message: cameraMessages[code] })
  }
  private async open(): Promise<boolean> {
    this.emit({ type: 'camera.loading', at: now() })
    if (!this.env.secure) { this.error('insecure_context'); return false }
    if (!this.env.getUserMedia) { this.error('unsupported'); return false }
    try {
      const stream = await this.env.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      if (this.disposed) { stream.getTracks().forEach(track => track.stop()); return false }
      this.stream = stream
      for (const track of stream.getVideoTracks()) {
        const ended = () => { this.error('not_readable'); this.dispose() }
        track.addEventListener('ended', ended)
        this.listeners.push(() => track.removeEventListener('ended', ended))
      }
      this.video.srcObject = stream
      this.video.muted = true
      this.video.playsInline = true
      await this.video.play()
      if (this.disposed) return false
      this.emit({ type: 'camera.ready', at: now() })
      return true
    } catch (error) {
      const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : ''
      const code: CameraErrorCode = name === 'NotAllowedError' ? 'not_allowed' : name === 'NotFoundError' ? 'not_found' : name === 'NotReadableError' ? 'not_readable' : 'unknown'
      if (code === 'not_allowed' && !this.disposed) this.emit({ type: 'camera.denied', at: now(), reason: cameraMessages[code] })
      this.error(code)
      this.dispose()
      return false
    }
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.listeners.forEach(remove => remove())
    this.listeners = []
    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null
    this.video.srcObject = null
  }
}
