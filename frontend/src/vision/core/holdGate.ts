import type { GestureCommand } from '../../types/vision'
import { gestureConfig as config } from '../gestures/gestureConfig'
import { clamp } from './geometry'
type HeldCommand = Exclude<GestureCommand, 'select'>
export class HoldGate {
  private command: HeldCommand | null = null
  private began = 0
  private locked = false
  private releasedAt: number | null = null
  private confirmedAt = -Infinity
  private released = false
  update(command: HeldCommand | null, at: number) {
    let cancelled: HeldCommand | null = null
    if (this.locked) {
      if (command === null) {
        this.releasedAt ??= at
        if (at - this.releasedAt >= config.releaseMs) this.released = true
      } else if (!this.released) this.releasedAt = null
      if (!this.released || at - this.confirmedAt < config.cooldownMs) return { confirmed: false, progress: 0, command: null, cancelled }
      this.locked = false; this.command = null
    }
    if (command !== this.command) {
      cancelled = this.command
      this.command = command; this.began = at
    }
    const progress = command ? clamp((at - this.began) / config.holdMs) : 0
    const confirmed = command !== null && progress >= 1
    if (confirmed) { this.locked = true; this.confirmedAt = at; this.releasedAt = null; this.released = false }
    return { confirmed, progress, command, cancelled }
  }
  reset() { this.command = null; this.locked = false; this.releasedAt = null; this.released = false; this.confirmedAt = -Infinity }
}
