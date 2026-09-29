import { describe, it, expect } from 'vitest'
import { appReducer, INITIAL_STATE, type AppAction, type AppState } from '../modes'

function runFlow(actions: AppAction[]): AppState {
  return actions.reduce(appReducer, INITIAL_STATE)
}

describe('complete fake-event flow', () => {
  const FULL_FLOW: AppAction[] = [
    { type: 'TUTORIAL_DONE' },
    { type: 'MENU_SELECT' },
    { type: 'CALIBRATION_DONE' },
    { type: 'COUNTDOWN_DONE' },
    { type: 'WORKOUT_DONE', result: { reps: 10, errors: 3 } },
  ]

  it('reaches RESULTS after the full forward sequence', () => {
    const final = runFlow(FULL_FLOW)
    expect(final.mode).toBe('RESULTS')
    expect(final.workoutResult).toEqual({ reps: 10, errors: 3 })
  })

  it('can restart and reach RESULTS again', () => {
    const afterFirst = runFlow(FULL_FLOW)
    const secondRun: AppAction[] = [
      { type: 'RESTART' },
      { type: 'TUTORIAL_DONE' },
      { type: 'MENU_SELECT' },
      { type: 'CALIBRATION_DONE' },
      { type: 'COUNTDOWN_DONE' },
      { type: 'WORKOUT_DONE', result: { reps: 7, errors: 0 } },
    ]
    const final = secondRun.reduce(appReducer, afterFirst)
    expect(final.mode).toBe('RESULTS')
    expect(final.workoutResult).toEqual({ reps: 7, errors: 0 })
  })

  it('ignores out-of-sequence actions mid-flow', () => {
    const atMenu = appReducer(INITIAL_STATE, { type: 'TUTORIAL_DONE' })
    const stayed = appReducer(atMenu, { type: 'TUTORIAL_DONE' })
    expect(stayed.mode).toBe('MENU')

    const atWorkout = runFlow(FULL_FLOW.slice(0, 4))
    const prematureResult = appReducer(atWorkout, { type: 'RESTART' })
    expect(prematureResult.mode).toBe('WORKOUT')
  })
})
