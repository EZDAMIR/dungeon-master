import { validateSpec } from '../../vision/exercises/generic/validator'
import type { VisionEvent, GenericRepMetrics, RepMetrics } from '../../types/vision'
export type WorkoutExercise = {exerciseId:string;exerciseKey:string;specRevision:string|null;movementSpec:unknown;sets:number;reps:number;restSeconds:number;assessmentMode:'camera'|'manual';language?:'ru'|'kk'|'en'}
export type RepMeasurement = {repIndex:number;accepted:boolean;errors:readonly string[];metrics:RepMetrics|GenericRepMetrics}
export type SetAggregate = {clientSetId:string;exerciseId:string;exerciseKey:string;specRevision:string|null;setIndex:number;targetReps:number;assessmentMode:'camera'|'manual';status:'completed'|'partial';totalReps:number;acceptedReps:number;rejectedReps:number;durationMs:number;meanRepDurationMs:number|null;errorCounts:Record<string,number>;metrics:readonly RepMeasurement[];targetSnapshot:{targetReps:number;restSeconds:number;planSets:number;durationSeconds:null}}
export type RunnerPhase = 'idle'|'readiness'|'active'|'paused'|'rest'|'next-exercise'|'results'
export type WorkoutSessionSnapshot = {clientSessionId:string;mode:'full'|'quick-demo';phase:RunnerPhase;exerciseIndex:number;setIndex:number;current:(WorkoutExercise & {clientSetId:string})|null;sets:readonly SetAggregate[];restRemainingMs:number;elapsedMs:number;activeMs:number;currentReps:number;status:'in_progress'|'completed'|'stopped'}
export type SessionEvent = {type:'set.started'|'set.completed'|'rest.started'|'exercise.next'|'session.completed'|'session.stopped'|'session.paused'|'readiness.required';at:number;snapshot:WorkoutSessionSnapshot}
function freeze<T>(value:T):T {if(value && typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze)}return value}
export class WorkoutSessionRunner {
 private exercises:readonly WorkoutExercise[]
 private listeners=new Set<()=>void>()
 private events=new Set<(event:SessionEvent)=>void>()
 private snapshot:WorkoutSessionSnapshot
 private started:number|null=null
 private reps:RepMeasurement[]=[]
 private setOpen=false
 private activeMs=0
 private currentActiveMs=0
 private restUntil:number|null=null
 private pausedFrom:RunnerPhase='active'
 private lastAt=-Infinity
 private uuid:()=>string
 constructor(exercises:readonly WorkoutExercise[],options:{mode?:'full'|'quick-demo';uuid?:()=>string;onEvent?:(event:SessionEvent)=>void}={}) {
  if(!exercises.length || exercises.some(e=>!e.exerciseId || !e.exerciseKey || !Number.isInteger(e.sets)||e.sets<1||e.sets>20||!Number.isInteger(e.reps)||e.reps<1||e.reps>100||!Number.isFinite(e.restSeconds)||e.restSeconds<0||e.restSeconds>3600||!['camera','manual'].includes(e.assessmentMode)))throw new Error('Invalid workout plan')
  const mode=options.mode??'full'
  this.exercises=freeze(structuredClone(mode==='quick-demo'?[{...exercises[0],sets:1,reps:5}]:exercises).map(exercise=>({...exercise,assessmentMode:exercise.assessmentMode==='camera' && exercise.exerciseKey!=='bodyweight_squat' && (!validateSpec(exercise.movementSpec).valid || exercise.reps<3 || exercise.reps>20) ? 'manual' as const : exercise.assessmentMode})))
  this.uuid=options.uuid??(()=>crypto.randomUUID())
  this.snapshot={clientSessionId:this.uuid(),mode,phase:'idle',exerciseIndex:0,setIndex:0,current:null,sets:[],restRemainingMs:0,elapsedMs:0,activeMs:0,currentReps:0,status:'in_progress'}
  if(options.onEvent)this.events.add(options.onEvent)
 }
 getSnapshot=()=>this.snapshot
 subscribe=(callback:()=>void)=>{this.listeners.add(callback);return()=>{this.listeners.delete(callback)}}
 subscribeEvents=(callback:(event:SessionEvent)=>void)=>{this.events.add(callback);return()=>{this.events.delete(callback)}}
 private clock(at:number) {if(!Number.isFinite(at)||at<this.lastAt)return false;if(this.lastAt!==-Infinity && this.snapshot.phase==='active'){const delta=at-this.lastAt;this.activeMs+=delta;this.currentActiveMs+=delta}this.lastAt=at;return true}
 private publish(patch:Partial<WorkoutSessionSnapshot>={},type?:SessionEvent['type'],at=this.lastAt){this.snapshot=freeze({...this.snapshot,activeMs:this.activeMs,currentReps:this.reps.length,...patch});this.listeners.forEach(callback=>callback());if(type)this.events.forEach(callback=>callback({type,at,snapshot:this.snapshot}))}
 start(at:number){if(this.snapshot.phase!=='idle'||!this.clock(at))return;this.started=at;this.beginSet(at)}
 private beginSet(at:number){
  this.reps=[];this.currentActiveMs=0;this.setOpen=true;this.restUntil=null
  const current={...this.exercises[this.snapshot.exerciseIndex],clientSetId:this.uuid()}
  this.publish({current,phase:current.assessmentMode==='manual'?'active':'readiness',restRemainingMs:0},'set.started',at)
 }
 consume(event:VisionEvent){
  if(this.snapshot.phase==='results'||!this.clock(event.at))return
  if(event.type==='calibration.required'){this.recalibrate(event.at);return}
  if(event.type==='workout.paused'){this.pause(event.at);return}
  if(event.type==='workout.resumed'){this.resume(event.at);return}
  if(event.type==='workout.countdown_done'&&this.snapshot.phase==='readiness'){this.publish({phase:'active'});return}
  if(this.snapshot.phase!=='active'||this.snapshot.current?.assessmentMode!=='camera')return
  if(event.type!=='workout.rep_completed'&&event.type!=='workout.generic_rep_completed')return
  if(event.repIndex<=this.reps.length||event.repIndex!==this.reps.length+1)return
  this.reps.push(structuredClone({repIndex:event.repIndex,accepted:event.accepted,errors:event.errors,metrics:event.metrics}))
  if(this.reps.length>=this.snapshot.current.reps)this.finishSet(event.at,'completed')
  else this.publish()
 }
 private aggregate(_at:number,status:SetAggregate['status']):SetAggregate {
  const e=this.snapshot.current!,camera=e.assessmentMode==='camera',metrics=camera?this.reps:[]
  const errorCounts:Record<string,number>={}
  metrics.forEach(rep=>new Set(rep.errors).forEach(code=>{errorCounts[code]=(errorCounts[code]??0)+1}))
  const accepted=metrics.filter(rep=>rep.accepted).length
  return freeze({clientSetId:e.clientSetId,exerciseId:e.exerciseId,exerciseKey:e.exerciseKey,specRevision:e.specRevision,setIndex:this.snapshot.sets.length+1,targetReps:e.reps,assessmentMode:e.assessmentMode,status,totalReps:camera?metrics.length:status==='completed'?e.reps:0,acceptedReps:accepted,rejectedReps:camera?metrics.length-accepted:0,durationMs:this.currentActiveMs,meanRepDurationMs:metrics.length?metrics.reduce((sum,rep)=>sum+rep.metrics.totalDurationMs,0)/metrics.length:null,errorCounts,metrics:[...metrics],targetSnapshot:{targetReps:e.reps,restSeconds:e.restSeconds,planSets:e.sets,durationSeconds:null}})
 }
 private finishSet(at:number,status:SetAggregate['status']) {
  const set=this.aggregate(at,status);this.setOpen=false
  this.publish({sets:[...this.snapshot.sets,set]},'set.completed',at)
  const e=this.snapshot.current!
  if(this.snapshot.setIndex+1<e.sets){this.restUntil=at+e.restSeconds*1000;this.publish({phase:'rest',restRemainingMs:e.restSeconds*1000},'rest.started',at);if(e.restSeconds===0)this.next(at)}
  else if(this.snapshot.exerciseIndex+1<this.exercises.length)this.publish({phase:'next-exercise',restRemainingMs:0},'exercise.next',at)
  else this.publish({phase:'results',status:'completed',elapsedMs:Math.max(0,at-this.started!)},'session.completed',at)
 }
 completeManual(at:number){if(!this.clock(at)||this.snapshot.phase!=='active'||this.snapshot.current?.assessmentMode!=='manual')return;this.finishSet(at,'completed')}
 tick(at:number){if(!this.clock(at)||this.started===null||this.snapshot.phase==='results')return
  const restRemainingMs=this.snapshot.phase==='rest'?Math.max(0,(this.restUntil??at)-at):this.snapshot.restRemainingMs
  this.publish({elapsedMs:Math.max(0,at-this.started),restRemainingMs})
  if(this.snapshot.phase==='rest'&&restRemainingMs===0)this.next(at)
 }
 next(at:number){if(!this.clock(at))return
  if(this.snapshot.phase==='rest'){this.publish({setIndex:this.snapshot.setIndex+1});this.beginSet(at)}
  else if(this.snapshot.phase==='next-exercise'){this.publish({exerciseIndex:this.snapshot.exerciseIndex+1,setIndex:0});this.beginSet(at)}
 }
 pause(at:number){if(!this.clock(at)||!['active','readiness','rest'].includes(this.snapshot.phase))return
  this.pausedFrom=this.snapshot.phase
  const restRemainingMs=this.snapshot.phase==='rest'?Math.max(0,(this.restUntil??at)-at):0
  this.publish({phase:'paused',restRemainingMs},'session.paused',at)
 }
 resume(at:number){if(!this.clock(at)||this.snapshot.phase!=='paused')return
  if(this.pausedFrom==='rest'){this.restUntil=at+this.snapshot.restRemainingMs;this.publish({phase:'rest'});return}
  this.publish({phase:this.snapshot.current?.assessmentMode==='manual'?'active':'readiness'},'readiness.required',at)
 }
 recalibrate(at:number){if(!this.clock(at)||!['active','readiness'].includes(this.snapshot.phase))return;this.publish({phase:'readiness'},'readiness.required',at)}
 stop(at:number){if(!this.clock(at)||this.snapshot.phase==='results'||this.snapshot.phase==='idle')return
  const partial=this.setOpen&&this.reps.length&&['active','paused','readiness'].includes(this.snapshot.phase)?[this.aggregate(at,'partial')]:[]
  this.publish({sets:[...this.snapshot.sets,...partial],phase:'results',status:'stopped',elapsedMs:Math.max(0,at-this.started!)},'session.stopped',at)
 }
}
