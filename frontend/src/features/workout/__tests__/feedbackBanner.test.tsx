import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { WorkoutFeedbackBanner } from '../WorkoutFeedbackBanner'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
it('keeps a transient correction readable and exposes a visual live region', () => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div'), root = createRoot(container)
  act(() => root.render(<WorkoutFeedbackBanner feedback={{message:'Опустись немного ниже',kind:'hint'}} />))
  expect(container.querySelector('[aria-live="polite"].feedback-hint')).not.toBeNull()
  act(() => root.render(<WorkoutFeedbackBanner feedback={{message:'Хорошее повторение',kind:'positive'}} />))
  expect(container.textContent).toContain('Опустись немного ниже')
  act(() => vi.advanceTimersByTime(3500))
  expect(container.textContent).toContain('Хорошее повторение')
  act(() => root.unmount())
})
