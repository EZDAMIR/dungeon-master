import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { GestureStore } from '../gestureStore'
import { GestureTargetRegistry } from '../gestureTargetRegistry'
import { INITIAL_STATE } from '../../../app/modes'
import { fakeVisionEnabled } from '../../../app/visionMode'
beforeEach(()=>vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}}))
afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML=''})
function target() {
  const button=document.createElement('button');document.body.appendChild(button)
  button.getBoundingClientRect=()=>({left:100,top:100,right:300,bottom:300,width:200,height:200,x:100,y:100,toJSON:()=>({})})
  return button
}
it('resolves registered visible targets, refreshes layout and excludes disabled ones',()=>{
  const registry=new GestureTargetRegistry(),button=target(),remove=registry.register('squat',button)
  expect(registry.resolve(150,150)).toBe('squat')
  button.disabled=true;expect(registry.resolve(150,150)).toBeNull()
  button.disabled=false;expect(()=>registry.register('squat',button)).toThrow('Duplicate')
  button.getBoundingClientRect=()=>({left:0,top:0,right:0,bottom:0,width:0,height:0,x:0,y:0,toJSON:()=>({})})
  expect(registry.resolve(0,0)).toBeNull()
  remove();expect(registry.rect('squat')).toBeNull()
})
it('enriches select with focused target and resets focus/candidate on loss',()=>{
  const store=new GestureStore(),events:unknown[]=[],callback=vi.fn()
  store.subscribe(callback);store.connect(event=>{events.push(event)})
  store.setAppState({...INITIAL_STATE,mode:'MENU'})
  const remove=store.registry.register('bodyweight-squat',target())
  store.emit({type:'cursor.moved',at:0,x:150,y:150})
  store.emit({type:'gesture.confirmed',at:100,command:'select'})
  expect(events).toContainEqual({type:'gesture.confirmed',at:100,command:'select',targetId:'bodyweight-squat'})
  store.emit({type:'gesture.candidate',at:200,command:'confirm',progress:2})
  expect(store.getSnapshot().progress).toBe(1)
  store.emit({type:'tracking.lost',at:300,target:'hand'})
  expect(store.getSnapshot()).toMatchObject({hand:false,focused:null,candidate:null,progress:0})
  store.emit({type:'gesture.confirmed',at:400,command:'select'})
  expect(events.at(-1)).toMatchObject({targetId:undefined})
  remove()
})
it('cursor movement does not publish React snapshots on every frame',()=>{
  const store=new GestureStore(),callback=vi.fn()
  store.subscribe(callback)
  for(let at=0;at<100;at++) store.emit({type:'cursor.moved',at,x:at,y:at})
  expect(callback).not.toHaveBeenCalled()
  expect(store.cursor).toMatchObject({x:99,y:99})
})
it('fake mode requires both development and an explicit query parameter',()=>{
  expect(fakeVisionEnabled(false,'?fakeVision=1')).toBe(false)
  expect(fakeVisionEnabled(true,'')).toBe(false)
  expect(fakeVisionEnabled(true,'?fakeVision=0')).toBe(false)
  expect(fakeVisionEnabled(true,'?fakeVision=1')).toBe(true)
})
