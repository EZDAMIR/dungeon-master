import { boundingBox, clamp, distance2D } from '../core/geometry'
import { LANDMARK as L, SIDES } from './landmarks'
import { poseConfig as c } from './config'
import type { CalibrationIssue, PoseRecognitionSample, PoseSide } from './types'
export const metricPoint = (sample:PoseRecognitionSample,index:number) => ({...sample.landmarks[index],x:sample.landmarks[index].x*(sample.aspectRatio??1)})
export const validPose = (s:PoseRecognitionSample|null):s is PoseRecognitionSample => !!s && s.landmarks.length===33 && s.landmarks.every(p=>[p.x,p.y,p.z,p.visibility].every(Number.isFinite))
export function requiredIndices(side:PoseSide) { const s=SIDES[side];return [s.shoulder,s.hip,s.knee,s.ankle] }
export function visibilityScore(sample:PoseRecognitionSample,side:PoseSide) {
 const s=SIDES[side],ids=[...requiredIndices(side),s.foot]
 return ids.reduce((sum,i)=>sum+sample.landmarks[i].visibility,0)/ids.length
}
export function bodyHeightEstimate(sample:PoseRecognitionSample) {
 return Math.max(sample.landmarks[L.leftFootIndex].y,sample.landmarks[L.rightFootIndex].y)-sample.landmarks[L.nose].y
}
// Paired shoulder/hip overlap relative to torso length: heuristic, not a measured orientation.
export function sideViewScore(sample:PoseRecognitionSample) {
 const torso=(distance2D(metricPoint(sample,L.leftShoulder),metricPoint(sample,L.leftHip))+distance2D(metricPoint(sample,L.rightShoulder),metricPoint(sample,L.rightHip)))/2
 const paired=(distance2D(metricPoint(sample,L.leftShoulder),metricPoint(sample,L.rightShoulder))+distance2D(metricPoint(sample,L.leftHip),metricPoint(sample,L.rightHip)))/2
 return torso>0 ? clamp(1-paired/torso) : 0
}
export function readiness(sample:PoseRecognitionSample,side:PoseSide,exit=false):CalibrationIssue|null {
 if(!validPose(sample)) return 'body_not_fully_visible'
 const p=sample.landmarks,s=SIDES[side]
 if([...requiredIndices(side),L.nose].some(i=>p[i].visibility<c.visibility || (p[i].presence??1)<c.visibility) || Math.max(p[s.foot].visibility,p[s.heel].visibility)<c.visibility) return 'body_not_fully_visible'
 const foot=p[s.foot].visibility>=c.visibility ? s.foot : s.heel
 const box=boundingBox([...requiredIndices(side),L.nose,foot].map(i=>p[i]))
 if(box.maxY>1-c.margin || box.minY<c.margin || box.minX<c.margin || box.maxX>1-c.margin) return 'move_farther'
 if(bodyHeightEstimate(sample)<c.minBodyHeight) return 'move_closer'
 if(sideViewScore(sample)<(exit ? c.sideExit : c.sideEnter)) return 'wrong_camera_angle'
 return null
}
export class SideSelector {
 private candidate:PoseSide|null=null
 private since=0
 private selected:PoseSide|null=null
 update(sample:PoseRecognitionSample):PoseSide|null {
  if(this.selected) return this.selected
  if(!validPose(sample) || Math.max(visibilityScore(sample,'left'),visibilityScore(sample,'right'))<c.visibility) {this.candidate=null;return null}
  const side=visibilityScore(sample,'left')>=visibilityScore(sample,'right') ? 'left' : 'right'
  if(side!==this.candidate) {this.candidate=side;this.since=sample.at}
  if(sample.at-this.since>=c.sideStableMs) this.selected=side
  return this.selected
 }
 reset(){this.candidate=null;this.selected=null}
}
