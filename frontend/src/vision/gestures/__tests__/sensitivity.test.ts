import { expect, it } from 'vitest'
import { CursorMapper } from '../cursorMapper'
import { GestureEngine } from '../gestureEngine'
import { PinchDetector } from '../pinchDetector'
import type { HandRecognitionSample } from '../types'
function sample(at:number,ratio=.6,name='Open_Palm'):HandRecognitionSample {
 const landmarks=Array.from({length:21},()=>({x:.5,y:.5,z:0}));landmarks[5]={x:.4,y:.5,z:0};landmarks[17]={x:.6,y:.5,z:0};landmarks[4]={x:.5+ratio*.2,y:.5,z:0};return {at,landmarks,gesture:{name,confidence:.9},handedness:'Right'}
}
const viewport={width:1000,height:800}
it('gain .5/1/1.5/2 changes identical movement distance without changing smoothing',()=>{
 const distances=[.5,1,1.5,2].map(gain=>{const c=new CursorMapper();c.configure({sensitivity:gain,smoothingMs:0});const start=c.map({x:.5,y:.5},viewport,0);const end=c.map({x:.43,y:.57},viewport,50);return end.x-start.x})
 distances.forEach((distance,index)=>expect(distance).toBeCloseTo([50,100,150,200][index]))
})
it('minimum gain can reach every corner by clutching, and resizing preserves normalized location',()=>{
 for(const [x,y] of [[0,0],[1,0],[0,1],[1,1]]){
  const c=new CursorMapper();c.configure({sensitivity:.5,smoothingMs:0});c.map({x:.5,y:.5},viewport,0)
  for(let i=0;i<3;i++){c.reset();c.map({x:.5,y:.5},viewport,i*100);c.map({x:x===0?.99:.01,y:y===0?.01:.99},viewport,i*100+50)}
  c.reset();expect(c.map({x:.5,y:.5},{width:500,height:400},1000)).toEqual({x:x*500,y:y*400})
 }
})
it('reconfiguration, tracking gap and reacquire never integrate gap displacement',()=>{
 const c=new CursorMapper();c.map({x:.5,y:.5},viewport,0);const p=c.map({x:.4,y:.4},viewport,50)
 c.configure({sensitivity:2,smoothingMs:80});expect(c.map({x:.1,y:.9},viewport,100)).toEqual(p)
 expect(c.map({x:.9,y:.1},viewport,2000)).toEqual(p)
 c.reset();expect(c.map({x:.5,y:.5},viewport,2050)).toEqual(p)
})
it('stationary noise stays bounded over many samples without persistent drift',()=>{
 const c=new CursorMapper();c.configure({sensitivity:2,smoothingMs:80});c.map({x:.5,y:.5},viewport,0)
 for(let i=1;i<2000;i++){const p=c.map({x:.5+(i%2?.001:-.001),y:.5},viewport,i*25);expect(Math.abs(p.x-500)).toBeLessThan(3);expect(p.y).toBe(400)}
})
it('same elapsed smoothing path is consistent at 20/40fps and zero smoothing stays finite',()=>{
 const trace=(dt:number)=>{const c=new CursorMapper();c.map({x:.5,y:.5},viewport,0);let p={x:0,y:0};for(let at=dt;at<=400;at+=dt)p=c.map({x:.43,y:.5},viewport,at);return p}
 expect(trace(50).x).toBeCloseTo(trace(25).x)
 const c=new CursorMapper();c.configure({sensitivity:1,smoothingMs:0});expect(Number.isFinite(c.map({x:.5,y:.5},viewport,0).x)).toBe(true)
})
it('settings and scope changes suppress held pinch until actual neutral release',()=>{
 const e=new GestureEngine();[0,50,100].forEach(at=>e.update(sample(at,.2),at,viewport));e.configureInput({sensitivity:1.5,smoothingMs:80})
 const held=[150,200,500,1000].flatMap(at=>e.update(sample(at,.2),at,viewport));expect(held.filter(event=>event.type==='gesture.confirmed')).toEqual([])
 for(const at of [1050,1300])e.update(sample(at,.6),at,viewport)
 expect([1350,1400,1450].flatMap(at=>e.update(sample(at,.2),at,viewport)).filter(event=>event.type==='gesture.confirmed')).toHaveLength(1)
})
it('fist/thumb grip changes clutch the cursor and handedness changes require release',()=>{
 const e=new GestureEngine();e.update(sample(0),0,viewport)
 const s=sample(50,.2,'Closed_Fist');s.landmarks=s.landmarks.map((point,index)=>index===8?{x:0,y:0,z:0}:point)
 expect(e.update(s,50,viewport).some(event=>event.type==='cursor.moved')).toBe(false)
 const changed={...sample(100,.2),handedness:'Left' as const}
 expect([100,150,200].flatMap(at=>e.update(changed,at,viewport)).some(event=>event.type==='gesture.confirmed')).toBe(false)
})
it('pinch geometry is invariant under camera aspect ratio scaling',()=>{
 const detect=(aspect:number)=>{const s=sample(0,.2);const landmarks=s.landmarks.map(p=>({...p,x:(p.x-.5)/aspect+.5}));const detector=new PinchDetector();return [0,1,2].map(()=>detector.update(landmarks,aspect).confirmed)}
 expect(detect(16/9)).toEqual(detect(3/4));expect(detect(3/4)).toEqual([false,false,true])
})
