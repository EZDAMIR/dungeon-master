import { GestureAudio } from './gestureAudio'
import { poseConfig } from '../vision/pose/config'
import type { VisionEvent } from '../types/vision'
export class WorkoutAudio extends GestureAudio {
 private last=-Infinity
 private enabled=false
 private muted=false
 setMuted(muted:boolean){this.muted=muted;if(muted){try{window.speechSynthesis?.cancel()}catch{/* Visual feedback remains complete. */}}}
 override async enable(){this.enabled=true;await super.enable()}
 override event(event:VisionEvent){
  if(this.muted)return
  super.event(event)
  let phrase:string|null=null,critical=false
  if(event.type==='workout.countdown') {if(event.count>0){this.tone(440);return}phrase='Начали';critical=true}
  if(event.type==='workout.rep_completed' && event.accepted)phrase='Хорошее повторение'
  if(event.type==='workout.technique_error')phrase=({depth_insufficient:'Опустись немного ниже',too_fast:'Медленнее вниз',incomplete_extension:'Заверши подъём'})[event.code]
  if(event.type==='pose.tracking_lost'){phrase='Вернись в кадр';critical=true}
  if(event.type==='calibration.updated' && event.issue && event.issue!=='stand_still')phrase=event.issue==='wrong_camera_angle' ? 'Повернись боком к камере' : 'Плечи, колени и стопы должны быть видны'
  if(event.type==='workout.completed'){phrase='Тренировка завершена';critical=true}
  if(!phrase || !this.enabled || (!critical && event.at-this.last<poseConfig.audioCooldownMs))return
  if(critical && event.type!=='workout.completed' && event.at-this.last<500)return
  this.last=event.at
  try{
   const synth=window.speechSynthesis,voice=synth?.getVoices().find(v=>v.lang.toLowerCase().startsWith('ru'))
   if(!synth || !voice){this.tone(680);return}
   if(critical)synth.cancel()
   if(synth.pending && !critical)return
   const utterance=new SpeechSynthesisUtterance(phrase);utterance.lang='ru-RU';utterance.voice=voice;utterance.onerror=()=>this.tone(680);synth.speak(utterance)
  }catch{this.tone(680)}
 }
 override close(){this.enabled=false;try{window.speechSynthesis?.cancel()}catch{/* Visual feedback remains complete. */}super.close()}
}
