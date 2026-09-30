import {expect,it,vi} from 'vitest'
import {WorkoutSessionRunner,type WorkoutExercise} from './runner'
import {WorkoutSessionController} from './controller'
import type {RealVisionSource} from '../workout/RealVisionSource'
import type {VisionEvent} from '../../types/vision'
const exercise:WorkoutExercise={exerciseId:'squat',exerciseKey:'bodyweight_squat',specRevision:null,movementSpec:null,sets:2,reps:2,restSeconds:10,assessmentMode:'camera'}
const rep=(at:number,index:number,accepted=true):VisionEvent=>({type:'workout.generic_rep_completed',at,repIndex:index,accepted,errors:accepted?[]:['range_too_small'],metrics:{totalDurationMs:1800,minKneeAngle:null,maxReturnKneeAngle:null,descentDurationMs:null,ascentDurationMs:null,depthScore:null,meanVisibility:.8,tempo:'ok'}})
function runner(exercises:WorkoutExercise[]=[exercise]){let i=0;return new WorkoutSessionRunner(exercises,{uuid:()=>`uuid-${++i}`})}
function ready(r:WorkoutSessionRunner,at:number){r.consume({type:'workout.countdown_done',at})}
it('full plan executes actual reps/sets/rest and next exercise, retaining global indices and stable IDs',()=>{
 const r=runner([exercise,{...exercise,exerciseId:'second',sets:1}]);r.start(0);expect(r.getSnapshot().phase).toBe('readiness');ready(r,100)
 r.consume(rep(200,1));r.consume(rep(300,2,false));expect(r.getSnapshot().phase).toBe('rest');expect(r.getSnapshot().sets[0]).toMatchObject({clientSetId:'uuid-2',setIndex:1,totalReps:2,acceptedReps:1,rejectedReps:1,errorCounts:{range_too_small:1},meanRepDurationMs:1800})
 r.tick(10299);expect(r.getSnapshot().phase).toBe('rest');r.tick(10300);expect(r.getSnapshot().phase).toBe('readiness');ready(r,10400);r.consume(rep(10500,1));r.consume(rep(10600,2));expect(r.getSnapshot().phase).toBe('next-exercise')
 r.next(10700);ready(r,10800);r.consume(rep(10900,1));r.consume(rep(11000,2));expect(r.getSnapshot()).toMatchObject({phase:'results',status:'completed',mode:'full'});expect(r.getSnapshot().sets.map(set=>set.setIndex)).toEqual([1,2,3]);expect(new Set(r.getSnapshot().sets.map(set=>set.clientSetId)).size).toBe(3)
})
it('rest uses monotonic clock, hidden tab freezes it and resume requires explicit action',()=>{
 const r=runner();r.start(0);ready(r,1);r.consume(rep(2,1));r.consume(rep(3,2));r.tick(1003);r.pause(2003);expect(r.getSnapshot().restRemainingMs).toBe(8000);r.tick(100000);expect(r.getSnapshot().phase).toBe('paused');r.resume(100001);r.tick(108000);expect(r.getSnapshot().phase).toBe('rest');r.tick(108001);expect(r.getSnapshot().phase).toBe('readiness')
})
it('pause/recalibration ignore camera reps until readiness and discard duplicates/backward samples',()=>{
 const r=runner();r.start(0);ready(r,1);r.consume(rep(2,1));r.pause(3);r.consume(rep(4,2));r.resume(5);expect(r.getSnapshot().phase).toBe('readiness');r.consume(rep(6,2));ready(r,7);r.consume(rep(8,1));r.consume(rep(0,2));expect(r.getSnapshot().sets).toHaveLength(0);r.consume(rep(9,2));expect(r.getSnapshot().sets[0].totalReps).toBe(2)
})
it('manual completion has zero camera accepted/rejected/errors and no fabricated metrics',()=>{
 const r=runner([{...exercise,assessmentMode:'manual',sets:1}]);r.start(0);r.consume(rep(1,1));r.completeManual(1000);const set=r.getSnapshot().sets[0];expect(set).toMatchObject({assessmentMode:'manual',totalReps:2,acceptedReps:0,rejectedReps:0,errorCounts:{},metrics:[],meanRepDurationMs:null});expect(r.getSnapshot().status).toBe('completed')
})
it('early stop retains completed sets and measured partial set once',()=>{
 const r=runner();r.start(0);ready(r,1);r.consume(rep(2,1));r.consume(rep(3,2));r.next(4);ready(r,5);r.consume(rep(6,1));r.stop(7);r.stop(8);expect(r.getSnapshot().sets.map(set=>set.status)).toEqual(['completed','partial']);expect(r.getSnapshot().status).toBe('stopped')
})
it('quick demo visibly truncates to one set and freezes original plan/spec against edits',()=>{
 const original={...exercise,movementSpec:{camera:{angle:'side'}}};let i=0;const r=new WorkoutSessionRunner([original],{mode:'quick-demo',uuid:()=>String(++i)});original.reps=99;(original.movementSpec.camera.angle)='front';r.start(0);expect(r.getSnapshot().current).toMatchObject({sets:1,reps:5,movementSpec:{camera:{angle:'side'}}});ready(r,1);for(let i=1;i<=5;i++)r.consume(rep(i+1,i));expect(r.getSnapshot()).toMatchObject({phase:'results',mode:'quick-demo'})
})
it('invalid generated declarations fall back to manual and never execute legacy squat rules',()=>{
 const r=runner([{...exercise,exerciseKey:'generated',movementSpec:{script:'alert(1)'},sets:1}]);r.start(0);expect(r.getSnapshot().current?.assessmentMode).toBe('manual');r.consume(rep(1,1));expect(r.getSnapshot().sets).toEqual([]);r.completeManual(2);expect(r.getSnapshot().sets[0].acceptedReps).toBe(0)
})
it('controller cancels partials, switches readiness/countdown/workout and never owns another camera',()=>{
 const r=runner(),source={cancelPartial:vi.fn(),configureMovement:vi.fn(),setMode:vi.fn(),requireNeutralRelease:vi.fn()} as unknown as RealVisionSource;const c=new WorkoutSessionController(r,()=>source);r.start(0);expect(source.configureMovement).toHaveBeenCalledWith('bodyweight_squat',null,2,'ru');expect(source.setMode).toHaveBeenLastCalledWith('CALIBRATION');c.consume({type:'calibration.completed',at:1,profile:{version:'squat-calibration-v1',activeSide:'left',bodyScale:1,standingKneeAngle:180,standingHipAngle:180,baselineTorsoTilt:0,sideViewScore:1,createdAt:1}});expect(source.setMode).toHaveBeenLastCalledWith('COUNTDOWN');c.consume({type:'workout.countdown_done',at:2});expect(source.setMode).toHaveBeenLastCalledWith('WORKOUT');c.setVisible(false,3);expect(source.cancelPartial).toHaveBeenCalledWith(3);r.resume(4);expect(source.setMode).toHaveBeenLastCalledWith('CALIBRATION');c.dispose()
})
it('rejects malformed plans without changing external data',()=>{expect(()=>runner([{...exercise,sets:0}])).toThrow('Invalid workout plan');expect(()=>runner([])).toThrow('Invalid workout plan')})

it('stop during paused rest does not duplicate the completed set and active time excludes rest/pause/readiness',()=>{
 const r=runner();r.start(0);ready(r,100);r.consume(rep(200,1));r.pause(300);r.tick(10000);r.resume(10001);ready(r,10100);r.consume(rep(10200,2));expect(r.getSnapshot().sets[0].durationMs).toBe(300);r.pause(11000);r.stop(12000);expect(r.getSnapshot().sets).toHaveLength(1);expect(r.getSnapshot().activeMs).toBe(300)
})

it('rest switches the same camera to hands navigation and rechecks body before next set',()=>{
 const r=runner(),source={cancelPartial:vi.fn(),configureMovement:vi.fn(),setMode:vi.fn(),requireNeutralRelease:vi.fn()} as unknown as RealVisionSource;const controller=new WorkoutSessionController(r,()=>source);r.start(0);ready(r,1);controller.consume(rep(2,1));controller.consume(rep(3,2));expect(source.setMode).toHaveBeenLastCalledWith('MENU');expect(source.requireNeutralRelease).toHaveBeenCalled();r.next(4);expect(source.setMode).toHaveBeenLastCalledWith('CALIBRATION');controller.dispose()
})
