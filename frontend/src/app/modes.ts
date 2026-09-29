export type AppMode =
  | 'TUTORIAL'
  | 'MENU'
  | 'CALIBRATION'
  | 'COUNTDOWN'
  | 'WORKOUT'
  | 'RESULTS'

export type WorkoutResult = { reps: number; errors: number }

export type AppAction =
  | { type: 'TUTORIAL_DONE' }
  | { type: 'MENU_SELECT' }
  | { type: 'CALIBRATION_DONE' }
  | { type: 'COUNTDOWN_DONE' }
  | { type: 'WORKOUT_DONE'; result: WorkoutResult }
  | { type: 'RESTART' }

export type AppState = {
  mode: AppMode
  workoutResult: WorkoutResult | null
}

export const INITIAL_STATE: AppState = { mode: 'TUTORIAL', workoutResult: null }

const TRANSITIONS: Record<AppMode, Partial<Record<AppAction['type'], AppMode>>> = {
  TUTORIAL: { TUTORIAL_DONE: 'MENU' },
  MENU: { MENU_SELECT: 'CALIBRATION' },
  CALIBRATION: { CALIBRATION_DONE: 'COUNTDOWN' },
  COUNTDOWN: { COUNTDOWN_DONE: 'WORKOUT' },
  WORKOUT: { WORKOUT_DONE: 'RESULTS' },
  RESULTS: { RESTART: 'TUTORIAL' },
}

export function transition(mode: AppMode, actionType: AppAction['type']): AppMode {
  return TRANSITIONS[mode][actionType] ?? mode
}

export function appReducer(state: AppState, action: AppAction): AppState {
  const nextMode = transition(state.mode, action.type)
  return {
    mode: nextMode,
    workoutResult: action.type === 'WORKOUT_DONE' ? action.result : state.workoutResult,
  }
}
