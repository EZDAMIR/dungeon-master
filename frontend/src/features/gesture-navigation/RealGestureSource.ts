import { RealVisionSource } from '../workout/RealVisionSource'
import { MediaPipeGestureRecognizer } from '../../vision/gestures/gestureRecognizer'
import { MediaPipePoseLandmarker } from '../../vision/pose/poseRecognizer'
import type { GestureRecognizerAdapter, HandRecognitionSample } from '../../vision/gestures/types'
import type { VisionEvent } from '../../types/vision'
// Retain the Sprint 1 entry point; camera ownership now belongs to the shared runtime.
export class RealGestureSource extends RealVisionSource {
 constructor(video:HTMLVideoElement,emit:(event:VisionEvent)=>void,raw:(sample:HandRecognitionSample|null,fps:number,inferenceMs:number)=>void,adapter:GestureRecognizerAdapter=new MediaPipeGestureRecognizer()){
  super(video,emit,raw,{gesture:()=>adapter,pose:()=>new MediaPipePoseLandmarker()})
 }
}
