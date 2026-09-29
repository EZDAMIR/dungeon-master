import { describe, it, expect } from 'vitest'
import { buildResult } from '../../vision/exercises/squat/resultBuilder'
import { profile } from '../../../tests/fixtures/pose/profile'
import { appReducer, INITIAL_STATE, type AppState } from '../modes'
import { mapVisionEvent } from '../visionEventMapper'
import { initialTutorial, tutorialTransition, type TutorialState } from '../../features/onboarding/tutorialMachine'
import type { VisionEvent } from '../../types/vision'

function pipeline(events: VisionEvent[], start: AppState = INITIAL_STATE) {
  let state = start
  let tutorial: TutorialState = initialTutorial
  for (const event of events) {
    if (state.mode === 'TUTORIAL') tutorial = tutorialTransition(tutorial,event)
    const action = mapVisionEvent(event,state,tutorial)
    if (action) state = appReducer(state,action)
  }
  return {state,tutorial}
}
const tutorialFlow: VisionEvent[] = [
  {type:'camera.ready',at:0}, {type:'tracking.acquired',at:10,target:'hand'},
  {type:'cursor.moved',at:400,x:100,y:200}, {type:'focus.changed',at:410,targetId:'tutorial-target'},
  {type:'gesture.confirmed',at:420,command:'select',targetId:'tutorial-target'},
  {type:'gesture.confirmed',at:1100,command:'back'}, {type:'gesture.confirmed',at:2000,command:'confirm'},
]
describe('shared fake/real semantic pipeline', () => {
  it('completes tutorial, selects with pinch then confirms to calibration', () => {
    const menu = pipeline(tutorialFlow)
    expect(menu.state.mode).toBe('MENU'); expect(menu.tutorial.step).toBe(5)
    const selected = pipeline([{type:'gesture.confirmed',at:2100,command:'select',targetId:'bodyweight-squat'}],menu.state).state
    expect(selected).toMatchObject({ mode:'MENU',selectedWorkoutId:'bodyweight-squat' })
    const calibrated = pipeline([{type:'gesture.confirmed',at:3000,command:'confirm'}],selected).state
    expect(calibrated.mode).toBe('CALIBRATION')
    const result = pipeline([{type:'calibration.completed',at:3100,profile},{type:'workout.countdown_done',at:6100},{type:'workout.completed',at:10000,result:buildResult([],0)}],calibrated).state
    expect(result).toMatchObject({mode:'RESULTS',workoutResult:{totalReps:0}})
    expect(appReducer(result,{type:'RESTART'}).mode).toBe('TUTORIAL')
  })
  it('ignores confirm without selection, pinch outside target and unrelated events', () => {
    const menu = pipeline(tutorialFlow).state
    expect(pipeline([{type:'gesture.confirmed',at:2100,command:'confirm'}],menu).state).toBe(menu)
    expect(pipeline([{type:'gesture.confirmed',at:2100,command:'select'}],menu).state).toBe(menu)
    expect(pipeline([{type:'gesture.confirmed',at:2100,command:'pause'}],menu).state).toBe(menu)
    expect(pipeline([{type:'gesture.confirmed',at:2200,command:'back'}],menu).state.mode).toBe('TUTORIAL')
  })
  it('cannot skip steps and requires fresh stable tracking after loss', () => {
    let state = tutorialTransition(initialTutorial,{type:'tracking.acquired',at:0,target:'hand'})
    state = tutorialTransition(state,{type:'tracking.lost',at:300,target:'hand'})
    expect(tutorialTransition(state,{type:'cursor.moved',at:1000,x:0,y:0}).step).toBe(0)
    expect(tutorialTransition(state,{type:'gesture.confirmed',at:1200,command:'confirm'}).step).toBe(0)
    expect(pipeline(tutorialFlow.slice(0,-1)).state.mode).toBe('TUTORIAL')
  })
})
