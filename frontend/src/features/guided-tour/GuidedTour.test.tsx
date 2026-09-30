import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { GuidedTour } from './GuidedTour'
import { AudioCoordinator } from '../../audio/audioCoordinator'
import { NavigationContext } from '../gesture-navigation/gestureNavigation'
import { GestureStore } from '../gesture-navigation/gestureStore'
import { INITIAL_STATE } from '../../app/modes'

it('shows contextual animated guidance and keeps guide controls usable with gestures across routes', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host), store = new GestureStore(), audio = new AudioCoordinator(), done = vi.fn()
  store.setAppState({ ...INITIAL_STATE, mode: 'PROFILE' })
  const render = (screen: string) => act(() => root.render(<NavigationContext.Provider value={store}><GuidedTour audio={audio} screen={screen} onDone={done}/></NavigationContext.Provider>))
  try {
    render('PROFILE'); expect(host.textContent).toContain('Выбирай разделы'); expect(host.querySelector('.example-pinch')).not.toBeNull()
    act(() => store.emit({ type: 'gesture.confirmed', command: 'select', targetId: 'guide-next', at: 100 }))
    expect(host.textContent).toContain('Начни с себя')
    render('PLAN'); expect(host.textContent).toContain('Выбирай разделы')
    act(() => store.registry.activate('guide-example-scroll')); expect(host.querySelector('.example-scroll')).not.toBeNull(); expect(host.textContent).toContain('Два пальца вверх или вниз')
    act(() => store.registry.activate('guide-close')); expect(host.querySelector('.guided-tour')).toBeNull(); expect(done).toHaveBeenCalledOnce()
  } finally { act(() => root.unmount()); host.remove(); audio.close(); vi.unstubAllGlobals() }
})
