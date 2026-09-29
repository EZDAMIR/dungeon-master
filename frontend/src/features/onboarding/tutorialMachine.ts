import type { VisionEvent } from '../../types/vision'
import { visionConfig } from '../../vision/core/config'
export type TutorialState = { step: number; handSince: number | null; handFound: boolean }
export const initialTutorial: TutorialState = { step: 0, handSince: null, handFound: false }
export const tutorialTargetId = 'tutorial-target'
export const tutorialSteps = [
  { name: 'Ладонь', instruction: 'Покажи ладонь перед камерой', visual: '✋' },
  { name: 'Указательный палец', instruction: 'Двигай указательным пальцем и наведи курсор на отмеченную область', visual: '☝️' },
  { name: 'Щипок', instruction: 'Соедини большой и указательный пальцы', visual: '🤏' },
  { name: 'Кулак', instruction: 'Сожми кулак и удерживай', visual: '✊' },
  { name: 'Большой палец вверх', instruction: 'Покажи большой палец вверх и удерживай', visual: '👍' },
]
export function tutorialTransition(state: TutorialState, event: VisionEvent): TutorialState {
  if (event.type === 'tracking.lost' && event.target === 'hand') return { ...state, handSince: null, handFound: false }
  if (event.type === 'tracking.acquired') return { ...state, handSince: event.at, handFound: true }
  if (state.step === 0 && state.handSince !== null && event.type === 'cursor.moved' && event.at - state.handSince >= visionConfig.handStableMs) return { ...state, step: 1 }
  if (state.step === 1 && event.type === 'focus.changed' && event.targetId === tutorialTargetId) return { ...state, step: 2 }
  if (event.type !== 'gesture.confirmed') return state
  if ((state.step === 2 && event.command === 'select' && event.targetId === tutorialTargetId) ||
      (state.step === 3 && event.command === 'back') || (state.step === 4 && event.command === 'confirm')) return { ...state, step: state.step + 1 }
  return state
}
