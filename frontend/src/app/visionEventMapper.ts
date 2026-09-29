import type { VisionEvent } from '../types/vision'
import type { TutorialState } from '../features/onboarding/tutorialMachine'
import type { AppAction, AppState } from './modes'
export function mapVisionEvent(event: VisionEvent, state: AppState, tutorial: TutorialState): AppAction | null {
  if (event.type === 'camera.ready' && state.mode === 'CAMERA_PERMISSION') return { type: 'CAMERA_READY' }
  if (event.type === 'camera.error' || event.type === 'camera.denied') return { type: 'CAMERA_RETRY' }
  if (event.type !== 'gesture.confirmed') return null
  if (state.mode === 'TUTORIAL') return tutorial.step === 5 && event.command === 'confirm' ? { type: 'TUTORIAL_DONE' } : null
  if (state.mode === 'MENU') {
    if (event.command === 'select' && event.targetId === 'bodyweight-squat') return { type: 'SELECT_WORKOUT', workoutId: event.targetId }
    if (event.command === 'back') return { type: 'BACK' }
    if (event.command === 'confirm' && state.selectedWorkoutId) return { type: 'CONFIRM_SELECTION' }
  }
  if (state.mode === 'CALIBRATION' && event.command === 'back') return { type: 'BACK' }
  return null
}
