import { expect, it } from 'vitest'
import { LANDMARK as L } from '../landmarks'
import { PoseSession } from '../session'
import { PauseGesture } from '../pauseGesture'
import { ErrorPolicy, FeedbackQueue } from '../../feedback/errorPolicy'
import { pose, sequence } from '../../../../tests/fixtures/pose/builder'
import type { VisionEvent } from '../../../types/vision'
import standing from '../../../../tests/fixtures/pose/standing-side.json'
import correct from '../../../../tests/fixtures/pose/correct-squat.json'
import shallow from '../../../../tests/fixtures/pose/shallow-squat.json'
import fast from '../../../../tests/fixtures/pose/fast-squat.json'
import incomplete from '../../../../tests/fixtures/pose/incomplete-extension.json'
import lost from '../../../../tests/fixtures/pose/tracking-lost-mid-rep.json'
it('pause needs standing, both hands, hold, release and cooldown',()=>{
 const gate=new PauseGesture()
 expect(gate.update(pose(0,178,{raised:true}),true)).toBe(false)
 expect(gate.update(pose(799,178,{raised:true}),true)).toBe(false)
 expect(gate.update(pose(800,178,{raised:true}),true)).toBe(true)
 expect(gate.update(pose(2000,178,{raised:true}),true)).toBe(false)
 gate.update(pose(2100),true);gate.update(pose(2400),true)
 expect(gate.update(pose(2500,178,{raised:true}),true)).toBe(false)
 expect(gate.update(pose(3300,178,{raised:true}),true)).toBe(true)
 gate.reset();for(let at=0;at<2000;at+=50)expect(gate.update(pose(at,130,{raised:true}),false)).toBe(false)
})
it('readiness uses 3 of 5, hysteresis and stable recovery; feedback expires',()=>{
 const policy=new ErrorPolicy()
 expect(policy.update('wrong_camera_angle',0).issue).toBeNull()
 expect(policy.update('wrong_camera_angle',50).issue).toBeNull()
 expect(policy.update('wrong_camera_angle',100).issue).toBe('wrong_camera_angle')
 for(let i=0;i<8;i++)expect(policy.update(null,150+i*50).ready).toBe(false)
 expect(policy.update(null,550).ready).toBe(true)
 expect(policy.update('wrong_camera_angle',600).issue).toBeNull()
 const queue=new FeedbackQueue();expect(queue.activate('incomplete_extension',100)).toBe(true);expect(queue.activate('depth_insufficient',100)).toBe(false)
 expect(queue.clear(200)).toBeNull();expect(queue.clear(5000)).toBe('incomplete_extension')
})
it('cancels countdown on lost tracking, wrong angle and early descent',()=>{
 for(const bad of [null,pose(5000,178,{front:true}),pose(5000,130)]){
  const session=new PoseSession();const events=sequence('standing-side').flatMap(s=>session.update(s,s.at));expect(events.some(e=>e.type==='calibration.completed')).toBe(true)
  session.setStage('countdown');expect(session.update(bad,5000).some(e=>e.type==='calibration.required')).toBe(true)
 }
})
it('JSON fixtures run through smoothing, readiness and analyzer; each counts once',()=>{
 for(const [fixture,error] of [[correct,null],[shallow,'depth_insufficient'],[fast,'too_fast'],[incomplete,'incomplete_extension'],[lost,'lost']] as const){
  const session=new PoseSession(),events:VisionEvent[]=[]
  for(const s of standing.frames)events.push(...session.update({at:s.at_ms,landmarks:s.landmarks},s.at_ms))
  session.setStage('workout')
  for(let i=0;i<30;i++)events.push(...session.update(pose(4000+i*50),4000+i*50))
  for(const s of fixture.frames)events.push(...session.update({at:6000+s.at_ms,landmarks:s.landmarks},6000+s.at_ms))
  const reps=events.filter(e=>e.type==='workout.rep_completed')
  expect(reps).toHaveLength(error==='lost' ? 0 : 1)
  if(reps.length)expect(error ? reps[0].errors : []).toEqual(error ? [error] : [])
 }
})
it('countdown cancels on translated standing baseline and an impossible outlier cannot count',()=>{
 const session=new PoseSession();for(const s of sequence('standing-side'))session.update(s,s.at)
 session.setStage('countdown')
 const moved={...pose(5000),landmarks:pose(5000).landmarks.map(l=>({...l,x:l.x+.08}))}
 expect(session.update(moved,5000).some(e=>e.type==='calibration.required')).toBe(true)
 session.setStage('workout');const events:VisionEvent[]=[]
 for(let i=0;i<60;i++){const p=pose(6000+i*50);events.push(...session.update(i===40 ? {...p,landmarks:p.landmarks.map(l=>({...l,x:l.x+.7}))} : p,p.at))}
 expect(events.some(e=>e.type==='workout.rep_completed')).toBe(false)
})
it('one raised hand never confirms pose pause and full tracking loss clears calibration side',()=>{
 const gate=new PauseGesture();for(let at=0;at<2000;at+=50){const p=pose(at,178,{raised:true});const landmarks=p.landmarks.map((l,i)=>i===L.rightWrist ? {...l,y:.4} : l);expect(gate.update({...p,landmarks},true)).toBe(false)}
 const session=new PoseSession();for(const s of sequence('standing-side'))session.update(s,s.at)
 expect(session.activeSide()).toBe('left');session.setStage('workout')
 session.update(null,5000);expect(session.update(null,5600).some(e=>e.type==='calibration.required')).toBe(true)
 session.setStage('calibration');expect(session.activeSide()).toBeNull()
 for(let i=0;i<80;i++)session.update(pose(6000+i*50,178,{right:true}),6000+i*50)
 expect(session.activeSide()).toBe('right')
})
