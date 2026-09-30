import type { VisionEvent } from '../../types/vision'
import type { RealVisionSource } from '../workout/RealVisionSource'
import { WorkoutSessionRunner, type SessionEvent } from './runner'
export class WorkoutSessionController {
 private remove:()=>void
 readonly runner:WorkoutSessionRunner
 private source:()=>RealVisionSource|null
 constructor(runner:WorkoutSessionRunner,source:()=>RealVisionSource|null){this.runner=runner;this.source=source;this.remove=runner.subscribeEvents(this.event)}
 private event=(event:SessionEvent)=>{
  const source=this.source(),current=event.snapshot.current
  if(event.type==='set.started'&&current){source?.cancelPartial(event.at);source?.configureMovement(current.exerciseKey,current.movementSpec,current.reps,current.language??'ru');source?.setMode(current.assessmentMode==='camera'?'CALIBRATION':'MENU')}
  if(event.type==='readiness.required'){source?.cancelPartial(event.at);source?.setMode(current?.assessmentMode==='camera'?'CALIBRATION':'MENU')}
  if(['session.paused','rest.started','exercise.next','set.completed'].includes(event.type)){source?.cancelPartial(event.at);source?.setMode('PAUSED')}
  if(['session.completed','session.stopped'].includes(event.type)){source?.cancelPartial(event.at);source?.requireNeutralRelease();source?.setMode('RESULTS')}
 }
 consume=(event:VisionEvent)=>{this.runner.consume(event);if(event.type==='calibration.completed'&&this.runner.getSnapshot().phase==='readiness')this.source()?.setMode('COUNTDOWN');if(event.type==='workout.countdown_done'&&this.runner.getSnapshot().phase==='active')this.source()?.setMode('WORKOUT')}
 tick=(at:number)=>this.runner.tick(at)
 setVisible(visible:boolean,at:number){if(!visible)this.runner.pause(at)}
 dispose(){this.remove()}
}
