import { describe, expect, it } from 'vitest'
import { CursorMapper } from '../cursorMapper'
import { PinchDetector } from '../pinchDetector'
import { HoldGate } from '../../core/holdGate'
import { GestureEngine } from '../gestureEngine'
import type { HandRecognitionSample } from '../types'
import pinch from '../../../../tests/fixtures/hand/pinch.json'
import noisy from '../../../../tests/fixtures/hand/noisy-pinch.json'
import fist from '../../../../tests/fixtures/hand/fist-hold.json'
import thumb from '../../../../tests/fixtures/hand/thumb-up-hold.json'
import lost from '../../../../tests/fixtures/hand/hand-lost.json'

export function sample(at: number, ratio = .6, name = 'Open_Palm', confidence = .9): HandRecognitionSample {
  const landmarks = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }))
  landmarks[5] = { x: .4, y: .5, z: 0 }
  landmarks[17] = { x: .6, y: .5, z: 0 }
  landmarks[4] = { x: .5 + ratio * .2, y: .5, z: 0 }
  return { at, landmarks, gesture: { name, confidence }, handedness: 'Right' }
}

describe('cursor mapping', () => {
  it('mirrors exactly once and maps ROI corners to viewport', () => {
    const c = new CursorMapper()
    const left = c.map({ x: .85, y: .15 }, { width: 100, height: 200 })
    expect(left.x).toBeCloseTo(0); expect(left.y).toBe(0)
    c.reset()
    expect(c.map({ x: .15, y: .85 }, { width: 100, height: 200 })).toEqual({ x: 100, y: 200 })
  })
  it('clamps, smooths, scales after resize and resets', () => {
    const c = new CursorMapper()
    expect(c.map({ x: 2, y: -1 }, { width: 100, height: 100 })).toEqual({ x: 0, y: 0 })
    expect(c.map({ x: -1, y: 2 }, { width: 100, height: 100 })).toEqual({ x: 25, y: 25 })
    expect(c.map({ x: -1, y: 2 }, { width: 200, height: 200 })).toEqual({ x: 87.5, y: 87.5 })
    c.reset()
    expect(c.map({ x: .5, y: .5 }, { width: 200, height: 100 })).toEqual({ x: 100, y: 50 })
  })
})
describe('pinch hysteresis', () => {
  it('requires three samples, fires once, releases and re-arms', () => {
    const p = new PinchDetector()
    const hits = pinch.frames.map((ratio) => p.update(sample(0, ratio).landmarks).confirmed)
    expect(hits.filter(Boolean)).toHaveLength(2)
    expect(hits[1]).toBe(false)
    expect(hits[3]).toBe(true)
  })
  it('does not flicker around thresholds', () => {
    const p = new PinchDetector()
    expect(noisy.frames.map(r => p.update(sample(0, r).landmarks).confirmed).filter(Boolean)).toHaveLength(1)
  })
  it('handles zero palm width and reset', () => {
    const p = new PinchDetector()
    const s = sample(0, .1)
    const invalid = s.landmarks.map(() => ({ x: 0, y: 0, z: 0 }))
    expect(p.update(invalid).confirmed).toBe(false)
    for (let i = 0; i < 3; i++) p.update(s.landmarks)
    p.reset()
    expect(p.update(s.landmarks).confirmed).toBe(false)
  })
})
describe('hold gate', () => {
  it('requires 600ms, release and cooldown; never repeats during hold', () => {
    const h = new HoldGate()
    expect(h.update('back', 0).confirmed).toBe(false)
    expect(h.update('back', 599).confirmed).toBe(false)
    expect(h.update('back', 600).confirmed).toBe(true)
    expect(h.update('back', 3000).confirmed).toBe(false)
    h.update(null, 3010)
    h.update(null, 3209)
    expect(h.update('back', 3210).confirmed).toBe(false)
    h.update(null, 3220)
    h.update(null, 3420)
    h.update('back', 3430)
    expect(h.update('back', 4030).confirmed).toBe(true)
  })
  it('cooldown blocks a new hold after early full release', () => {
    const h = new HoldGate()
    h.update('confirm', 0); h.update('confirm', 600)
    h.update(null, 610); h.update(null, 810)
    expect(h.update('confirm', 1000).progress).toBe(0)
    h.update('confirm', 1300)
    expect(h.update('confirm', 1900).confirmed).toBe(true)
  })
  it('switch and loss reset progress; clamps timestamps', () => {
    const h = new HoldGate()
    h.update('back', 100)
    expect(h.update('back', 50).progress).toBe(0)
    expect(h.update('confirm', 650)).toMatchObject({ cancelled: 'back', progress: 0 })
    h.reset()
    expect(h.update('confirm', 900).confirmed).toBe(false)
    expect(h.update('confirm', 2000).progress).toBe(1)
  })
})
describe('gesture engine sequences', () => {
  const viewport = { width: 1000, height: 800 }
  it.each([[fist, 'back'], [thumb, 'confirm']] as const)('confirms canned gesture once', (fixture, command) => {
    const e = new GestureEngine()
    const events = fixture.frames.flatMap(([at, name]) => e.update(sample(Number(at), .6, String(name)), Number(at), viewport))
    expect(events.filter(x => x.type === 'gesture.confirmed')).toEqual([{ type: 'gesture.confirmed', at: 600, command }])
  })
  it('emits cursor and stable pinch; no category needed for pinch', () => {
    const e = new GestureEngine()
    const events = [0,50,100].flatMap(at => e.update(sample(at, .2, 'None'), at, viewport))
    expect(events.some(x => x.type === 'cursor.moved')).toBe(true)
    expect(events.filter(x => x.type === 'gesture.confirmed')).toHaveLength(1)
  })
  it('rejects low confidence; cancels candidate on loss and recovers', () => {
    const e = new GestureEngine()
    expect(e.update(sample(0, .6, 'Thumb_Up', .5), 0, viewport).some(x => x.type === 'gesture.candidate')).toBe(false)
    e.reset()
    const events = lost.frames.flatMap(at => e.update(at === null ? null : sample(at, .6, 'Thumb_Up'), at ?? 350, viewport))
    expect(events.some(x => x.type === 'gesture.cancelled')).toBe(true)
    expect(events.filter(x => x.type === 'tracking.acquired')).toHaveLength(2)
    expect(events.filter(x => x.type === 'gesture.confirmed')).toHaveLength(1)
  })
})
