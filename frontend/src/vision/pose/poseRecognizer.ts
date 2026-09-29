import { FilesetResolver, PoseLandmarker, type PoseLandmarkerOptions } from '@mediapipe/tasks-vision'
import { visionAssets } from '../core/config'
import { poseAssets, poseConfig as c } from './config'
import { clamp } from '../core/geometry'
import type { PoseLandmarkerAdapter, PoseRecognitionSample } from './types'
export class MediaPipePoseLandmarker implements PoseLandmarkerAdapter {
 private recognizer:PoseLandmarker|null=null
 private pending:Promise<void>|null=null
 private disposed=false
 initialize():Promise<void>{
  if(this.disposed)return Promise.reject(new Error('Pose recognizer disposed'))
  if(this.recognizer)return Promise.resolve()
  this.pending??=this.load();return this.pending
 }
 private async load(){
  const files=await FilesetResolver.forVisionTasks(visionAssets.wasm)
  if(this.disposed)return
  const options:PoseLandmarkerOptions={runningMode:'VIDEO',numPoses:1,outputSegmentationMasks:false,minPoseDetectionConfidence:c.detectionConfidence,minPosePresenceConfidence:c.presenceConfidence,minTrackingConfidence:c.trackingConfidence,baseOptions:{modelAssetPath:poseAssets.model,delegate:'GPU'}}
  let recognizer:PoseLandmarker
  try{recognizer=await PoseLandmarker.createFromOptions(files,options)}
  catch(error){if(this.disposed)throw error;recognizer=await PoseLandmarker.createFromOptions(files,{...options,baseOptions:{modelAssetPath:poseAssets.model,delegate:'CPU'}})}
  if(this.disposed)recognizer.close();else this.recognizer=recognizer
 }
 recognize(video:HTMLVideoElement,at:number):PoseRecognitionSample|null{
  if(this.disposed || !this.recognizer)return null
  const result=this.recognizer.detectForVideo(video,at)
  try {
   const landmarks=result.landmarks[0]
   if(!landmarks || landmarks.length!==33)return null
   return {at,aspectRatio:video.videoWidth && video.videoHeight ? video.videoWidth/video.videoHeight : 1,landmarks:landmarks.map(p=>({x:p.x,y:p.y,z:p.z,visibility:clamp(p.visibility)}))}
  } finally {result.close()}
 }
 close(){this.disposed=true;this.recognizer?.close();this.recognizer=null}
}
