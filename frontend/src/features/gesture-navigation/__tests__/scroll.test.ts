import { afterEach, expect, it, vi } from 'vitest'
import { scrollForGesture } from '../gestureScroll'
import { GestureStore } from '../gestureStore'
import { INITIAL_STATE } from '../../../app/modes'

afterEach(() => {
  vi.restoreAllMocks(); document.body.innerHTML = ''
  for (const key of ['scrollHeight', 'clientHeight', 'scrollTop', 'scrollBy']) Reflect.deleteProperty(document.documentElement, key)
  Reflect.deleteProperty(document, 'elementFromPoint')
})
function scrollable(element: Element, top = 200, height = 500, content = 2000) {
  Object.defineProperties(element, {
    scrollTop: { configurable: true, value: top, writable: true },
    clientHeight: { configurable: true, value: height },
    scrollHeight: { configurable: true, value: content },
    scrollBy: { configurable: true, value: vi.fn() },
  })
  return vi.mocked(element.scrollBy)
}
function underCursor(element: Element | null) {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => element) })
}
const cursor = { x: 120, y: 200 }
it('scrolls the page proportionally in both directions and clamps to its edges', () => {
  underCursor(null)
  const scroll = scrollable(document.documentElement)
  expect(scrollForGesture(.1, cursor)).toBe(true)
  expect(scroll).toHaveBeenLastCalledWith({ top: 50, behavior: 'instant' })
  expect(scrollForGesture(-1, cursor)).toBe(true)
  expect(scroll).toHaveBeenLastCalledWith({ top: -200, behavior: 'instant' })
  scrollable(document.documentElement, 1500)
  expect(scrollForGesture(.1, cursor)).toBe(false)
})
it('scrolls the nearest overflow panel under the cursor before the page', () => {
  const panel = document.createElement('div'), button = document.createElement('button')
  panel.style.overflowY = 'auto'; panel.appendChild(button); document.body.appendChild(panel)
  underCursor(button)
  const pageScroll = scrollable(document.documentElement), panelScroll = scrollable(panel, 100, 300)
  scrollForGesture(.1, cursor)
  expect(panelScroll).toHaveBeenCalledWith({ top: 30, behavior: 'instant' })
  expect(pageScroll).not.toHaveBeenCalled()
  expect(document.elementFromPoint).toHaveBeenCalledWith(120, 200)
})
it('chains an exhausted nonmodal panel to the page, without scrolling hidden overflow', () => {
  const panel = document.createElement('div'); panel.style.overflowY = 'auto'; document.body.appendChild(panel)
  underCursor(panel)
  const panelScroll = scrollable(panel, 1700, 300), pageScroll = scrollable(document.documentElement)
  scrollForGesture(.1, cursor)
  expect(panelScroll).not.toHaveBeenCalled(); expect(pageScroll).toHaveBeenCalledOnce()
  panel.style.overflowY = 'hidden'; scrollable(panel, 0, 300)
  scrollForGesture(.1, cursor)
  expect(panel.scrollBy).not.toHaveBeenCalled()
})
it('scrolls a dialog and stops at its edge without moving the background', () => {
  const dialog = document.createElement('dialog'); dialog.open = true; dialog.style.overflow = 'auto'
  document.body.appendChild(dialog); underCursor(dialog)
  const pageScroll = scrollable(document.documentElement), dialogScroll = scrollable(dialog, 0, 300, 400)
  expect(scrollForGesture(1, cursor)).toBe(true)
  expect(dialogScroll).toHaveBeenCalledWith({ top: 100, behavior: 'instant' })
  scrollable(dialog, 100, 300, 400)
  expect(scrollForGesture(.1, cursor)).toBe(false)
  expect(pageScroll).not.toHaveBeenCalled()
})
it('clears stale focus, shows scroll feedback, and leaves navigation state alone', () => {
  underCursor(null)
  const scroll = scrollable(document.documentElement)
  const store = new GestureStore(), onEvent = vi.fn()
  store.setAppState({ ...INITIAL_STATE, mode: 'PLAN' }); store.connect(onEvent)
  store.emit({ type: 'focus.changed', at: 0, targetId: 'old-target' })
  store.emit({ type: 'gesture.candidate', at: 0, command: 'select', progress: .5 })
  store.emit({ type: 'gesture.scrolled', at: 180, deltaY: .1 })
  expect(scroll).toHaveBeenCalledOnce()
  expect(store.getSnapshot()).toMatchObject({ lastCommand: 'scroll-down', focused: null, candidate: null, progress: 0 })
  expect(store.getSnapshot().message).toContain('Прокрутка вниз')
  expect(onEvent).toHaveBeenLastCalledWith({ type: 'gesture.scrolled', at: 180, deltaY: .1 }, expect.anything())
  scrollable(document.documentElement, 1500)
  store.emit({ type: 'gesture.scrolled', at: 1180, deltaY: .1 })
  expect(store.getSnapshot().message).toContain('Достигнут край')
})
it.each(['CAMERA_PERMISSION', 'CALIBRATION', 'COUNTDOWN', 'WORKOUT', 'PAUSED'] as const)('ignores scroll in %s', mode => {
  const scroll = scrollable(document.documentElement)
  const store = new GestureStore(), onEvent = vi.fn()
  store.setAppState({ ...INITIAL_STATE, mode }); store.connect(onEvent)
  store.emit({ type: 'gesture.scrolled', at: 180, deltaY: -.1 })
  expect(scroll).not.toHaveBeenCalled(); expect(onEvent).not.toHaveBeenCalled()
})

it.each(['PROFILE', 'PLAN', 'PROGRESS', 'SCHEDULE', 'RESULTS', 'TUTORIAL', 'MENU'] as const)('allows scrolling in %s', mode => {
  const scroll = scrollable(document.documentElement)
  const store = new GestureStore()
  store.setAppState({ ...INITIAL_STATE, mode })
  store.emit({ type: 'gesture.scrolled', at: 180, deltaY: .1 })
  expect(scroll).toHaveBeenCalledOnce()
})
it('contains scrolling inside role=dialog overlays and a scoped panel even when the cursor is outside', () => {
  const overlay = document.createElement('section'), button = document.createElement('button')
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true')
  overlay.style.overflowY = 'auto'; overlay.appendChild(button); document.body.appendChild(overlay)
  underCursor(button)
  const pageScroll = scrollable(document.documentElement), overlayScroll = scrollable(overlay, 100, 300, 400)
  expect(scrollForGesture(.1, cursor)).toBe(false)
  expect(pageScroll).not.toHaveBeenCalled()
  scrollable(overlay, 0, 300, 400); underCursor(document.body)
  expect(scrollForGesture(.1, cursor, overlay)).toBe(true)
  expect(overlay.scrollBy).toHaveBeenCalledWith({ top: 30, behavior: 'instant' })
  expect(overlayScroll).not.toHaveBeenCalled()
  expect(pageScroll).not.toHaveBeenCalled()
})
it('rejects zero/nonfinite deltas and avoids global renders for every scrolling sample', () => {
  const scroll = scrollable(document.documentElement)
  for (const delta of [0, NaN, Infinity]) expect(scrollForGesture(delta, cursor)).toBe(false)
  expect(scroll).not.toHaveBeenCalled()
  const store = new GestureStore(), listener = vi.fn()
  store.setAppState({ ...INITIAL_STATE, mode: 'PLAN' }); store.subscribe(listener)
  for (let at = 0; at < 500; at += 50) store.emit({ type: 'gesture.scrolled', at, deltaY: .01 })
  expect(scroll).toHaveBeenCalledTimes(10)
  expect(listener).toHaveBeenCalledOnce()
})
