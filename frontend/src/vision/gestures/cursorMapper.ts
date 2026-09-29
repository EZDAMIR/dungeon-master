import { clamp, type Point } from '../core/geometry'
import { ExponentialSmoother } from '../core/smoothing'
import { gestureConfig } from './gestureConfig'
export type Viewport = { width: number; height: number }
export class CursorMapper {
  private smoother = new ExponentialSmoother(gestureConfig.smoothingAlpha)
  map(tip: Point, viewport: Viewport): Point {
    const r = gestureConfig.roi
    const x = clamp((1 - tip.x - r.minX) / (r.maxX - r.minX))
    const y = clamp((tip.y - r.minY) / (r.maxY - r.minY))
    const point = this.smoother.update({ x, y })
    return { x: clamp(point.x * viewport.width, 0, viewport.width), y: clamp(point.y * viewport.height, 0, viewport.height) }
  }
  reset() { this.smoother.reset() }
}
