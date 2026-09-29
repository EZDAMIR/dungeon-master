import type { CalibrationIssue } from '../pose/types'
import type { TechniqueErrorCode } from '../exercises/squat/types'
import { poseConfig as c } from '../pose/config'
export const readinessMessages:Record<CalibrationIssue|'tracking_lost',string>={
 body_not_fully_visible:'Отойди немного назад: плечи, колени и стопы должны быть видны',
 wrong_camera_angle:'Повернись боком к камере',stand_still:'Стой спокойно в исходном положении',
 move_farther:'Отойди немного назад, чтобы стопы полностью попали в кадр',move_closer:'Подойди немного ближе к камере',
 tracking_lost:'Вернись в кадр и займи исходное положение',
}
export class ErrorPolicy {
 private samples:Array<CalibrationIssue|null>=[]
 private recoverySince:number|null=null
 issue:CalibrationIssue|null=null
 ready=false
 update(issue:CalibrationIssue|null,at:number){
  this.samples.push(issue);if(this.samples.length>c.readinessWindow)this.samples.shift()
  if(issue){this.ready=false;this.recoverySince=null
   if(this.samples.filter(v=>v===issue).length>=c.readinessBadSamples)this.issue=issue
  }else{
   this.recoverySince??=at
   if(at-this.recoverySince>=c.recoveryMs && this.samples.filter(v=>v!==null).length<=1){this.issue=null;this.ready=true}
  }
  return {issue:this.issue,ready:this.ready}
 }
 reset(){this.samples=[];this.recoverySince=null;this.issue=null;this.ready=false}
}
export const feedbackPriority:Record<TechniqueErrorCode,number>={incomplete_extension:3,too_fast:2,depth_insufficient:1}
export class FeedbackQueue {
 private code:TechniqueErrorCode|null=null
 private until=0
 activate(code:TechniqueErrorCode,at:number){
  if(this.code && this.until===at+c.feedbackMs && feedbackPriority[this.code]>feedbackPriority[code])return false
  this.code=code;this.until=at+c.feedbackMs;return true
 }
 clear(at:number,readiness=false):TechniqueErrorCode|null {
  if(!this.code || (!readiness && at<this.until))return null
  const code=this.code;this.code=null;return code
 }
}
