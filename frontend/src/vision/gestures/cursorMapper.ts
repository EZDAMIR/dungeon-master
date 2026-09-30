import { clamp, type Point } from '../core/geometry'
import { gestureConfig } from './gestureConfig'
export type Viewport = { width: number; height: number }
export type CursorSettings = { sensitivity: number; smoothingMs: number }
export class CursorMapper {
  private settings: CursorSettings = { sensitivity: 1, smoothingMs: 80 }
  private anchor: Point | null = null
  private position: Point | null = null
  private at: number | null = null
  configure(settings: CursorSettings) {
    if (!Number.isFinite(settings.sensitivity) || settings.sensitivity < .5 || settings.sensitivity > 2 || !Number.isFinite(settings.smoothingMs) || settings.smoothingMs < 0 || settings.smoothingMs > 200) return
    this.settings = { ...settings }; this.reset()
  }
  map(tip: Point, viewport: Viewport, at = (this.at ?? -50) + 50): Point {
    const r = gestureConfig.roi
    const input = { x: (1 - tip.x - r.minX) / (r.maxX - r.minX), y: (tip.y - r.minY) / (r.maxY - r.minY) }
    this.position ??= { x: clamp(input.x), y: clamp(input.y) }
    const dt = this.at === null ? 0 : at - this.at
    if (!this.anchor || dt <= 0 || dt > 500) this.anchor = input
    else {
      const alpha = this.settings.smoothingMs === 0 ? 1 : -Math.expm1(-dt / this.settings.smoothingMs)
      const filtered = { x: this.anchor.x + alpha * (input.x - this.anchor.x), y: this.anchor.y + alpha * (input.y - this.anchor.y) }
      this.position = { x: clamp(this.position.x + (filtered.x - this.anchor.x) * this.settings.sensitivity), y: clamp(this.position.y + (filtered.y - this.anchor.y) * this.settings.sensitivity) }
      this.anchor = filtered
    }
    this.at = at
    return { x: this.position.x * Math.max(0, viewport.width), y: this.position.y * Math.max(0, viewport.height) }
  }
  // Clutch/reacquire retains the screen position but forgets the physical anchor.
  reset() { this.anchor = null; this.at = null }
}
