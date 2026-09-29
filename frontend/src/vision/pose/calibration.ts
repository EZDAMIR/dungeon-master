import { clamp, distance2D, median } from '../core/geometry'
import { poseConfig as c } from './config'
import { SideSelector, readiness, sideViewScore, metricPoint, bodyHeightEstimate } from './readiness'
import { squatFeatures } from '../exercises/squat/features'
import { SIDES } from './landmarks'
import type { CalibrationIssue, CalibrationProfile, PoseRecognitionSample, PoseSide } from './types'
export class PoseCalibration {
 private selector=new SideSelector()
 private previousAt:number|null=null
 private scores:number[]=[]
 private bodySince:number|null=null
 private angleSince:number|null=null
 private baselineSince:number|null=null
 private baseline:Array<{knee:number;hip:number;tilt:number;scale:number;score:number}>=[]
 private anchor:PoseRecognitionSample|null=null
 private profile:CalibrationProfile|null=null
 update(sample:PoseRecognitionSample):{profile:CalibrationProfile|null;progress:number;issue:CalibrationIssue|null;activeSide:PoseSide|null} {
  if(this.previousAt!==null && sample.at-this.previousAt>c.maxSampleGapMs)this.reset()
  this.previousAt=sample.at
  const side=this.selector.update(sample)
  if(!side) return {profile:null,progress:0,issue:'body_not_fully_visible',activeSide:null}
  this.scores.push(sideViewScore(sample));if(this.scores.length>c.readinessWindow)this.scores.shift()
  const rawIssue=readiness(sample,side)
  const issue=rawIssue && rawIssue!=='wrong_camera_angle' ? rawIssue : median(this.scores)<c.sideEnter ? 'wrong_camera_angle' : null
  if(issue && issue!=='wrong_camera_angle') {this.clearGates();return {profile:null,progress:0,issue,activeSide:side}}
  this.bodySince??=sample.at
  if(sample.at-this.bodySince<c.bodyStableMs) return {profile:null,progress:clamp((sample.at-this.bodySince)/c.bodyStableMs)/3,issue:null,activeSide:side}
  if(issue) {this.angleSince=null;this.clearBaseline();return {profile:null,progress:1/3,issue,activeSide:side}}
  this.angleSince??=sample.at
  if(sample.at-this.angleSince<c.angleStableMs) return {profile:null,progress:1/3+clamp((sample.at-this.angleSince)/c.angleStableMs)/3,issue:null,activeSide:side}
  const f=squatFeatures(sample,side),s=SIDES[side]
  const moved=this.anchor && [s.shoulder,s.hip].some(i=>distance2D(metricPoint(sample,i),metricPoint(this.anchor!,i))/bodyHeightEstimate(sample)>c.standingMotion)
  if(f.kneeAngle<c.standingMinAngle || moved) {this.clearBaseline();return {profile:null,progress:2/3,issue:'stand_still',activeSide:side}}
  this.anchor??=sample;this.baselineSince??=sample.at
  this.baseline.push({knee:f.kneeAngle,hip:f.hipAngle,tilt:f.torsoTilt,scale:bodyHeightEstimate(sample),score:sideViewScore(sample)})
  if(this.baseline.length>40) this.baseline.shift()
  const progress=clamp(2/3+clamp((sample.at-this.baselineSince)/c.baselineMs)/3)
  if(progress===1 && !this.profile) this.profile={version:'squat-calibration-v1',activeSide:side,standingKneeAngle:median(this.baseline.map(f=>f.knee)),standingHipAngle:median(this.baseline.map(f=>f.hip)),baselineTorsoTilt:median(this.baseline.map(f=>f.tilt)),bodyScale:median(this.baseline.map(f=>f.scale)),sideViewScore:median(this.baseline.map(f=>f.score)),createdAt:sample.at}
  return {profile:this.profile,progress,issue:null,activeSide:side}
 }
 private clearBaseline(){this.baseline=[];this.baselineSince=null;this.anchor=null;this.profile=null}
 private clearGates(){this.bodySince=null;this.angleSince=null;this.clearBaseline()}
 reset(){this.previousAt=null;this.scores=[];this.selector.reset();this.clearGates()}
}
