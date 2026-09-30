import { useTranslation } from '../../shared/uiLanguage'
import { useEffect, useRef, type ReactNode } from 'react'
import { useGestureSnapshot, useGestureStore } from './gestureNavigation'
import { useControlFeedback } from './useControlFeedback'

export function GestureLink({ id, href, current, onSelect, children, className = '' }: {
  id: string; href: string; current?: boolean; onSelect(): void; children: ReactNode; className?: string
}) {
  const { translateUi } = useTranslation()

  const ref = useRef<HTMLAnchorElement>(null), store = useGestureStore(), snapshot = useGestureSnapshot()
  const select = useControlFeedback(ref, onSelect)
  useEffect(() => ref.current ? store.registry.register(id, ref.current, select) : undefined, [id, store, select])
  return <a ref={ref} href={href} data-gesture-target={id} aria-current={current ? 'page' : undefined}
    className={`${className} ${snapshot.focused === id ? 'focused' : ''}`} onClick={event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault(); store.onPhysicalInteraction(); select('physical')
    }}>{translateUi(children)}</a>
}
