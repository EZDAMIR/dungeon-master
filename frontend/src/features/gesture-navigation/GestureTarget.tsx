import { useEffect, useRef, type ReactNode } from 'react'
import { useGestureSnapshot, useGestureStore } from './gestureNavigation'
export function GestureTarget({id,selected=false,disabled=false,onSelect,children}: {id:string;selected?:boolean;disabled?:boolean;onSelect?:()=>void;children:ReactNode}) {
  const ref = useRef<HTMLButtonElement>(null)
  const store = useGestureStore()
  const snapshot = useGestureSnapshot()
  useEffect(() => ref.current ? store.registry.register(id,ref.current,onSelect) : undefined,[id,store,onSelect])
  const focused = snapshot.focused === id
  const confirmed = selected && snapshot.lastCommand === 'confirm'
  const candidate = focused && snapshot.candidate === 'select' ? 'pinch-candidate' : selected && snapshot.candidate === 'confirm' ? 'confirm-candidate' : ''
  return <button ref={ref} type="button" disabled={disabled} data-gesture-target={id} aria-pressed={selected} onClick={onSelect}
    className={`gesture-target ${focused ? 'focused' : ''} ${selected ? 'selected' : ''} ${confirmed ? 'confirmed' : ''} ${candidate}`}>{children}</button>
}
