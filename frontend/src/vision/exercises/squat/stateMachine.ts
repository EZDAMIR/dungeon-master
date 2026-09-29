import { clamp } from '../../core/geometry'
import type { CalibrationProfile } from '../../pose/types'
import { squatConfig as c } from './config'
import type { RepMetrics, SquatFeatures, SquatPhase } from './types'
type Cycle = {start:number;bottom:number;min:number;maxReturn:number;peak:number;visibility:number;count:number}
export class SquatStateMachine {
 phase:SquatPhase='not_ready'
 private since=0
 private directionSince:number|null=null
 private standingSince:number|null=null
 private cycle:Cycle|null=null
 private profile:CalibrationProfile
 constructor(profile:CalibrationProfile){this.profile=profile}
 private change(phase:SquatPhase,at:number){this.phase=phase;this.since=at;this.directionSince=null}
 private held(condition:boolean,at:number){if(!condition){this.directionSince=null;return false}this.directionSince??=at;return at-this.directionSince>=c.directionHoldMs && at-this.since>=c.stateMinMs}
 update(f:SquatFeatures):{metrics:RepMetrics;incomplete:boolean}|null {
  const standing=f.kneeAngle>=this.profile.standingKneeAngle-c.standingEnterTolerance
  const down=f.kneeVelocity<-c.kneeVelocity && f.hipVelocity>c.hipVelocity
  const up=f.kneeVelocity>c.kneeVelocity && f.hipVelocity<-c.hipVelocity
  if(this.cycle && f.at-this.cycle.start>c.maximumRepMs){this.reset();return null}
  if(this.phase==='not_ready') {
   if(standing && Math.abs(f.kneeVelocity)<c.kneeVelocity){this.standingSince??=f.at;if(f.at-this.standingSince>=c.standingHoldMs)this.change('standing',f.at)}else this.standingSince=null
   return null
  }
  if(this.phase==='standing') {
   if(this.held(down && f.kneeAngle<this.profile.standingKneeAngle-c.standingExitTolerance,f.at)){
    this.cycle={start:this.directionSince??f.at,bottom:0,min:f.kneeAngle,maxReturn:f.kneeAngle,peak:f.kneeAngle,visibility:f.visibility,count:1}
    this.change('descending',f.at)
   }
   return null
  }
  const cycle=this.cycle
  if(!cycle) {this.reset();return null}
  cycle.min=Math.min(cycle.min,f.kneeAngle);cycle.visibility+=f.visibility;cycle.count++
  if(this.phase==='descending') {
   // Partial excursions are discarded. Shallow complete cycles still reach a turnaround.
   if(standing && this.profile.standingKneeAngle-cycle.min<c.minimumExcursion){this.change('standing',f.at);this.cycle=null;return null}
   if(this.held(f.kneeAngle<=c.bottomAngle || (up && f.kneeAngle>=cycle.min+c.turnaroundDegrees && this.profile.standingKneeAngle-cycle.min>=c.minimumExcursion),f.at)){
    cycle.bottom=f.at;this.change('bottom',f.at)
   }
  } else if(this.phase==='bottom') {
   if(this.held(up && f.kneeAngle>=cycle.min+c.turnaroundDegrees,f.at)){cycle.peak=f.kneeAngle;this.change('ascending',f.at)}
  } else if(this.phase==='ascending') {
   cycle.maxReturn=Math.max(cycle.maxReturn,f.kneeAngle);cycle.peak=Math.max(cycle.peak,f.kneeAngle)
   if(standing) {if(this.held(true,f.at)){const result=this.finish(f,false);this.change('standing',f.at);return result}}
   // An ascent followed by a confirmed new descent closes one rejected cycle, then waits for standing.
   else if(this.held(down && f.kneeAngle<=cycle.peak-c.turnaroundDegrees,f.at)){const result=this.finish(f,true);this.reset();return result}
  }
  return null
 }
 private finish(f:SquatFeatures,incomplete:boolean) {
  const cycle=this.cycle!
  const total=f.at-cycle.start,descent=cycle.bottom-cycle.start
  const metrics:RepMetrics={minKneeAngle:cycle.min,maxReturnKneeAngle:cycle.maxReturn,descentDurationMs:descent,ascentDurationMs:f.at-cycle.bottom,totalDurationMs:total,depthScore:clamp((this.profile.standingKneeAngle-cycle.min)/(this.profile.standingKneeAngle-c.bottomAngle)),meanVisibility:cycle.visibility/cycle.count,tempo:total<c.minimumRepMs || descent<c.minimumDescentMs ? 'fast' : total>c.slowRepMs ? 'slow' : 'ok'}
  this.cycle=null
  return {metrics,incomplete}
 }
 reset(){this.phase='not_ready';this.cycle=null;this.standingSince=null;this.directionSince=null}
}
