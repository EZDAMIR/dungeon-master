import { useEffect, useRef, type RefObject } from 'react'
import { useGestureStore } from '../gesture-navigation/gestureNavigation'
import { drawPose } from './poseRenderer'
export function PoseOverlay({video}:{video:RefObject<HTMLVideoElement|null>}){
 const canvas=useRef<HTMLCanvasElement>(null),store=useGestureStore()
 useEffect(()=>{
  const c=canvas.current;if(!c)return
  const ctx=c.getContext('2d');let frame=0,w=0,h=0,dpr=1
  const resize=()=>{const box=c.getBoundingClientRect();w=box.width;h=box.height;dpr=window.devicePixelRatio||1;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  const observer=new ResizeObserver(resize);observer.observe(c)
  const draw=()=>{
   if(ctx){if(dpr!==(window.devicePixelRatio||1))resize();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);drawPose(ctx,store.pose,w,h,video.current?.videoWidth||1280,video.current?.videoHeight||720)}
   frame=requestAnimationFrame(draw)
  }
  resize();frame=requestAnimationFrame(draw)
  return ()=>{cancelAnimationFrame(frame);observer.disconnect()}
 },[store,video])
 return <canvas ref={canvas} className="pose-overlay" aria-hidden="true" />
}
