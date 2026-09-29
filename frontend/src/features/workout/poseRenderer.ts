import { poseConfig } from '../../vision/pose/config'
import { POSE_CONNECTIONS, SIDES } from '../../vision/pose/landmarks'
import { squatFeatures } from '../../vision/exercises/squat/features'
import type { PosePresentation } from './RealVisionSource'
export function drawPose(ctx:CanvasRenderingContext2D,presentation:PosePresentation,width:number,height:number,videoWidth:number,videoHeight:number){
 const sample=presentation.sample
 if(!sample)return
 const scale=Math.min(width/videoWidth,height/videoHeight),w=videoWidth*scale,h=videoHeight*scale,ox=(width-w)/2,oy=(height-h)/2
 const point=(i:number)=>({x:ox+(1-sample.landmarks[i].x)*w,y:oy+sample.landmarks[i].y*h})
 const active=presentation.activeSide ? Object.values(SIDES[presentation.activeSide]) : []
 for(const [a,b] of POSE_CONNECTIONS){
  const p=sample.landmarks[a],q=sample.landmarks[b]
  ctx.strokeStyle=p.visibility<poseConfig.visibility || q.visibility<poseConfig.visibility ? '#ff986a' : active.includes(a as typeof active[number]) && active.includes(b as typeof active[number]) ? '#7cffb0' : '#88a5ba88'
  ctx.lineWidth=active.includes(a as typeof active[number]) ? 4 : 2
  const from=point(a),to=point(b);ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke()
 }
 for(const i of new Set(POSE_CONNECTIONS.flat())){const p=point(i);ctx.fillStyle=sample.landmarks[i].visibility<poseConfig.visibility ? '#ff986a' : active.includes(i as typeof active[number]) ? '#fff' : '#88a5ba';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill()}
 if(presentation.activeSide){const knee=point(SIDES[presentation.activeSide].knee);ctx.fillStyle='#fff';ctx.font='bold 18px sans-serif';ctx.fillText(`${Math.round(squatFeatures(sample,presentation.activeSide).kneeAngle)}°`,knee.x+12,knee.y)}
}
