import { expect, it } from 'vitest'
import { SquatAnalyzer } from '../analyzer'
import { buildResult, recommendation } from '../resultBuilder'
import { evaluateRep } from '../rules'
import { sequence, pose } from '../../../../../tests/fixtures/pose/builder'
import type { CalibrationProfile } from '../../../pose/types'
import type { VisionEvent } from '../../../../types/vision'
export const profile:CalibrationProfile={version:'squat-calibration-v1',activeSide:'left',standingKneeAngle:178,standingHipAngle:178,baselineTorsoTilt:0,bodyScale:.8,sideViewScore:.95,createdAt:0}
const reps=(events:VisionEvent[])=>events.filter(e=>e.type==='workout.rep_completed')
function run(kind:string) {const analyzer=new SquatAnalyzer(profile);return {analyzer,events:sequence(kind).flatMap(s=>s.landmarks.length ? analyzer.update(s) : analyzer.cancelPartial(s.at))}}
it('one correct cycle counts once with each state transition',()=>{
 const {events}=run('correct-squat');expect(reps(events)).toHaveLength(1);expect(reps(events)[0].accepted).toBe(true)
 expect(events.filter(e=>e.type==='workout.phase_changed').map(e=>e.phase)).toEqual(['standing','descending','bottom','ascending','standing'])
})
it('two cycles count twice and a set ends at five total including rejected cycles',()=>{
 const a=new SquatAnalyzer(profile);const events:VisionEvent[]=[]
 for(let i=0;i<7;i++)events.push(...sequence(i%2 ? 'shallow-squat' : 'correct-squat').flatMap(s=>a.update({...s,at:s.at+i*5000})))
 expect(reps(events)).toHaveLength(5);const done=events.find(e=>e.type==='workout.completed');expect(done).toMatchObject({result:{totalReps:5,acceptedReps:3,rejectedReps:2}})
})
it.each([['shallow-squat','depth_insufficient'],['fast-squat','too_fast'],['incomplete-extension','incomplete_extension']] as const)('%s generates one specific rep error', (kind,error)=>{
 const {events}=run(kind);expect(reps(events)).toHaveLength(1);expect(reps(events)[0].errors).toContain(error)
 expect(events.filter(e=>e.type==='workout.technique_error' && e.code===error)).toHaveLength(1)
})
it('jitter and partial descent never count; tracking loss cancels partial',()=>{
 expect(reps(run('jitter-standing').events)).toHaveLength(0)
 const a=new SquatAnalyzer(profile);const events:VisionEvent[]=[]
 for(let i=0;i<60;i++) events.push(...a.update(pose(i*60,i>15&&i<40 ? 162 : 178)))
 expect(reps(events)).toHaveLength(0);expect(reps(run('tracking-lost-mid-rep').events)).toHaveLength(0)
})
it('bottom hold and timeout do not invent duplicate reps',()=>{
 const a=new SquatAnalyzer(profile);const s=sequence('correct-squat');const events=s.slice(0,35).flatMap(p=>a.update(p))
 for(let i=0;i<240;i++)events.push(...a.update(pose(2200+i*60,95)))
 for(let i=0;i<20;i++)events.push(...a.update(pose(20000+i*60)))
 expect(reps(events)).toHaveLength(0)
})
it('multiple errors, unique counts, zero result and deterministic recommendation',()=>{
 const metrics={minKneeAngle:140,maxReturnKneeAngle:155,descentDurationMs:200,ascentDurationMs:200,totalDurationMs:400,depthScore:.4,meanVisibility:.9,tempo:'fast' as const}
 expect(evaluateRep(metrics,true)).toEqual(['depth_insufficient','too_fast','incomplete_extension'])
 const result=buildResult([{index:1,accepted:false,errors:['too_fast','too_fast'],metrics}],500)
 expect(result).toMatchObject({totalReps:1,acceptedReps:0,rejectedReps:1,meanRepDurationMs:400,errorCounts:{too_fast:1}})
 expect(recommendation(result)).toContain('замедлить');expect(buildResult([],0).meanRepDurationMs).toBe(0)
})
it('two correct cycles count exactly twice and produce a clean deterministic result',()=>{
 const a=new SquatAnalyzer(profile),events:VisionEvent[]=[]
 for(let i=0;i<2;i++)events.push(...sequence('correct-squat').flatMap(s=>a.update({...s,at:s.at+i*5000})))
 expect(reps(events)).toHaveLength(2);expect(a.result(10000)).toMatchObject({totalReps:2,acceptedReps:2,rejectedReps:0,errorCounts:{depth_insufficient:0,too_fast:0,incomplete_extension:0}})
 expect(recommendation(a.result(10000))).toContain('Все 2 повторений')
})
