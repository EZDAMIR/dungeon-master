import { describe, it, expect } from 'vitest'
import { transition, appReducer, INITIAL_STATE, type AppMode, type AppAction } from '../modes'

describe('transition', () => {
  const forward: Array<[AppMode, AppAction['type'], AppMode]> = [
    ['CAMERA_PERMISSION','CAMERA_READY','TUTORIAL'], ['TUTORIAL','TUTORIAL_DONE','MENU'],
    ['MENU','CONFIRM_SELECTION','CALIBRATION'], ['CALIBRATION','CALIBRATION_DONE','COUNTDOWN'],
    ['COUNTDOWN','COUNTDOWN_DONE','WORKOUT'], ['WORKOUT','WORKOUT_DONE','RESULTS'], ['RESULTS','RESTART','TUTORIAL'],
    ['MENU','BACK','TUTORIAL'], ['CALIBRATION','BACK','MENU'],
  ]
  it.each(forward)('%s + %s → %s', (from, action, expected) => expect(transition(from, action, 'bodyweight-squat')).toBe(expected))
  it('ignores every invalid mode/action combination', () => {
    const modes: AppMode[] = ['CAMERA_PERMISSION','TUTORIAL','MENU','CALIBRATION','COUNTDOWN','WORKOUT','RESULTS']
    const actions: AppAction['type'][] = ['CAMERA_READY','TUTORIAL_DONE','SELECT_WORKOUT','CONFIRM_SELECTION','BACK','CALIBRATION_DONE','COUNTDOWN_DONE','WORKOUT_DONE','RESTART']
    for (const mode of modes) for (const action of actions) if (!forward.some(([m,a]) => m === mode && a === action)) expect(transition(mode,action,'bodyweight-squat')).toBe(mode)
    for (const mode of modes) expect(transition(mode,'CAMERA_RETRY')).toBe('CAMERA_PERMISSION')
    expect(transition('MENU','CONFIRM_SELECTION')).toBe('MENU')
  })
})
describe('app reducer', () => {
  it('starts with camera permission', () => expect(INITIAL_STATE).toEqual({ mode:'CAMERA_PERMISSION',selectedWorkoutId:null,workoutResult:null }))
  it('selects without navigation and confirms only a valid selection', () => {
    const menu = { ...INITIAL_STATE, mode:'MENU' as const }
    expect(appReducer(menu,{type:'CONFIRM_SELECTION'})).toBe(menu)
    expect(appReducer(menu,{type:'SELECT_WORKOUT',workoutId:'invalid'})).toBe(menu)
    const selected = appReducer(menu,{type:'SELECT_WORKOUT',workoutId:'bodyweight-squat'})
    expect(selected.mode).toBe('MENU')
    expect(appReducer(selected,{type:'CONFIRM_SELECTION'}).mode).toBe('CALIBRATION')
  })
  it('stores valid workout results, ignores invalid ones and preserves result through restart', () => {
    const result = { reps:12,errors:2 }
    expect(appReducer(INITIAL_STATE,{type:'WORKOUT_DONE',result})).toBe(INITIAL_STATE)
    const finished = appReducer({...INITIAL_STATE,mode:'WORKOUT'},{type:'WORKOUT_DONE',result})
    expect(finished.workoutResult).toEqual(result)
    expect(appReducer(finished,{type:'RESTART'})).toMatchObject({mode:'TUTORIAL',workoutResult:result})
  })
})
