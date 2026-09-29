import { LANDMARK as L } from './landmarks'
import { poseConfig as c } from './config'
import type { PoseRecognitionSample } from './types'
export class PauseGesture {
 private since:number|null=null
 private releasedAt:number|null=null
 private locked=false
 private last=-Infinity
 update(sample:PoseRecognitionSample,eligible:boolean):boolean {
  const p=sample.landmarks
  const raised=eligible && [L.leftWrist,L.rightWrist,L.nose].every(i=>p[i]?.visibility>=c.visibility) && p[L.leftWrist].y<p[L.nose].y && p[L.rightWrist].y<p[L.nose].y
  if(this.locked){
   if(!raised){this.releasedAt??=sample.at;if(sample.at-this.releasedAt>=c.pauseReleaseMs && sample.at-this.last>=c.pauseCooldownMs){this.locked=false;this.since=null}}else this.releasedAt=null
   return false
  }
  if(!raised){this.since=null;return false}
  this.since??=sample.at
  if(sample.at-this.since<c.pauseHoldMs)return false
  this.locked=true;this.last=sample.at;this.releasedAt=null;return true
 }
 reset(){this.since=null;this.releasedAt=null;this.locked=false;this.last=-Infinity}
}
