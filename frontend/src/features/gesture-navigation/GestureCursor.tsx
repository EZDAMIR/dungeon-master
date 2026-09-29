import { useEffect, useRef } from 'react'
import { visionConfig } from '../../vision/core/config'
import { useGestureStore } from './gestureNavigation'
export function GestureCursor() {
  const ref = useRef<HTMLDivElement>(null)
  const store = useGestureStore()
  useEffect(() => {
    let frame = 0
    const render = (at: number) => {
      const el = ref.current
      const c = store.cursor
      if (el) {
        el.style.transform = `translate3d(${c.x}px,${c.y}px,0)`
        el.style.opacity = c.visible || at - c.lostAt < visionConfig.cursorGraceMs ? '1' : '0'
        el.dataset.pinching = String(c.pinching)
      }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  },[store])
  return <div ref={ref} className="gesture-cursor" aria-hidden="true" />
}
