import { distance2D } from '../core/geometry'
import { poseConfig as c } from './config'
import { SIDES } from './landmarks'
import { validPose } from './readiness'
import type { PoseRecognitionSample } from './types'
export class PoseSmoother {
 private previous:PoseRecognitionSample|null=null
 update(sample:PoseRecognitionSample):PoseRecognitionSample|null {
  if(!validPose(sample)) return null
  const ids=Object.values(SIDES).flatMap(s=>[s.shoulder,s.hip,s.knee,s.ankle])
  if(ids.every(i=>sample.landmarks[i].visibility<c.visibility)) return null
  const previous=this.previous
  if(previous && ids.some(i=>sample.landmarks[i].visibility>=c.visibility && previous.landmarks[i].visibility>=c.visibility && distance2D(sample.landmarks[i],previous.landmarks[i])>c.maxJump)) return null
  const landmarks=sample.landmarks.map((p,i)=>{
   const old=previous?.landmarks[i]
   if(!old || old.visibility<c.visibility || p.visibility<c.visibility) return {...p}
   return {...p,x:old.x+c.smoothingAlpha*(p.x-old.x),y:old.y+c.smoothingAlpha*(p.y-old.y),z:old.z+c.smoothingAlpha*(p.z-old.z)}
  })
  this.previous={...sample,landmarks}
  return this.previous
 }
 reset(){this.previous=null}
}
