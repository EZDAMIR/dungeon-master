import { createContext, useContext, useSyncExternalStore } from 'react'
import { GestureStore } from './gestureStore'
export const NavigationContext = createContext<GestureStore | null>(null)
export function useGestureStore() {
  const store = useContext(NavigationContext)
  if (!store) throw new Error('GestureNavigationProvider is required')
  return store
}
export function useGestureSnapshot() {
  const store = useGestureStore()
  return useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot)
}
