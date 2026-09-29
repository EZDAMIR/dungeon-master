import { expect, it } from 'vitest'
import { angleDegrees, distance2D, midpoint, median, angleFromVertical, clamp } from '../../core/geometry'
import { PoseCalibration } from '../calibration'
import { PoseSmoother } from '../smoothing'
import { readiness, SideSelector, sideViewScore } from '../readiness'
import { LANDMARK as L } from '../landmarks'
import { pose, sequence } from '../../../../tests/fixtures/pose/builder'
it('geometry is finite and handles degenerate vectors',()=>{
 expect(distance2D({x:0,y:0},{x:3,y:4})).toBe(5)
 expect(midpoint({x:0,y:2},{x:2,y:4})).toEqual({x:1,y:3})
 expect(angleDegrees({x:0,y:0},{x:0,y:1},{x:1,y:1})).toBe(90)
 expect(angleDegrees({x:0,y:0},{x:0,y:0},{x:1,y:1})).toBe(0)
 expect(angleFromVertical({x:0,y:-1},{x:0,y:0})).toBe(0)
 expect(clamp(NaN)).toBe(0);expect(median([3,1,2,4])).toBe(2.5);expect(median([])).toBe(0)
})
it('checks body bounds and scale-normalized side orientation',()=>{
 expect(readiness(pose(0),'left')).toBeNull()
 expect(readiness(pose(0,178,{cropped:true}),'left')).toBe('move_farther')
 expect(readiness(pose(0,178,{front:true}),'left')).toBe('wrong_camera_angle')
 const p=pose(0);const scaled={...p,landmarks:p.landmarks.map(l=>({...l,x:.5+(l.x-.5)*.7,y:.5+(l.y-.5)*.7}))}
 expect(sideViewScore(p)).toBeCloseTo(sideViewScore(scaled))
 expect(readiness({...p,landmarks:p.landmarks.map(l=>({...l,visibility:.2}))},'left')).toBe('body_not_fully_visible')
})
it('selects a stable side and never flips from one noisy sample',()=>{
 const selector=new SideSelector()
 expect(selector.update(pose(0))).toBeNull();expect(selector.update(pose(500))).toBe('left')
 expect(selector.update(pose(550,178,{right:true}))).toBe('left')
 selector.reset();selector.update(pose(600,178,{right:true}));expect(selector.update(pose(1100,178,{right:true}))).toBe('right')
})
it('calibration needs sequential stable gates and rejects cropped, front and moving poses',()=>{
 const c=new PoseCalibration();expect(c.update(pose(0)).profile).toBeNull()
 for(const name of ['body-cropped','wrong-angle','jitter-standing']) { c.reset();const results=sequence(name).map(s=>c.update(s));if(name!=='jitter-standing')expect(results.every(r=>r.profile===null)).toBe(true);expect(results.every(r=>r.progress>=0&&r.progress<=1)).toBe(true) }
 c.reset();const profiles=sequence('standing-side').map(s=>c.update(s).profile).filter(Boolean)
 expect(profiles.length).toBeGreaterThan(0);expect(Object.values(profiles[0]!).filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true)
 c.reset();for(let i=0;i<80;i++) expect(c.update(pose(i*50,i%2 ? 145 : 178)).profile).toBeNull()
})
it('EMA reduces jitter, rejects impossible jumps and gates visibility without smoothing it',()=>{
 const s=new PoseSmoother();const input=sequence('jitter-standing');const output=input.map(p=>s.update(p)!)
 const span=(a:number[])=>Math.max(...a)-Math.min(...a)
 expect(span(output.map(p=>p.landmarks[L.leftShoulder].x))).toBeLessThan(span(input.map(p=>p.landmarks[L.leftShoulder].x)))
 expect(s.update({...pose(4000),landmarks:pose(4000).landmarks.map(l=>({...l,x:l.x+.7}))})).toBeNull()
 s.reset();expect(s.update(pose(5000))?.landmarks[L.leftShoulder].x).toBe(pose(5000).landmarks[L.leftShoulder].x)
 expect(s.update({...pose(5050),landmarks:pose(5050).landmarks.map(l=>({...l,visibility:.1}))})).toBeNull()
})
it('uses orientation enter/exit hysteresis and resets calibration after a sample gap',()=>{
 const p=pose(0),left=new Set<number>([L.leftShoulder,L.leftHip]),right=new Set<number>([L.rightShoulder,L.rightHip])
 const borderline={...p,landmarks:p.landmarks.map((l,i)=>({...l,x:left.has(i) ? l.x-.03 : right.has(i) ? l.x+.03 : l.x}))}
 expect(readiness(borderline,'left')).toBe('wrong_camera_angle');expect(readiness(borderline,'left',true)).toBeNull()
 const c=new PoseCalibration();for(let i=0;i<30;i++)c.update(pose(i*50))
 expect(c.update(pose(10000)).progress).toBe(0)
})
