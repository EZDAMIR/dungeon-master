import { distance } from '../core/geometry'
import { gestureConfig } from './gestureConfig'
import type { HandRecognitionSample } from './types'

type Point = { x: number; y: number }
const config = gestureConfig.swipe

export class SwipeDetector {
  private anchor: (Point & { at: number }) | null = null
  private smoothed: Point | null = null
  private previousPoint: Point | null = null
  private samples = 0
  private lastAt = -Infinity
  private firedAt = -Infinity
  private armed = true
  private settled: (Point & { at: number }) | null = null
  private releasedAt: number | null = null

  update(sample: HandRecognitionSample, at: number, blocked: boolean): 'up' | 'down' | null {
    if (!Number.isFinite(at)) return null
    const interrupted = at < this.lastAt || at - this.lastAt > config.maximumGapMs
    this.lastAt = at
    if (interrupted) {
      this.clearStroke()
      this.settled = null
      this.releasedAt = null
    }
    const open = !blocked && sample.gesture?.name === 'Open_Palm' &&
      sample.gesture.confidence >= gestureConfig.minimumClassificationConfidence
    if (!open) {
      this.clearStroke()
      this.settled = null
      this.releasedAt ??= at
      if (at - this.releasedAt >= config.settleMs && at - this.firedAt >= config.cooldownMs) this.armed = true
      return null
    }
    this.releasedAt = null
    // Palm bases move together; fingertip motion alone must not scroll.
    const point = [sample.landmarks[0], sample.landmarks[5], sample.landmarks[17]]
      .reduce((sum, p) => ({ x: sum.x + p.x / 3, y: sum.y + p.y / 3 }), { x: 0, y: 0 })
    if (!this.armed) {
      if (!this.settled || distance(point, this.settled) > config.settleDistance) this.settled = { ...point, at }
      if (at - this.settled.at < config.settleMs || at - this.firedAt < config.cooldownMs) return null
      this.armed = true
      this.settled = null
    }
    if (this.previousPoint && distance(point, this.previousPoint) > config.maximumStepDistance) this.clearStroke()
    this.previousPoint = point
    const previous = this.smoothed
    this.smoothed = previous ? {
      x: previous.x + config.smoothingAlpha * (point.x - previous.x),
      y: previous.y + config.smoothingAlpha * (point.y - previous.y),
    } : point
    if (!this.anchor || at - this.anchor.at > config.maximumDurationMs) {
      this.anchor = { ...this.smoothed, at }
      this.samples = 1
      return null
    }
    this.samples++
    const dx = this.smoothed.x - this.anchor.x, dy = this.smoothed.y - this.anchor.y
    if (Math.abs(dx) > config.maximumHorizontalDrift) {
      this.clearStroke()
      return null
    }
    if (this.samples < config.minimumSamples || at - this.anchor.at < config.minimumDurationMs || Math.abs(dy) < config.minimumDistance) return null
    this.firedAt = at
    this.armed = false
    this.settled = { ...point, at }
    this.clearStroke()
    return dy < 0 ? 'up' : 'down'
  }
  private clearStroke() { this.anchor = null; this.smoothed = null; this.previousPoint = null; this.samples = 0 }
  reset() {
    this.clearStroke()
    this.lastAt = this.firedAt = -Infinity
    this.armed = true
    this.settled = null
    this.releasedAt = null
  }
}
