import { expect, it } from 'vitest'
import { FakePoseSource } from '../../features/workout/FakePoseSource'
import { poseStage } from '../../features/workout/RealVisionSource'
import { appReducer, INITIAL_STATE } from '../modes'
import { mapVisionEvent } from '../visionEventMapper'
import { initialTutorial } from '../../features/onboarding/tutorialMachine'
import type { VisionEvent } from '../../types/vision'
function setup(){
 let state=appReducer({...INITIAL_STATE,mode:'MENU'},{type:'SELECT_WORKOUT',workoutId:'bodyweight-squat'})
 state=appReducer(state,{type:'CONFIRM_SELECTION'})
 const events:VisionEvent[]=[]
 const emit=(event:VisionEvent)=>{events.push(event);const action=mapVisionEvent(event,state,initialTutorial);if(action){const before=state.mode;state=appReducer(state,action);if(state.mode!==before){const stage=poseStage(state.mode);if(stage)source.setStage(stage)}}}
 const source=new FakePoseSource(emit,()=>{})
 return {source,emit,events,state:()=>state}
}
it('fake pose events complete calibration/countdown/5 cycles/results via the shared mapper',()=>{
 const s=setup();s.source.play('wrong-angle',0);expect(s.state().mode).toBe('CALIBRATION')
 s.source.play('standing-side',4000);expect(s.state().mode).toBe('COUNTDOWN')
 s.source.lost(8000);expect(s.state().mode).toBe('CALIBRATION')
 s.source.play('standing-side',9000);s.source.play('standing-side',13000);expect(s.state().mode).toBe('WORKOUT')
 for(const kind of ['correct-squat','shallow-squat','fast-squat','incomplete-extension','correct-squat']){s.source.standing(17000);s.source.play(kind,17000)}
 expect(s.state()).toMatchObject({mode:'RESULTS',workoutResult:{totalReps:5,acceptedReps:2,rejectedReps:3,errorCounts:{depth_insufficient:1,too_fast:1,incomplete_extension:1}}})
 expect(poseStage(s.state().mode)).toBeNull()
 s.emit({type:'gesture.confirmed',at:80000,command:'confirm'});expect(s.state().mode).toBe('CALIBRATION');expect(s.state().workout.reps).toHaveLength(0)
})
it('pause/resume preserves results and conventional back resets calibration',()=>{
 const s=setup();s.source.play('standing-side',0);s.source.play('standing-side',4000)
 s.source.standing(8000);s.source.play('correct-squat',10000);expect(s.state().workout.reps).toHaveLength(1)
 s.source.standing(16000);s.source.play('pause-gesture',18000);expect(s.state().mode).toBe('PAUSED')
 s.source.play('correct-squat',22000);expect(s.state().workout.reps).toHaveLength(1)
 s.source.standing(26000);s.source.play('pause-gesture',28000);expect(s.state().mode).toBe('WORKOUT');expect(s.state().workout.reps).toHaveLength(1)
 const calibration={...s.state(),mode:'CALIBRATION' as const}
 expect(appReducer(calibration,{type:'BACK'})).toMatchObject({mode:'MENU',workout:{profile:null,reps:[]}})
})
