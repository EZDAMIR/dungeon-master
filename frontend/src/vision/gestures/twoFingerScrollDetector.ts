import { angleDegrees, distance } from '../core/geometry'
import { gestureConfig } from './gestureConfig'
import type { HandRecognitionSample } from './types'

const config = gestureConfig.scroll
type Tips = { index: { x: number; y: number }; middle: { x: number; y: number }; at: number }

export function isTwoFingerScrollPose(sample: HandRecognitionSample): boolean {
  const landmarks = sample.landmarks
  if (landmarks.length !== 21 || landmarks.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false
  const aspect = Number.isFinite(sample.aspectRatio) && sample.aspectRatio! > 0 ? sample.aspectRatio! : 1
  const point = (index: number) => ({ x: landmarks[index].x * aspect, y: landmarks[index].y })
  const palm = distance(point(5), point(17))
  if (palm < gestureConfig.minPalmWidth || palm > gestureConfig.maxPalmWidth) return false
  const extended = (base: number, joint: number, tip: number) =>
    angleDegrees(point(base), point(joint), point(tip)) >= config.extendedAngle &&
    distance(point(0), point(tip)) > distance(point(0), point(joint)) * config.extendedReachRatio
  const curled = (base: number, joint: number, tip: number) =>
    angleDegrees(point(base), point(joint), point(tip)) <= config.curledAngle &&
    distance(point(0), point(tip)) < distance(point(0), point(joint))
  return extended(5, 6, 8) && extended(9, 10, 12) && curled(13, 14, 16) && curled(17, 18, 20)
}

// Returns a signed fraction of the receiving viewport; no DOM or camera access.
export class TwoFingerScrollDetector {
  private previous: Tips | null = null
  private since = 0
  private samples = 0
  private smoothedIndexY = 0
  private smoothedMiddleY = 0
  private emittedIndexY = 0
  private emittedMiddleY = 0

  update(sample: HandRecognitionSample, at: number, blocked: boolean): number | null {
    if (!Number.isFinite(at) || blocked || !isTwoFingerScrollPose(sample)) { this.reset(); return null }
    const current: Tips = { index: sample.landmarks[8], middle: sample.landmarks[12], at }
    const previous = this.previous
    if (!previous || at <= previous.at || at - previous.at > config.maximumGapMs ||
      distance(current.index, previous.index) > config.maximumStepDistance ||
      distance(current.middle, previous.middle) > config.maximumStepDistance) {
      this.anchor(current)
      return null
    }
    const indexDy = current.index.y - previous.index.y
    const middleDy = current.middle.y - previous.middle.y
    const dy = (indexDy + middleDy) / 2
    const aspect = Number.isFinite(sample.aspectRatio) && sample.aspectRatio! > 0 ? sample.aspectRatio! : 1
    const dx = Math.abs((current.index.x + current.middle.x - previous.index.x - previous.middle.x) * aspect / 2)
    // Two fingers must travel together; reject sideways motion and single-tip bends.
    if ((Math.max(Math.abs(indexDy), Math.abs(middleDy)) > config.deadZone &&
      (indexDy * middleDy <= 0 || Math.abs(indexDy - middleDy) > config.maximumFingerDifference)) ||
      (dx > config.horizontalTolerance && dx > Math.abs(dy) * config.maximumHorizontalRatio)) {
      this.anchor(current)
      return null
    }
    this.previous = current
    this.samples++
    this.smoothedIndexY += config.smoothingAlpha * (current.index.y - this.smoothedIndexY)
    this.smoothedMiddleY += config.smoothingAlpha * (current.middle.y - this.smoothedMiddleY)
    if (this.samples < config.minimumSamples || at - this.since < config.engageMs) {
      this.emittedIndexY = this.smoothedIndexY
      this.emittedMiddleY = this.smoothedMiddleY
      return null
    }
    const indexDelta = this.smoothedIndexY - this.emittedIndexY
    const middleDelta = this.smoothedMiddleY - this.emittedMiddleY
    if (Math.abs(indexDelta - middleDelta) > config.maximumFingerDifference) { this.anchor(current); return null }
    if (Math.min(Math.abs(indexDelta), Math.abs(middleDelta)) <= config.deadZone || indexDelta * middleDelta <= 0) return null
    const delta = (indexDelta + middleDelta) / 2
    this.emittedIndexY = this.smoothedIndexY
    this.emittedMiddleY = this.smoothedMiddleY
    // Natural scrolling: fingers up moves content up (positive scrollTop).
    return -delta * config.gain
  }
  private anchor(tips: Tips) {
    this.previous = tips; this.since = tips.at; this.samples = 1
    this.smoothedIndexY = this.emittedIndexY = tips.index.y
    this.smoothedMiddleY = this.emittedMiddleY = tips.middle.y
  }
  reset() { this.previous = null; this.samples = 0 }
}
