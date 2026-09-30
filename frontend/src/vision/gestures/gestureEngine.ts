import type { GestureCommand, VisionEvent } from '../../types/vision'
import { HoldGate } from '../core/holdGate'
import { CursorMapper, type CursorSettings, type Viewport } from './cursorMapper'
import { PinchDetector } from './pinchDetector'
import { gestureConfig } from './gestureConfig'
import type { HandRecognitionSample } from './types'
const commands: Record<string, 'back' | 'confirm' | undefined> = { Closed_Fist: 'back', Thumb_Up: 'confirm' }

export class GestureEngine {
  private cursor = new CursorMapper()
  private pinch = new PinchDetector()
  private hold = new HoldGate()
  private tracked = false
  private candidate: GestureCommand | null = null
  private wasPinched = false
  private blocked = false
  private neutralSince: number | null = null
  private side: HandRecognitionSample['handedness'] = null
  configureInput(settings: CursorSettings) { this.cursor.configure(settings); this.requireRelease() }
  requireRelease() { this.blocked = true; this.neutralSince = null; this.candidate = null; this.pinch.reset(); this.hold.reset(); this.wasPinched = false; this.cursor.reset() }
  update(sample: HandRecognitionSample | null, at: number, viewport: Viewport): VisionEvent[] {
    const events: VisionEvent[] = []
    if (!sample || sample.landmarks.length !== 21 || sample.landmarks.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
      if (this.candidate) events.push({ type: 'gesture.cancelled', at, command: this.candidate })
      if (this.tracked) events.push({ type: 'tracking.lost', at, target: 'hand' })
      this.reset()
      return events
    }
    if (!this.tracked) { this.tracked = true; events.push({ type: 'tracking.acquired', at, target: 'hand' }) }
    const classification = sample.gesture
    const command = classification && classification.confidence >= gestureConfig.minimumClassificationConfidence ? commands[classification.name] ?? null : null
    if (this.side && sample.handedness && this.side !== sample.handedness) this.requireRelease()
    this.side = sample.handedness
    // A fist/confirm changes fingertip geometry: clutch instead of moving the UI.
    if (command) this.cursor.reset()
    else events.push({ type: 'cursor.moved', at, ...this.cursor.map(sample.landmarks[8], viewport, at) })
    const hold = this.hold.update(command, at)
    // Pinch geometry can look closed inside a fist. A recognized held command takes priority.
    const pinch = this.pinch.update(sample.landmarks, sample.aspectRatio)
    if (this.blocked) {
      if (!command && pinch.valid && !pinch.pinched && pinch.progress === 0) this.neutralSince ??= at
      else this.neutralSince = null
      if (this.neutralSince !== null && at - this.neutralSince >= 250) { this.blocked = false; this.hold.reset(); this.pinch.reset() }
      return events
    }
    if (this.wasPinched && !pinch.pinched) events.push({ type: 'gesture.cancelled', at, command: 'select' })
    this.wasPinched = pinch.pinched
    const nextCandidate = hold.command ?? (!command && pinch.progress > 0 && !pinch.pinched ? 'select' : null)
    if (this.candidate && this.candidate !== nextCandidate) events.push({ type: 'gesture.cancelled', at, command: this.candidate })
    this.candidate = nextCandidate
    if (hold.command) events.push({ type: 'gesture.candidate', at, command: hold.command, progress: hold.progress, confidence: classification?.confidence })
    else if (nextCandidate === 'select') events.push({ type: 'gesture.candidate', at, command: 'select', progress: pinch.progress })
    if (hold.confirmed && hold.command) { events.push({ type: 'gesture.confirmed', at, command: hold.command }); this.candidate = null }
    if (pinch.confirmed && !command) events.push({ type: 'gesture.confirmed', at, command: 'select' })
    return events
  }
  reset() { this.tracked = false; this.candidate = null; this.wasPinched = false; this.cursor.reset(); this.pinch.reset(); this.hold.reset(); this.side = null; this.requireRelease() }
}
