import { describe, expect, it } from 'vitest'
import { GestureEngine } from '../gestureEngine'
import type { HandRecognitionSample } from '../types'
import swipe from '../../../../tests/fixtures/hand/swipe.json'

function palm(at: number, x: number, y: number, name = 'Open_Palm', confidence = .9, ratio = .6) {
  const landmarks = Array.from({ length: 21 }, () => ({ x, y, z: 0 }))
  landmarks[5] = { x: x - .1, y, z: 0 }
  landmarks[17] = { x: x + .1, y, z: 0 }
  landmarks[4] = { x: x + ratio * .2, y, z: 0 }
  return { at, landmarks, gesture: { name, confidence }, handedness: 'Right' } satisfies HandRecognitionSample
}
const viewport = { width: 1000, height: 800 }
function replay(frames: number[][], name = 'Open_Palm', confidence = .9) {
  const engine = new GestureEngine()
  return frames.flatMap(([at, x, y]) => engine.update(palm(at, x, y, name, confidence), at, viewport))
}
describe('open-palm swipes', () => {
  it.each(['up', 'down'] as const)('emits one %s scroll for a deliberate stroke', direction => {
    const frames = swipe.frames.map(([at, x, y]) => [at, x, direction === 'up' ? y : 1 - y])
    const events = replay(frames)
    expect(events.filter(e => e.type === 'gesture.swiped')).toEqual([{ type: 'gesture.swiped', at: 180, direction }])
    expect(events.some(e => e.type === 'gesture.confirmed')).toBe(false)
  })
  it('ignores jitter, horizontal/diagonal movement, slow drift and one-frame jumps', () => {
    for (const frames of [
      [[0, .5, .5], [60, .51, .48], [120, .5, .52], [180, .51, .5]],
      [[0, .3, .5], [60, .4, .5], [120, .5, .5], [180, .6, .5]],
      [[0, .3, .6], [60, .4, .5], [120, .5, .4], [180, .6, .3]],
      Array.from({ length: 15 }, (_, i) => [i * 100, .5, .7 - i * .02]),
      [[0, .5, .7], [60, .5, .3]],
      [[0, .5, .7], [60, .5, .3], [120, .5, .3], [180, .5, .3]],
    ]) expect(replay(frames).some(e => e.type === 'gesture.swiped')).toBe(false)
  })
  it('rearms after a released palm and ignores fingertip-only motion', () => {
    const engine = new GestureEngine()
    swipe.frames.forEach(([at, x, y]) => engine.update(palm(at, x, y), at, viewport))
    for (const at of [300, 500, 700, 900]) engine.update(palm(at, .5, .5, 'Pointing_Up'), at, viewport)
    const events = swipe.frames.flatMap(([at, x, y]) => engine.update(palm(at + 1000, x, 1 - y), at + 1000, viewport))
    expect(events.filter(e => e.type === 'gesture.swiped')).toEqual([{ type: 'gesture.swiped', at: 1180, direction: 'down' }])
    const pointer = new GestureEngine()
    expect(swipe.frames.flatMap(([at, , y]) => {
      const hand = palm(at, .5, .5)
      hand.landmarks[8].y = y
      return pointer.update(hand, at, viewport)
    }).some(e => e.type === 'gesture.swiped')).toBe(false)
  })
  it('requires confident open palm; pointing, fist, thumb up and pinching do not scroll', () => {
    for (const name of ['Pointing_Up', 'Closed_Fist', 'Thumb_Up', 'None'])
      expect(replay(swipe.frames, name).some(e => e.type === 'gesture.swiped')).toBe(false)
    expect(replay(swipe.frames, 'Open_Palm', .5).some(e => e.type === 'gesture.swiped')).toBe(false)
    const engine = new GestureEngine()
    expect(swipe.frames.flatMap(([at, x, y]) => engine.update(palm(at, x, y, 'Open_Palm', .9, .2), at, viewport)).some(e => e.type === 'gesture.swiped')).toBe(false)
  })
  it('waits for settling and cooldown before another swipe', () => {
    const engine = new GestureEngine()
    const frames = [...swipe.frames, [300, .5, .25], [400, .5, .35], [500, .5, .5], [600, .5, .65],
      [700, .5, .65], [800, .5, .65], [900, .5, .65], [960, .5, .6], [1020, .5, .53], [1080, .5, .45]]
    const hits = frames.flatMap(([at, x, y]) => engine.update(palm(at, x, y), at, viewport)).filter(e => e.type === 'gesture.swiped')
    expect(hits).toEqual([{ type: 'gesture.swiped', at: 180, direction: 'up' }, { type: 'gesture.swiped', at: 1080, direction: 'up' }])
  })
  it('discards partial strokes on hand loss, nonfinite samples and long inference gaps', () => {
    for (const interruption of ['loss', 'invalid', 'gap']) {
      const engine = new GestureEngine()
      engine.update(palm(0, .5, .65), 0, viewport)
      engine.update(palm(60, .5, .6), 60, viewport)
      if (interruption === 'loss') engine.update(null, 100, viewport)
      if (interruption === 'invalid') engine.update(palm(100, .5, NaN), 100, viewport)
      const at = interruption === 'gap' ? 600 : 180
      expect(engine.update(palm(at, .5, .45), at, viewport).some(e => e.type === 'gesture.swiped')).toBe(false)
    }
  })
})
