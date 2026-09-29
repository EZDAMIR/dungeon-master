import type { PoseRecognitionSample } from '../../../src/vision/pose/types'
import { LANDMARK as L } from '../../../src/vision/pose/landmarks'
export function pose(at: number, angle = 178, options: { front?: boolean; cropped?: boolean; raised?: boolean; right?: boolean; jitter?: number } = {}): PoseRecognitionSample {
  const points = Array.from({length:33},()=>({x:.5,y:.4,z:0,visibility:.99}))
  const radians = (180-angle)*Math.PI/180
  const ankle = {x:.52,y:.89}, knee = {x:.52,y:.65}
  const hip = {x:knee.x-Math.sin(radians)*.24,y:knee.y-Math.cos(radians)*.24}
  const shoulder = {x:hip.x,y:hip.y-.23}
  for (const side of ['left','right'] as const) {
    const indices = side==='left' ? [L.leftShoulder,L.leftHip,L.leftKnee,L.leftAnkle,L.leftHeel,L.leftFootIndex,L.leftWrist] : [L.rightShoulder,L.rightHip,L.rightKnee,L.rightAnkle,L.rightHeel,L.rightFootIndex,L.rightWrist]
    const offset = options.front ? (side==='left' ? -.10 : .10) : (side==='left' ? -.006 : .006)
    const visibility = (options.right ? side==='left' : side==='right') ? .86 : .99
    const locations = [shoulder,hip,knee,ankle,{x:ankle.x-.03,y:.91},{x:ankle.x+.06,y:.91},{x:shoulder.x+.03,y:options.raised ? .05 : shoulder.y+.13}]
    indices.forEach((index,i)=>{points[index]={...locations[i],x:locations[i].x+offset+(options.jitter??0),z:0,visibility}})
  }
  points[L.nose]={x:shoulder.x,y:shoulder.y-.10,z:0,visibility:.99}
  if (options.cropped) for (const i of [L.leftAnkle,L.rightAnkle,L.leftHeel,L.rightHeel,L.leftFootIndex,L.rightFootIndex]) points[i].y=1.05
  return {at,landmarks:points,aspectRatio:1}
}
export function sequence(kind: string): PoseRecognitionSample[] {
  if (['standing-side','wrong-angle','body-cropped','pause-gesture','jitter-standing'].includes(kind)) return Array.from({length:81},(_,i)=>pose(i*50,178,{front:kind==='wrong-angle',cropped:kind==='body-cropped',raised:kind==='pause-gesture',jitter:kind==='jitter-standing' ? Math.sin(i)*.003 : 0}))
  const min = kind==='shallow-squat' ? 135 : 95
  const speed = kind==='fast-squat' ? 20 : 60
  const angles = [178,178,178,178,178,178,178,178,178,178,...Array.from({length:21},(_,i)=>178-(178-min)*i/20),...Array(6).fill(min),...Array.from({length:21},(_,i)=>min+(178-min)*i/20),...Array(12).fill(178)] as number[]
  if (kind==='incomplete-extension') angles.splice(48,angles.length-48,...[145,149,152,152,150,145,138,130,125,120,118,118,...Array.from({length:21},(_,i)=>118+60*i/20),...Array(10).fill(178)])
  return angles.map((angle,i)=>{const s=pose(i<10 ? i*60 : 600+(i-10)*speed,angle);if(kind==='tracking-lost-mid-rep' && i>24 && i<40) return {...s,landmarks:[]};return s})
}
