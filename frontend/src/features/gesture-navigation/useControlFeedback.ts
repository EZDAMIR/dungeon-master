import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { readMotionPreference, subscribeMotion } from '../../shared/motion'

/** Visual acknowledgement shared by native clicks and registered pinch actions. */
export function useControlFeedback(ref: RefObject<HTMLButtonElement | HTMLAnchorElement | null>, onSelect?: (source?: 'hands' | 'physical') => void) {
  const animation = useRef<Animation | null>(null)
  useEffect(() => {
    const cancel = () => { animation.current?.cancel(); animation.current = null }
    const unsubscribe = subscribeMotion(() => { if (readMotionPreference() !== 'on') cancel() })
    return () => { unsubscribe(); cancel() }
  }, [])
  return useCallback((source?: 'hands' | 'physical') => {
    animation.current?.cancel()
    if (readMotionPreference() === 'on' && !document.hidden) {
      animation.current = ref.current?.animate?.([
        { boxShadow: '0 0 0 0px var(--dm-muted)' },
        { boxShadow: '0 0 0 7px transparent' },
      ], { duration: 360, easing: 'ease-out' }) ?? null
    }
    onSelect?.(source)
  }, [ref, onSelect])
}
