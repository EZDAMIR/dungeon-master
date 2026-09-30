import {act,StrictMode} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {HandsOnboarding} from './HandsOnboarding'
import {createHandsRuntimeAdapter} from './runtimeAdapter'
import {NavigationContext} from '../gesture-navigation/gestureNavigation'
import {GestureStore} from '../gesture-navigation/gestureStore'
import {GestureTarget} from '../gesture-navigation/GestureTarget'
import {inputPreferences} from '../input-settings/preferences'
import type {RealVisionSource} from '../workout/RealVisionSource'
let root:Root,host:HTMLDivElement
beforeEach(()=>{
 (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn())
 inputPreferences.set({version:1,mode:'mouse',sensitivity:1,smoothingMs:80,onboardingCompleted:false})
 host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(()=>{act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals()})
function setup(strict=false){
 const store=new GestureStore(),source={configureInput:vi.fn(),requireNeutralRelease:vi.fn()} as unknown as RealVisionSource
 const start=vi.fn(),stop=vi.fn(),complete=vi.fn(),mouse=vi.fn(),trusted=vi.fn(),background=vi.fn(),runtime=createHandsRuntimeAdapter(store,()=>source,start,stop)
 act(()=>root.render(<NavigationContext.Provider value={store}>{strict?<StrictMode><HandsOnboarding open runtime={runtime} onComplete={complete} onUseMouse={mouse} onTrustedInteraction={trusted}/></StrictMode>:<HandsOnboarding open runtime={runtime} onComplete={complete} onUseMouse={mouse} onTrustedInteraction={trusted}/>}<GestureTarget id="background" onSelect={background}>Фоновая кнопка</GestureTarget></NavigationContext.Provider>))
 const click=(text:string)=>{const button=Array.from(document.querySelectorAll('button')).find(button=>button.textContent===text);if(!button)throw Error(text);act(()=>button.click())}
 const ready=()=>{click('Включить управление руками');act(()=>{store.emit({type:'camera.ready',at:0});store.emit({type:'tracking.acquired',at:1,target:'hand'})})}
 return {store,source,start,stop,complete,mouse,trusted,background,runtime,click,ready}
}
it('intro precedes permission, real click starts camera once even under StrictMode and cursor is inside modal',()=>{
 const s=setup(true);expect(s.start).not.toHaveBeenCalled();expect(document.querySelector('[role=dialog]')?.textContent).toContain('Твои руки — твой курсор');expect(document.querySelector('[role=dialog] .gesture-cursor')).not.toBeNull();s.click('Включить управление руками');expect(s.start).toHaveBeenCalledOnce();expect(s.trusted).toHaveBeenCalledOnce();expect(s.source.configureInput).toHaveBeenCalled()
})
it('denied camera always has retry and mouse path, with honest skipped outcome',()=>{
 const s=setup();s.click('Включить управление руками');act(()=>s.store.emit({type:'camera.error',at:1,code:'not_allowed',message:'Разреши камеру в настройках сайта'}));expect(document.querySelector('[role=dialog]')?.textContent).toContain('Разреши камеру');s.click('Повторить запуск камеры');expect(s.start).toHaveBeenCalledTimes(2);expect(s.stop).toHaveBeenCalledOnce();s.click('Продолжить с мышью');expect(s.complete).toHaveBeenCalledWith(expect.objectContaining({mode:'mouse',outcome:'skipped'}));expect(s.mouse).toHaveBeenCalledOnce()
})
it('gesture +/- and presets reconfigure real engine without restarting camera; slider remains accessible',()=>{
 const s=setup();s.ready();act(()=>s.store.registry.activate('hands-plus'));expect(inputPreferences.getSnapshot().preferences.sensitivity).toBe(1.1);act(()=>s.store.registry.activate('hands-minus'));expect(inputPreferences.getSnapshot().preferences.sensitivity).toBe(1);act(()=>s.store.registry.activate('hands-preset-1.5'));expect(s.source.configureInput).toHaveBeenLastCalledWith(expect.objectContaining({sensitivity:1.5,smoothingMs:80}));expect(document.querySelector('input')?.getAttribute('aria-valuetext')).toBe('150%');s.click('Сбросить');expect(inputPreferences.getSnapshot().preferences.sensitivity).toBe(1);expect(s.start).toHaveBeenCalledOnce()
})
it('background targets are suppressed and mouse movement cannot create a tracked hand cursor',()=>{
 const s=setup();act(()=>s.store.registry.activate('background'));expect(s.background).not.toHaveBeenCalled();act(()=>document.dispatchEvent(new MouseEvent('mousemove',{clientX:100,clientY:100})));expect(s.store.cursor.visible).toBe(false);expect(s.store.getSnapshot().hand).toBe(false)
})
it('practice counts genuine hand selections, completion waits for release and cannot leak command into App mapper',()=>{
 const s=setup(),mapper=vi.fn();s.store.connect(mapper);s.ready();s.click('Проверить жесты');s.click('Цель 1');expect(document.querySelector('.hands-practice')?.textContent).toContain('0/3');for(let i=0;i<3;i++)act(()=>s.store.registry.activate(`hands-practice-${i}`));act(()=>s.store.registry.activate('hands-done'));expect(s.complete).not.toHaveBeenCalled();expect(document.querySelector('[role=dialog]')?.textContent).toContain('Разъедини пальцы');act(()=>s.store.emit({type:'gesture.cancelled',at:2,command:'select'}));expect(s.complete).toHaveBeenCalledWith(expect.objectContaining({outcome:'calibrated',mode:'hands'}));expect(mapper).not.toHaveBeenCalled();expect(s.stop).not.toHaveBeenCalled();expect(s.source.requireNeutralRelease).toHaveBeenCalled()
})
it('keyboard focus is trapped, Escape switches to mouse and prior focus returns on unmount',()=>{
 const prior=document.createElement('button');document.body.append(prior);prior.focus();const s=setup();const controls=Array.from(document.querySelectorAll<HTMLButtonElement>('[role=dialog] button'));expect(document.activeElement).toBe(controls[0]);act(()=>controls[0].dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})));expect(document.activeElement).toBe(controls.at(-1));act(()=>controls.at(-1)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));expect(s.mouse).toHaveBeenCalledOnce();act(()=>root.render(null));expect(document.activeElement).toBe(prior);expect(prior.inert).toBeFalsy();prior.remove()
})
it('physical completion records default, and closing/unmount does not stop sole hands stream',()=>{
 const s=setup();s.ready();s.click('Готово — управлять руками');expect(s.complete).toHaveBeenCalledWith(expect.objectContaining({outcome:'default',preferences:expect.objectContaining({onboardingCompleted:true,mode:'hands'})}));act(()=>root.render(null));expect(s.stop).not.toHaveBeenCalled();act(()=>s.store.registry.activate('background'));expect(s.background).not.toHaveBeenCalled()
})
