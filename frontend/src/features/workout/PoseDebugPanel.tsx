import { useEffect, useState } from 'react'
import { useGestureStore } from '../gesture-navigation/gestureNavigation'
export function PoseDebugPanel(){
 const store=useGestureStore(),[stats,setStats]=useState({fps:0,inferenceMs:0})
 useEffect(()=>{const timer=setInterval(()=>setStats({fps:store.pose.fps,inferenceMs:store.pose.inferenceMs}),250);return ()=>clearInterval(timer)},[store])
 return <small>Pose inference: {stats.fps.toFixed(1)} FPS · {stats.inferenceMs.toFixed(1)} ms</small>
}
