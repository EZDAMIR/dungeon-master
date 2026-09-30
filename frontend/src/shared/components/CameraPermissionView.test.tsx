import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { CameraPermissionView } from './CameraPermissionView'

it('shows indeterminate preparation during startup and prevents duplicate starts', () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host), start = vi.fn()
  try {
    act(() => root.render(<CameraPermissionView loading={false} onStart={start}/>))
    const button = host.querySelector('button')!
    act(() => button.click()); expect(start).toHaveBeenCalledOnce()
    act(() => root.render(<CameraPermissionView loading onStart={start}/>))
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Готовим камеру и управление')
    expect(button.disabled).toBe(true)
    act(() => button.click()); expect(start).toHaveBeenCalledOnce()
    act(() => root.render(<CameraPermissionView loading={false} onStart={start}/>))
    expect(host.querySelector('.camera-loading')).toBeNull(); expect(button.disabled).toBe(false)
  } finally { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals() }
})
