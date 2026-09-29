import { ReplayClock } from '../../vision/core/clock'
import { PoseSession } from '../../vision/pose/session'
import { sequence, pose } from '../../../tests/fixtures/pose/builder'
import type { VisionEvent } from '../../types/vision'
import type { PoseRecognitionSample, PoseStage } from '../../vision/pose/types'
import type { PosePresentation } from './RealVisionSource'
export class FakePoseSource {
 private session=new PoseSession()
 private last=0
 private clock:ReplayClock
 private emit:(event:VisionEvent)=>void
 private raw:(presentation:PosePresentation)=>void
 constructor(emit:(event:VisionEvent)=>void,raw:(presentation:PosePresentation)=>void,clock=new ReplayClock()){this.emit=emit;this.raw=raw;this.clock=clock}
 setStage(stage:PoseStage){this.session.setStage(stage)}
 reset(){this.session.reset();this.raw({sample:null,activeSide:null,fps:0,inferenceMs:0})}
 play(kind:string,now:number){
  // Synthetic landmarks, no recordings. One monotonic clock for all fake pose events.
  const samples=sequence(kind),base=Math.max(this.clock.read(now),this.last+50)
  for(const s of samples)this.frame({...s,at:base+s.at})
 }
 standing(now:number){
  const base=Math.max(this.clock.read(now),this.last+50)
  for(let i=0;i<30;i++)this.frame(pose(base+i*50))
 }
 lost(now:number){const base=Math.max(this.clock.read(now),this.last+50);for(let i=0;i<12;i++)this.frame(null,base+i*50)}
 private frame(sample:PoseRecognitionSample|null,at=sample?.at??this.last+50){
  at=this.clock.read(at);this.last=at
  const events=this.session.update(sample,at)
  this.raw({sample:this.session.latest,activeSide:this.session.activeSide(),fps:20,inferenceMs:0})
  for(const event of events)this.emit(event)
 }
}
