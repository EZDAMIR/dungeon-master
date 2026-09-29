import type { Point } from './geometry'
export class ExponentialSmoother {
  private previous: Point | null = null
  private alpha: number
  constructor(alpha: number) { this.alpha = alpha }
  update(point: Point): Point {
    const previous = this.previous
    this.previous = previous ? { x: previous.x + this.alpha * (point.x - previous.x), y: previous.y + this.alpha * (point.y - previous.y) } : point
    return this.previous
  }
  reset() { this.previous = null }
}
