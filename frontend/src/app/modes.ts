export type AppMode = 'CAMERA_PERMISSION' | 'TUTORIAL' | 'MENU' | 'CALIBRATION' | 'COUNTDOWN' | 'WORKOUT' | 'RESULTS'
export type WorkoutResult = { reps: number; errors: number }
export type AppAction =
  | { type: 'CAMERA_READY' }
  | { type: 'CAMERA_RETRY' }
  | { type: 'TUTORIAL_DONE' }
  | { type: 'SELECT_WORKOUT'; workoutId: string }
  | { type: 'CONFIRM_SELECTION' }
  | { type: 'BACK' }
  | { type: 'CALIBRATION_DONE' }
  | { type: 'COUNTDOWN_DONE' }
  | { type: 'WORKOUT_DONE'; result: WorkoutResult }
  | { type: 'RESTART' }
export type AppState = { mode: AppMode; selectedWorkoutId: string | null; workoutResult: WorkoutResult | null }
export const INITIAL_STATE: AppState = { mode: 'CAMERA_PERMISSION', selectedWorkoutId: null, workoutResult: null }
const TRANSITIONS: Record<AppMode, Partial<Record<AppAction['type'], AppMode>>> = {
  CAMERA_PERMISSION: { CAMERA_READY: 'TUTORIAL' },
  TUTORIAL: { TUTORIAL_DONE: 'MENU' },
  MENU: { CONFIRM_SELECTION: 'CALIBRATION', BACK: 'TUTORIAL' },
  CALIBRATION: { CALIBRATION_DONE: 'COUNTDOWN', BACK: 'MENU' },
  COUNTDOWN: { COUNTDOWN_DONE: 'WORKOUT' },
  WORKOUT: { WORKOUT_DONE: 'RESULTS' },
  RESULTS: { RESTART: 'TUTORIAL' },
}
export function transition(mode: AppMode, action: AppAction['type'], selectedWorkoutId: string | null = null): AppMode {
  if (action === 'CAMERA_RETRY') return 'CAMERA_PERMISSION'
  if (action === 'CONFIRM_SELECTION' && !selectedWorkoutId) return mode
  return TRANSITIONS[mode][action] ?? mode
}
export function appReducer(state: AppState, action: AppAction): AppState {
  if (action.type === 'SELECT_WORKOUT') {
    return state.mode === 'MENU' && action.workoutId === 'bodyweight-squat' ? { ...state, selectedWorkoutId: action.workoutId } : state
  }
  const mode = transition(state.mode, action.type, state.selectedWorkoutId)
  if (mode === state.mode) return state
  return { ...state, mode,
    selectedWorkoutId: mode === 'TUTORIAL' || mode === 'CAMERA_PERMISSION' ? null : state.selectedWorkoutId,
    workoutResult: action.type === 'WORKOUT_DONE' ? action.result : state.workoutResult,
  }
}
