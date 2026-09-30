import { useEffect, useSyncExternalStore } from 'react'
import type { BackendStore } from '../store/backend'
export function useBackend(store:BackendStore){
  const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot)
  useEffect(()=>store.attach(),[store])
  return snapshot
}
