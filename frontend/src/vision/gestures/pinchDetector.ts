import { clamp, distance } from '../core/geometry'
import { gestureConfig as config } from './gestureConfig'
import type { HandLandmark } from './types'
export class PinchDetector {
  private pinched = false
  private consecutive = 0
  update(landmarks: readonly HandLandmark[]) {
    const palm = landmarks[5] && landmarks[17] ? distance(landmarks[5], landmarks[17]) : 0
    if (!Number.isFinite(palm) || palm < config.minPalmWidth || !landmarks[4] || !landmarks[8]) {
      this.reset()
      return { confirmed: false, progress: 0, pinched: false, valid: false }
    }
    const ratio = distance(landmarks[4], landmarks[8]) / palm
    let confirmed = false
    if (this.pinched) {
      if (ratio > config.pinchExitRatio) this.reset()
    } else {
      this.consecutive = ratio < config.pinchEnterRatio ? this.consecutive + 1 : 0
      if (this.consecutive >= config.pinchSamples) { this.pinched = true; confirmed = true }
    }
    return { confirmed, progress: clamp(this.consecutive / config.pinchSamples), pinched: this.pinched, valid: true }
  }
  reset() { this.pinched = false; this.consecutive = 0 }
}
