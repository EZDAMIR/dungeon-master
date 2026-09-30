import { useTranslation } from '../../shared/uiLanguage'
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { useGestureSnapshot, useGestureStore } from './gestureNavigation'
import { useControlFeedback } from './useControlFeedback'
export function GestureTarget({id,selected=false,disabled=false,onSelect,children,ariaLabel,className='',...accessibility}: {id:string;selected?:boolean;disabled?:boolean;onSelect?:(source?: 'hands' | 'physical')=>void;children:ReactNode;ariaLabel?:string;className?:string} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-expanded' | 'aria-controls' | 'lang'>) {
  const { translateUi } = useTranslation()

  const ref = useRef<HTMLButtonElement>(null)
  const store = useGestureStore()
  const snapshot = useGestureSnapshot()
  const select = useControlFeedback(ref, onSelect)
  useEffect(() => ref.current ? store.registry.register(id,ref.current,select) : undefined,[id,store,select])
  const focused = snapshot.focused === id
  const confirmed = selected && snapshot.lastCommand === 'confirm'
  const candidate = focused && snapshot.candidate === 'select' ? 'pinch-candidate' : selected && snapshot.candidate === 'confirm' ? 'confirm-candidate' : ''
  return <button {...accessibility} ref={ref} type="button" disabled={disabled} data-gesture-target={id} aria-pressed={selected} aria-label={translateUi(ariaLabel)} onClick={() => { store.onPhysicalInteraction(); select('physical') }}
    className={`gesture-target ${focused ? 'focused' : ''} ${selected ? 'selected' : ''} ${confirmed ? 'confirmed' : ''} ${candidate} ${className}`}>{translateUi(children)}</button>
}
