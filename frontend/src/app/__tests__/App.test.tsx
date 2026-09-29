import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { App } from '../App'
let root:Root,container:HTMLDivElement,time:number
beforeEach(()=>{
  time=0;vi.spyOn(performance,'now').mockImplementation(()=>time)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}})
  vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn())
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({left:100,top:100,right:300,bottom:300,width:200,height:200,x:100,y:100,toJSON:()=>({})})
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null)
  window.history.replaceState({},'', '/?fakeVision=1')
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)
})
afterEach(()=>{act(()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals();window.history.replaceState({},'','/')})
function click(label:string,at:number) {
  time=at
  const button=[...container.querySelectorAll('button')].find(button=>button.textContent===label)
  if(!button) throw new Error(`Missing button: ${label}`)
  act(()=>button.click())
}
it('drives the rendered application through the shared fake semantic pipeline',()=>{
  act(()=>root.render(<App/>))
  expect(container.querySelector('header code')?.textContent).toBe('CAMERA_PERMISSION')
  click('Camera ready',0);click('Hand found',10);click('Move cursor to target',400)
  expect(container.textContent).toContain('Шаг 2/5')
  click('Move cursor to target',450);expect(container.textContent).toContain('Шаг 3/5')
  click('Pinch / select',500);expect(container.textContent).toContain('Шаг 4/5')
  click('Fist hold',1200);expect(container.textContent).toContain('Шаг 5/5')
  click('Thumb Up hold',2000);expect(container.querySelector('header code')?.textContent).toBe('MENU')
  click('Thumb Up hold',2100);expect(container.querySelector('header code')?.textContent).toBe('MENU')
  expect(container.textContent).toContain('Сначала выбери тренировку щипком')
  click('Move cursor to target',2200);click('Pinch / select',2300)
  expect(container.querySelector('[data-gesture-target="bodyweight-squat"]')?.getAttribute('aria-pressed')).toBe('true')
  expect(container.querySelector('header code')?.textContent).toBe('MENU')
  click('Thumb Up hold',3000);expect(container.querySelector('header code')?.textContent).toBe('CALIBRATION')
  click('Fist hold',4000);expect(container.querySelector('header code')?.textContent).toBe('MENU')
  click('Fist hold',5000);expect(container.querySelector('header code')?.textContent).toBe('TUTORIAL')
  click('Move cursor to target',5400);expect(container.textContent).toContain('Шаг 2/5')
  click('Camera error',6000);expect(container.querySelector('[role="alert"]')?.textContent).toContain('Камера отключена')
  click('Повторить / Retry',6100);expect(container.querySelector('header code')?.textContent).toBe('TUTORIAL')
})
it('hides fake controls by default and does not request camera before the start action',()=>{
  window.history.replaceState({},'','/')
  const getUserMedia=vi.fn()
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia},configurable:true})
  act(()=>root.render(<App/>))
  expect(container.textContent).not.toContain('Fake vision')
  expect(container.textContent).toContain('Включить камеру')
  expect(getUserMedia).not.toHaveBeenCalled()
})
