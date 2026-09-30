import type { VisionEvent } from '../types/vision'
import type { TutorialState } from '../features/onboarding/tutorialMachine'
import type { AppAction, AppState } from './modes'
export function mapVisionEvent(event: VisionEvent, state: AppState, tutorial: TutorialState): AppAction | null {
  if (event.type === 'camera.ready' && state.mode === 'CAMERA_PERMISSION') return { type: 'CAMERA_READY' }
  if (event.type === 'camera.error' || event.type === 'camera.denied') return { type: 'CAMERA_RETRY' }
  if(event.type==='calibration.completed' && state.mode==='CALIBRATION')return {type:'CALIBRATION_READY',profile:event.profile}
  if(event.type==='calibration.required' && ['COUNTDOWN','WORKOUT','PAUSED'].includes(state.mode))return {type:'CALIBRATION_LOST'}
  if(event.type==='pose.tracking_lost' && state.mode==='COUNTDOWN')return {type:'CALIBRATION_LOST'}
  if(event.type==='workout.countdown_done' && state.mode==='COUNTDOWN')return {type:'COUNTDOWN_DONE'}
  if(event.type==='workout.paused' && state.mode==='WORKOUT')return {type:'PAUSE'}
  if(event.type==='workout.resumed' && state.mode==='PAUSED')return {type:'RESUME'}
  if(event.type==='workout.completed' && state.mode==='WORKOUT')return {type:'WORKOUT_DONE',result:event.result}
  if(event.type.startsWith('pose.') || event.type.startsWith('calibration.') || event.type.startsWith('workout.'))return {type:'POSE_EVENT',event}
  if (event.type !== 'gesture.confirmed') return null
  if (state.mode === 'TUTORIAL') return tutorial.step === 5 && event.command === 'confirm' ? { type: 'TUTORIAL_DONE' } : null
  if (['PROFILE','PLAN','PROGRESS'].includes(state.mode) && event.command==='back') return {type:'BACK'}
  if (state.mode === 'MENU') {
    if(event.command==='select' && event.targetId==='open-profile')return {type:'OPEN_PROFILE'}
    if(event.command==='select' && event.targetId==='open-plan')return {type:'OPEN_PLAN'}
    if(event.command==='select' && event.targetId==='open-progress')return {type:'OPEN_PROGRESS'}
    if (event.command === 'select' && (event.targetId === 'bodyweight-squat' || event.targetId==='planned-squat')) return { type: 'SELECT_WORKOUT', workoutId: event.targetId }
    if (event.command === 'back') return { type: 'BACK' }
    if (event.command === 'confirm' && state.selectedWorkoutId) return { type: 'CONFIRM_SELECTION' }
  }
  if (state.mode === 'CALIBRATION' && event.command === 'back') return { type: 'BACK' }
  if(state.mode==='RESULTS'){
    if(event.command==='confirm' || (event.command==='select' && event.targetId==='repeat-squat'))return {type:'REPEAT'}
    if(event.command==='back' || (event.command==='select' && event.targetId==='results-menu'))return {type:'MENU'}
  }
  return null
}
