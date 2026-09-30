import {act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import {NavigationContext} from '../gesture-navigation/gestureNavigation'
import {GestureStore} from '../gesture-navigation/gestureStore'
import {RestView,NextExerciseView} from './SessionViews'
import {WorkoutSessionRunner} from './runner'
it('renders monotonic rest and next exercise with shared semantic/physical accessible commands',()=>{
 (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),store=new GestureStore(),next=vi.fn(),stop=vi.fn()
 const runner=new WorkoutSessionRunner([{exerciseId:'manual',exerciseKey:'manual',specRevision:null,movementSpec:null,sets:2,reps:5,restSeconds:45,assessmentMode:'manual'}]);runner.start(0);runner.completeManual(1000);runner.tick(2250)
 act(()=>root.render(<NavigationContext.Provider value={store}><RestView snapshot={runner.getSnapshot()} onNext={next} onStop={stop}/></NavigationContext.Provider>));expect(host.querySelector('[role=timer]')?.textContent).toBe('44 с');act(()=>store.registry.activate('session-next-set'));expect(next).toHaveBeenCalledOnce()
 act(()=>root.render(<NavigationContext.Provider value={store}><NextExerciseView snapshot={runner.getSnapshot()} onNext={next} onStop={stop}/></NavigationContext.Provider>));expect(host.textContent).toContain('1 ПОДХОДОВ СОХРАНЕНО');act(()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Завершить тренировку')!.click());expect(stop).toHaveBeenCalledOnce()
 act(()=>root.unmount());host.remove();vi.unstubAllGlobals()
})
