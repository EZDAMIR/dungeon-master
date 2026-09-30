import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { NavigationContext } from '../gestureNavigation'
import { GestureStore } from '../gestureStore'
import { GestureCursor } from '../GestureCursor'
import { CameraStage } from '../../workout/CameraStage'
import type { RealGestureSource } from '../RealGestureSource'
let root:Root, container:HTMLDivElement, frames:Map<number,FrameRequestCallback>, id:number
beforeEach(()=>{
  frames=new Map();id=0
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}})
  vi.stubGlobal('requestAnimationFrame',vi.fn((fn:FrameRequestCallback)=>{frames.set(++id,fn);return id}))
  vi.stubGlobal('cancelAnimationFrame',vi.fn((id:number)=>frames.delete(id)))
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)
})
afterEach(()=>{act(()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals()})
function tick(at:number) { const pending=[...frames];frames.clear();for(const [,fn] of pending) fn(at) }
it('updates cursor transforms without React render and hides after tracking-loss grace',()=>{
  const store=new GestureStore()
  act(()=>root.render(<NavigationContext.Provider value={store}><GestureCursor/></NavigationContext.Provider>))
  store.emit({type:'cursor.moved',at:0,x:42,y:61});tick(0)
  const cursor=container.querySelector<HTMLElement>('.gesture-cursor')!
  expect(cursor.style.transform).toBe('translate3d(42px,61px,0)');expect(cursor.style.opacity).toBe('1')
  act(()=>store.emit({type:'gesture.confirmed',at:10,command:'select'}));tick(10)
  expect(cursor.dataset.pinching).toBe('true')
  act(()=>store.emit({type:'tracking.lost',at:20,target:'hand'}));tick(30)
  expect(cursor.style.opacity).toBe('1');expect(cursor.dataset.pinching).toBe('false')
  tick(201);expect(cursor.style.opacity).toBe('0')
  act(()=>root.unmount());expect(frames.size).toBe(0)
  root=createRoot(container)
})
it('mirrors landmarks once, accounts for letterboxing/DPR and cancels drawing on unmount',()=>{
  const context={setTransform:vi.fn(),clearRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),arc:vi.fn(),fill:vi.fn()}
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:400,bottom:225,width:400,height:225,x:0,y:0,toJSON:()=>({})})
  vi.spyOn(HTMLVideoElement.prototype,'videoWidth','get').mockReturnValue(640)
  vi.spyOn(HTMLVideoElement.prototype,'videoHeight','get').mockReturnValue(480)
  vi.spyOn(window,'devicePixelRatio','get').mockReturnValue(2)
  const store=new GestureStore()
  store.sample={at:0,gesture:null,handedness:'Left',landmarks:Array.from({length:21},()=>({x:.8,y:.5,z:0}))}
  const source=createRef<RealGestureSource|null>(),dispose=vi.fn(),onVideo=vi.fn()
  source.current={dispose} as unknown as RealGestureSource
  act(()=>root.render(<NavigationContext.Provider value={store}><CameraStage onVideo={onVideo} sourceRef={source}/></NavigationContext.Provider>))
  tick(0)
  expect(context.arc.mock.calls[0][0]).toBeCloseTo(110);expect(context.arc.mock.calls[0][1]).toBeCloseTo(112.5)
  const canvas=container.querySelector('canvas')!
  expect(canvas.width).toBe(800);expect(canvas.height).toBe(450)
  expect(context.setTransform).toHaveBeenCalledWith(2,0,0,2,0,0)
  act(()=>root.unmount());expect(frames.size).toBe(0);expect(dispose).toHaveBeenCalledOnce();expect(onVideo).toHaveBeenLastCalledWith(null)
  root=createRoot(container)
})
