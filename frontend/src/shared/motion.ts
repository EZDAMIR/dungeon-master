import { useLayoutEffect, useSyncExternalStore, type RefObject } from 'react'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const listeners = new Set<() => void>()
let query: MediaQueryList | null = null
const notify = () => listeners.forEach(listener => listener())
const mediaQuery = () => typeof window.matchMedia === 'function' ? window.matchMedia(reducedMotionQuery) : null

export function readMotionPreference(): 'on' | 'system' { return (query ?? mediaQuery())?.matches ? 'system' : 'on' }

export function subscribeMotion(listener: () => void) {
  if (!listeners.size) {
    query = mediaQuery()
    query?.addEventListener('change', notify)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) { query?.removeEventListener('change', notify); query = null }
  }
}

export function useMotionPreference() {
  return useSyncExternalStore(subscribeMotion, readMotionPreference, () => 'system' as const)
}

/** One application owner applies system preferences to CSS, including portals. */
export function useMotionRoot() {
  const motion = useMotionPreference()
  useLayoutEffect(() => {
    const root = document.documentElement, previous = root.dataset.motion
    root.dataset.motion = motion === 'on' ? 'on' : 'off'
    return () => { if (previous === undefined) delete root.dataset.motion; else root.dataset.motion = previous }
  }, [motion])
  useLayoutEffect(() => {
    const root = document.documentElement, previous = root.dataset.motionSuspended
    const update = () => { root.dataset.motionSuspended = String(document.hidden) }
    update(); document.addEventListener('visibilitychange', update)
    return () => { document.removeEventListener('visibilitychange', update); if (previous === undefined) delete root.dataset.motionSuspended; else root.dataset.motionSuspended = previous }
  }, [])
}

/** Fade a new screen without remounting its state or moving registered targets. */
export function usePageMotion(ref: RefObject<HTMLElement | null>, screen: string) {
  const motion = useMotionPreference()
  useLayoutEffect(() => {
    if (motion !== 'on' || document.hidden) return
    const animation = ref.current?.animate?.([{ opacity: .65 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' })
    return () => animation?.cancel()
  }, [ref, screen, motion])
}
