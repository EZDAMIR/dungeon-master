import { describe, it, expect } from 'vitest'
import { transition, appReducer, INITIAL_STATE, type AppMode } from '../modes'

describe('transition', () => {
  const FORWARD: Array<[AppMode, Parameters<typeof transition>[1], AppMode]> = [
    ['TUTORIAL', 'TUTORIAL_DONE', 'MENU'],
    ['MENU', 'MENU_SELECT', 'CALIBRATION'],
    ['CALIBRATION', 'CALIBRATION_DONE', 'COUNTDOWN'],
    ['COUNTDOWN', 'COUNTDOWN_DONE', 'WORKOUT'],
    ['WORKOUT', 'WORKOUT_DONE', 'RESULTS'],
    ['RESULTS', 'RESTART', 'TUTORIAL'],
  ]

  it.each(FORWARD)('%s + %s → %s', (from, action, expected) => {
    expect(transition(from, action)).toBe(expected)
  })

  it('ignores illegal actions and stays in current mode', () => {
    expect(transition('TUTORIAL', 'MENU_SELECT')).toBe('TUTORIAL')
    expect(transition('MENU', 'TUTORIAL_DONE')).toBe('MENU')
    expect(transition('WORKOUT', 'RESTART')).toBe('WORKOUT')
    expect(transition('RESULTS', 'WORKOUT_DONE')).toBe('RESULTS')
  })
})

describe('appReducer', () => {
  it('starts at TUTORIAL with no result', () => {
    expect(INITIAL_STATE).toEqual({ mode: 'TUTORIAL', workoutResult: null })
  })

  it('stores workout result when WORKOUT_DONE fires', () => {
    const beforeResult = { mode: 'WORKOUT' as const, workoutResult: null }
    const result = { reps: 12, errors: 2 }
    const next = appReducer(beforeResult, { type: 'WORKOUT_DONE', result })
    expect(next.mode).toBe('RESULTS')
    expect(next.workoutResult).toEqual(result)
  })

  it('preserves workoutResult through RESTART', () => {
    const state = { mode: 'RESULTS' as const, workoutResult: { reps: 5, errors: 1 } }
    const next = appReducer(state, { type: 'RESTART' })
    expect(next.mode).toBe('TUTORIAL')
    expect(next.workoutResult).toEqual({ reps: 5, errors: 1 })
  })
})
