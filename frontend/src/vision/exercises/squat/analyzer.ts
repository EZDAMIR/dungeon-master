import type { VisionEvent } from '../../../types/vision'
import type { CalibrationProfile, PoseRecognitionSample } from '../../pose/types'
import { squatFeatures } from './features'
import { SquatStateMachine } from './stateMachine'
import { corrections, evaluateRep } from './rules'
import { buildResult } from './resultBuilder'
import { squatConfig as c } from './config'
import type { RepResult, SquatFeatures } from './types'
export class SquatAnalyzer {
 private machine:SquatStateMachine
 private previous:SquatFeatures|undefined
 private reps:RepResult[]=[]
 private start:number|null=null
 private finished=false
 private profile:CalibrationProfile
 private target:number
 constructor(profile:CalibrationProfile, target:number = c.targetReps){this.target=target;this.profile=profile;this.machine=new SquatStateMachine(profile)}
 get phase(){return this.machine.phase}
 update(sample:PoseRecognitionSample):VisionEvent[] {
  if(this.finished) return []
  this.start??=sample.at
  const f=squatFeatures(sample,this.profile.activeSide,this.previous,this.profile.bodyScale)
  this.previous=f
  const phase=this.phase,completed=this.machine.update(f),events:VisionEvent[]=[]
  if(phase!==this.phase)events.push({type:'workout.phase_changed',at:sample.at,phase:this.phase})
  if(completed){
   const errors=evaluateRep(completed.metrics,completed.incomplete),rep:RepResult={index:this.reps.length+1,accepted:!errors.length,errors,metrics:completed.metrics}
   this.reps.push(rep)
   events.push({type:'workout.rep_completed',at:sample.at,repIndex:rep.index,accepted:rep.accepted,errors,metrics:rep.metrics})
   for(const code of errors)events.push({type:'workout.technique_error',at:sample.at,code,correction:corrections[code],severity:'warning'})
   if(this.reps.length>=this.target){this.finished=true;events.push({type:'workout.completed',at:sample.at,result:buildResult(this.reps,sample.at-this.start,this.target)})}
  }
  return events
 }
 cancelPartial(at:number):VisionEvent[] {const changed=this.phase!=='not_ready';this.machine.reset();this.previous=undefined;return changed ? [{type:'workout.phase_changed',at,phase:'not_ready'}] : []}
 recalibrate(profile:CalibrationProfile){this.profile=profile;this.machine=new SquatStateMachine(profile);this.previous=undefined}
 result(at:number){return buildResult(this.reps,this.start===null ? 0 : at-this.start,this.target)}
}
