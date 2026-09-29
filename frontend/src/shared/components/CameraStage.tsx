import { useEffect, useRef } from 'react'
import { useGestureStore } from '../../features/gesture-navigation/gestureNavigation'
import type { RealGestureSource } from '../../features/gesture-navigation/RealGestureSource'

const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]]
export function CameraStage({onVideo,sourceRef}:{onVideo:(video:HTMLVideoElement|null)=>void;sourceRef:React.RefObject<RealGestureSource|null>}) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const store = useGestureStore()
  useEffect(() => {
    const v = video.current
    const c = canvas.current
    if (!v || !c) return
    onVideo(v)
    const context = c.getContext('2d')
    let width = 0, height = 0, dpr = 1, frame = 0
    const resize = () => {
      const rect = c.getBoundingClientRect()
      width = rect.width; height = rect.height; dpr = window.devicePixelRatio || 1
      c.width = Math.round(width*dpr); c.height = Math.round(height*dpr)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(c)
    const draw = () => {
      if (context) {
        if (dpr !== window.devicePixelRatio) resize()
        context.setTransform(dpr,0,0,dpr,0,0)
        context.clearRect(0,0,width,height)
        const hand = store.sample?.landmarks
        if (hand) {
          const videoWidth = v.videoWidth || 1280, videoHeight = v.videoHeight || 720
          const scale = Math.min(width/videoWidth,height/videoHeight)
          const imageWidth = videoWidth*scale, imageHeight = videoHeight*scale
          const offsetX = (width-imageWidth)/2, offsetY = (height-imageHeight)/2
          const point = (index:number) => ({x:offsetX+(1-hand[index].x)*imageWidth,y:offsetY+hand[index].y*imageHeight})
          context.strokeStyle = '#7cffb0'; context.fillStyle = '#fff'; context.lineWidth = 2
          for (const [a,b] of connections) { const p=point(a),q=point(b);context.beginPath();context.moveTo(p.x,p.y);context.lineTo(q.x,q.y);context.stroke() }
          for (let i=0;i<hand.length;i++) { const p=point(i);context.beginPath();context.arc(p.x,p.y,3,0,Math.PI*2);context.fill() }
        }
      }
      frame = requestAnimationFrame(draw)
    }
    resize(); frame=requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame);observer.disconnect();sourceRef.current?.dispose();sourceRef.current=null;onVideo(null) }
  },[store,onVideo,sourceRef])
  return <div className="camera-preview"><video ref={video} muted playsInline aria-label="Зеркальное изображение камеры" /><canvas ref={canvas} aria-hidden="true" /></div>
}
