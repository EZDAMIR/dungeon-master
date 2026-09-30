import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NavigationContext } from '../../features/gesture-navigation/gestureNavigation'
import { GestureStore } from '../../features/gesture-navigation/gestureStore'
import { GestureTarget } from '../../features/gesture-navigation/GestureTarget'
import { GestureLink } from '../../features/gesture-navigation/GestureLink'
import { GesturePlayground } from '../../features/gesture-navigation/GesturePlayground'
import { useMotionRoot, usePageMotion } from '../../shared/motion'

let host: HTMLDivElement, root: Root, store: GestureStore, reduced: boolean
let media: EventTarget & { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> }
let animations: { target: HTMLElement; cancel: ReturnType<typeof vi.fn> }[]
const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate')
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const values = new Map<string, string>([['dungeon-master.motion.v1', 'on']])
  vi.stubGlobal('localStorage', { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => values.set(key, value)), removeItem: vi.fn((key: string) => values.delete(key)) })
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  reduced = false; animations = []
  const events = new EventTarget()
  media = Object.assign(events, { get matches() { return reduced }, addEventListener: vi.fn(events.addEventListener.bind(events)), removeEventListener: vi.fn(events.removeEventListener.bind(events)) })
  Object.defineProperty(media, 'matches', { get: () => reduced })
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn(function (this: HTMLElement) {
    const animation = { target: this, cancel: vi.fn() }; animations.push(animation)
    return animation as unknown as Animation
  }) })
  store = new GestureStore()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount()); host.remove()
  if (originalAnimate) Object.defineProperty(HTMLElement.prototype, 'animate', originalAnimate); else Reflect.deleteProperty(HTMLElement.prototype, 'animate')
  vi.restoreAllMocks(); vi.unstubAllGlobals()
})
function Surface({ screen = 'landing', children }: { screen?: string; children: React.ReactNode }) {
  useMotionRoot()
  const ref = useRef<HTMLElement | null>(null); usePageMotion(ref, screen)
  return <NavigationContext.Provider value={store}><main ref={ref}>{children}</main></NavigationContext.Provider>
}
function select(id: string) { act(() => host.querySelector<HTMLButtonElement>(`[data-gesture-target="${id}"]`)!.click()) }

it('gesture preview choices work through physical and hand selection without navigating', () => {
  act(() => root.render(<Surface><GesturePlayground/></Surface>))
  select('nav-preview-scroll')
  expect(host.querySelector('.example-scroll')).not.toBeNull()
  expect(host.querySelector('[data-gesture-target="nav-preview-scroll"]')?.getAttribute('aria-pressed')).toBe('true')
  expect(host.textContent).toContain('страница следует за ними')
  act(() => store.registry.activate('nav-preview-pinch'))
  expect(host.querySelector('.example-pinch')).not.toBeNull()
  expect(host.querySelector('.playground-explanation')?.textContent).toContain('затем отпусти')
  expect(host.textContent).toContain('Камера выключена')
})

it('acknowledges click and pinch once, preserves disabled controls and respects system reduced motion', () => {
  const action = vi.fn()
  act(() => root.render(<Surface><GestureTarget id="choice" onSelect={action}>Choice</GestureTarget><GestureTarget id="disabled" disabled onSelect={action}>Disabled</GestureTarget></Surface>))
  select('choice'); act(() => store.registry.activate('choice'))
  expect(action.mock.calls).toEqual([['physical'], ['hands']])
  const feedback = animations.filter(animation => animation.target.dataset.gestureTarget === 'choice')
  expect(feedback).toHaveLength(2); expect(feedback[0].cancel).toHaveBeenCalledOnce()
  select('disabled'); act(() => store.registry.activate('disabled')); expect(action).toHaveBeenCalledTimes(2)
  act(() => { reduced = true; media.dispatchEvent(new Event('change')) })
  expect(document.documentElement.dataset.motion).toBe('off')
  expect(feedback[1].cancel).toHaveBeenCalledOnce()
  const count = animations.length
  select('choice'); expect(action).toHaveBeenLastCalledWith('physical'); expect(animations).toHaveLength(count)
  expect(host.querySelector('[data-gesture-target="choice"]')?.getAttribute('disabled')).toBeNull()
})

it('follows system reduced motion immediately and removes its listeners on teardown', () => {
  act(() => root.render(<Surface><GesturePlayground/></Surface>))
  act(() => { reduced = true; media.dispatchEvent(new Event('change')) })
  expect(host.textContent).not.toContain('Pause animations')
  expect(host.querySelectorAll('button:disabled')).toHaveLength(0)
  expect(document.documentElement.dataset.motion).toBe('off')
  expect(animations.every(animation => animation.cancel.mock.calls.length > 0)).toBe(true)
  act(() => { reduced = false; media.dispatchEvent(new Event('change')) })
  expect(document.documentElement.dataset.motion).toBe('on')
  act(() => root.render(null))
  expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  expect(document.documentElement.hasAttribute('data-motion')).toBe(false)
})

it('page transitions preserve input values and focus, with no transition under reduced motion', () => {
  const render = (screen: string) => act(() => root.render(<Surface screen={screen}><input aria-label="Draft" defaultValue="My plan"/></Surface>))
  render('context'); const input = host.querySelector('input')!; input.value = 'Keep my draft'; input.focus()
  render('plan'); expect(host.querySelector('input')).toBe(input); expect(input.value).toBe('Keep my draft'); expect(document.activeElement).toBe(input)
  expect(animations[0].cancel).toHaveBeenCalledOnce()
  act(() => { reduced = true; media.dispatchEvent(new Event('change')) }); const count = animations.length
  render('context'); expect(animations).toHaveLength(count); expect(input.value).toBe('Keep my draft')
})

it('ignores obsolete saved pause choices, supports browsers without matchMedia and retains native link modifiers', () => {
  window.localStorage.setItem('dungeon-master.motion.v1', 'off')
  vi.stubGlobal('matchMedia', undefined)
  const action = vi.fn()
  act(() => root.render(<Surface><GestureLink id="home" href="#home" onSelect={action}>Home</GestureLink></Surface>))
  expect(document.documentElement.dataset.motion).toBe('on')
  expect(host.querySelector('button')).toBeNull()
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
  act(() => host.querySelector('a')!.dispatchEvent(event))
  expect(action).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(false)
})
