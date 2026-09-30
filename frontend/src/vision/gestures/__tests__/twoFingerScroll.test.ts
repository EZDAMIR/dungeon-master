import { describe, expect, it } from 'vitest'
import { GestureEngine } from '../gestureEngine'
import { isTwoFingerScrollPose, TwoFingerScrollDetector } from '../twoFingerScrollDetector'
import type { HandRecognitionSample } from '../types'
import fixture from '../../../../tests/fixtures/hand/two-finger-scroll.json'

const viewport = { width: 1000, height: 800 }
function hand(at: number, offset = 0, mirror = false): HandRecognitionSample {
  return {
    at, aspectRatio: 16 / 9, handedness: mirror ? 'Left' : 'Right',
    gesture: { name: 'Victory', confidence: .9 },
    landmarks: fixture.landmarks.map(([x, y]) => ({ x: mirror ? 1 - x : x, y: y + offset, z: 0 })),
  }
}
function scrollEvents(engine: GestureEngine, frames = fixture.frames, mirror = false) {
  return frames.flatMap(([at, offset]) => engine.update(hand(at, offset, mirror), at, viewport))
    .filter(event => event.type === 'gesture.scrolled')
}

describe('two-finger scrolling', () => {
  it.each([false, true])('recognizes the landmark pose for either hand, without a category (mirrored=%s)', mirror => {
    const sample = hand(0, 0, mirror)
    sample.gesture = null
    expect(isTwoFingerScrollPose(sample)).toBe(true)
    const engine = new GestureEngine()
    const events = fixture.frames.flatMap(([at, offset]) => {
      const sample = hand(at, offset, mirror); sample.gesture = null
      return engine.update(sample, at, viewport)
    })
    expect(events.filter(event => event.type === 'gesture.scrolled').length).toBeGreaterThan(3)
    expect(scrollEvents(new GestureEngine(), fixture.frames, mirror).length).toBeGreaterThan(3)
  })
  it('scrolls continuously in natural direction, proportional to movement, with no selections', () => {
    const engine = new GestureEngine()
    const events = fixture.frames.flatMap(([at, offset]) => engine.update(hand(at, offset), at, viewport))
    const scrolls = events.filter(event => event.type === 'gesture.scrolled')
    expect(scrolls.length).toBeGreaterThan(3)
    expect(scrolls.every(event => event.deltaY > 0 && event.at >= 200)).toBe(true)
    expect(events.some(event => event.type === 'gesture.confirmed' || event.type === 'cursor.moved')).toBe(false)
    const down = scrollEvents(new GestureEngine(), fixture.frames.map(([at, offset]) => [at, -offset]))
    expect(down.every(event => event.deltaY < 0)).toBe(true)
    const short = scrollEvents(new GestureEngine(), fixture.frames.map(([at, offset]) => [at, offset / 2]))
    expect(scrolls.reduce((sum, e) => sum + e.deltaY, 0)).toBeCloseTo(2 * short.reduce((sum, e) => sum + e.deltaY, 0))
  })
  it('ignores stationary fingers and jitter but supports slow deliberate motion', () => {
    expect(scrollEvents(new GestureEngine(), fixture.frames.map(([at]) => [at, 0]))).toEqual([])
    expect(scrollEvents(new GestureEngine(), fixture.frames.map(([at], i) => [at, i % 2 ? .001 : 0]))).toEqual([])
    expect(scrollEvents(new GestureEngine(), Array.from({ length: 30 }, (_, i) => [i * 50, -i * .001])).length).toBeGreaterThan(0)
  })
  it('ignores one finger, an open palm, curled fingers and degenerate hands', () => {
    for (const indices of [[12], [16, 20], [8, 12]]) {
      const sample = hand(0)
      const landmarks = sample.landmarks.map(p => ({ ...p }))
      for (const tip of indices) landmarks[tip].y = tip >= 16 ? .38 : .65
      expect(isTwoFingerScrollPose({ ...sample, landmarks })).toBe(false)
    }
    expect(isTwoFingerScrollPose({ ...hand(0), landmarks: [] })).toBe(false)
    expect(isTwoFingerScrollPose({ ...hand(0), landmarks: Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 })) })).toBe(false)
  })
  it('does not scroll horizontal motion, one moving fingertip or a sudden jump', () => {
    for (const variant of ['horizontal', 'single-tip', 'jump']) {
      const engine = new GestureEngine()
      const events = fixture.frames.flatMap(([at, offset]) => {
        const sample = hand(at)
        const landmarks = sample.landmarks.map((p, index) => ({ ...p,
          x: p.x + (variant === 'horizontal' ? offset : 0),
          y: p.y + (variant === 'single-tip' && index === 8 ? offset : variant === 'jump' && at >= 200 ? -.3 : 0),
        }))
        return engine.update({ ...sample, landmarks }, at, viewport)
      })
      expect(events.some(event => event.type === 'gesture.scrolled')).toBe(false)
    }
  })
  it('cancels motion on pose release, lost hand, invalid samples, time reversal and long gaps', () => {
    for (const interruption of ['release', 'loss', 'invalid', 'reverse', 'gap']) {
      const detector = new TwoFingerScrollDetector()
      for (const at of [0, 50, 100, 150]) detector.update(hand(at), at, false)
      if (interruption === 'release') detector.update(hand(175), 175, true)
      if (interruption === 'loss') detector.reset()
      if (interruption === 'invalid') detector.update(hand(175, NaN), 175, false)
      const at = interruption === 'reverse' ? 100 : interruption === 'gap' ? 600 : 200
      expect(detector.update(hand(at, -.08), at, false)).toBeNull()
    }
  })
  it('clutches the cursor while scrolling and resumes without a jump after release', () => {
    const engine = new GestureEngine()
    const pointer = hand(0); const landmarks = pointer.landmarks.map(p => ({ ...p })); landmarks[12].y = .65
    const initial = engine.update({ ...pointer, landmarks }, 0, viewport).find(e => e.type === 'cursor.moved')
    expect(initial).toBeDefined()
    expect(scrollEvents(engine).length).toBeGreaterThan(0)
    const resumed = engine.update({ ...pointer, at: 500, landmarks }, 500, viewport).find(e => e.type === 'cursor.moved')
    expect(resumed).toMatchObject({ x: initial?.x, y: initial?.y })
  })
  it('gives pinch and held commands priority even with scroll-shaped landmarks', () => {
    for (const name of ['Closed_Fist', 'Thumb_Up']) {
      const engine = new GestureEngine()
      const events = fixture.frames.flatMap(([at, offset]) => engine.update({ ...hand(at, offset), gesture: { name, confidence: .9 } }, at, viewport))
      expect(events.some(e => e.type === 'gesture.scrolled')).toBe(false)
    }
    const detector = new TwoFingerScrollDetector()
    expect(fixture.frames.every(([at, offset]) => detector.update(hand(at, offset), at, true) === null)).toBe(true)
    const engine = new GestureEngine()
    const pinches = fixture.frames.flatMap(([at, offset]) => {
      const sample = hand(at, offset), landmarks = sample.landmarks.map(p => ({ ...p }))
      landmarks[4] = { ...landmarks[8], x: landmarks[8].x + .01 }
      return engine.update({ ...sample, landmarks }, at, viewport)
    })
    expect(pinches.some(e => e.type === 'gesture.scrolled')).toBe(false)
    expect(pinches.filter(e => e.type === 'gesture.confirmed')).toEqual([{ type: 'gesture.confirmed', at: 100, command: 'select' }])
  })
  it('ignores sustained slow motion of only one finger', () => {
    const engine = new GestureEngine()
    const events = Array.from({ length: 60 }, (_, i) => {
      const at = i * 50, sample = hand(at), landmarks = sample.landmarks.map(p => ({ ...p }))
      landmarks[8].y -= i * .001
      return engine.update({ ...sample, landmarks }, at, viewport)
    }).flat()
    expect(events.some(e => e.type === 'gesture.scrolled')).toBe(false)
  })
  it('drops an active scroll on hand loss and hand switches, and requires stable reacquisition', () => {
    const engine = new GestureEngine()
    expect(scrollEvents(engine).length).toBeGreaterThan(0)
    expect(engine.update(null, 500, viewport)).toContainEqual({ type: 'tracking.lost', at: 500, target: 'hand' })
    expect(engine.update(hand(550, -.2), 550, viewport).some(e => e.type === 'gesture.scrolled')).toBe(false)
    for (const at of [600, 650, 700, 750, 800, 850, 900, 950]) engine.update(hand(at, -.2), at, viewport)
    expect(engine.update(hand(1000, -.23), 1000, viewport).some(e => e.type === 'gesture.scrolled')).toBe(true)
    expect(engine.update(hand(1050, -.26, true), 1050, viewport).some(e => e.type === 'gesture.scrolled')).toBe(false)
  })
})
