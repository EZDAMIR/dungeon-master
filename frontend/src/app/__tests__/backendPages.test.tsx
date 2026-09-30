import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GestureNavigationProvider } from '../../features/gesture-navigation/GestureNavigationProvider'
import { useGestureStore } from '../../features/gesture-navigation/gestureNavigation'
import type { GestureStore } from '../../features/gesture-navigation/gestureStore'
import { ProfilePage } from '../../pages/ProfilePage'
import { ProgressPage } from '../../pages/ProgressPage'
import { PlanPage } from '../../pages/PlanPage'
import { BackendBadge } from '../../shared/components/BackendBadge'
import { appReducer, INITIAL_STATE } from '../modes'
import { mapVisionEvent } from '../visionEventMapper'
import { todayPlanLabel } from '../../features/profile/planSchedule'
import { defaultProfile } from '../../store/backend'
import type { ProfileUpdate, Progress, TrainingPlan } from '../../api/types'
let root:Root,container:HTMLDivElement,store:GestureStore
function Capture(){const instance=useGestureStore();useLayoutEffect(()=>{store=instance},[instance]);return null}
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)})
afterEach(()=>{act(()=>root.unmount());container.remove();vi.unstubAllGlobals()})
function select(targetId:string){act(()=>store.emit({type:'gesture.confirmed',command:'select',targetId,at:1000}))}
it('edits every primary profile field and saves a full profile using semantic gesture targets',async()=>{
  const save=vi.fn<(profile:ProfileUpdate)=>Promise<void>>().mockResolvedValue(),back=vi.fn(),state={...INITIAL_STATE,mode:'PROFILE' as const}
  act(()=>root.render(<GestureNavigationProvider state={state} onEvent={()=>state}><Capture/><ProfilePage profile={defaultProfile()} message="" onSave={save} onBack={back}/></GestureNavigationProvider>))
  select('goal-mobility');select('profile-next');select('experience-intermediate');select('profile-next');select('days-plus');select('profile-next');select('duration-30');select('profile-next');select('equipment-dumbbells');select('profile-next');select('constraint-no_high_impact')
  expect(container.textContent).toContain('не являются медицинским диагнозом')
  await act(async()=>select('profile-save'))
  expect(save).toHaveBeenCalledWith(expect.objectContaining({goal:'mobility',experience_level:'intermediate',days_per_week:4,session_minutes:30,equipment:['dumbbells'],confirmed_constraints:['no_high_impact']}))
  expect(Object.keys(save.mock.calls[0][0])).toHaveLength(8)
  select('profile-back');expect(back).toHaveBeenCalledOnce()
})
it('renders real progress, cached label, error bars and gesture retry/back',()=>{
  const progress:Progress={completed_sessions:4,total_reps:20,accepted_reps:16,rejected_reps:4,acceptance_rate:.8,error_counts:{depth_insufficient:2,too_fast:2,incomplete_extension:0},recent_sessions:[{id:'session',exercise_key:'bodyweight_squat',completed_at:'2026-09-30T00:00:00Z',total_reps:5,accepted_reps:4,duration_ms:26000,dominant_error:'too_fast'}]}
  const retry=vi.fn(),back=vi.fn(),state={...INITIAL_STATE,mode:'PROGRESS' as const}
  act(()=>root.render(<GestureNavigationProvider state={state} onEvent={()=>state}><Capture/><ProgressPage progress={progress} cached pending={1} onRetry={retry} onBack={back}/></GestureNavigationProvider>))
  expect(container.textContent).toContain('80%');expect(container.textContent).toContain('Сохранённая копия')
  expect(container.querySelectorAll('[role="meter"]')).toHaveLength(3)
  select('progress-retry');select('progress-back');expect(retry).toHaveBeenCalledOnce();expect(back).toHaveBeenCalledOnce()
  act(()=>root.render(<GestureNavigationProvider state={state} onEvent={()=>state}><ProgressPage progress={null} cached={false} pending={0} onRetry={retry} onBack={back}/></GestureNavigationProvider>))
  expect(container.textContent).toContain('После первой сохранённой тренировки')
})
it('uses the existing mapper for navigation and selects hand mode for all backend pages',()=>{
  const menu={...INITIAL_STATE,mode:'MENU' as const},tutorial={step:0,handFound:false,handSince:null}
  for(const [targetId,mode] of [['open-profile','PROFILE'],['open-plan','PLAN'],['open-progress','PROGRESS']] as const){
    const action=mapVisionEvent({type:'gesture.confirmed',command:'select',targetId,at:1},menu,tutorial)!
    const next=appReducer(menu,action);expect(next.mode).toBe(mode)
    const back=mapVisionEvent({type:'gesture.confirmed',command:'back',at:2},next,tutorial)!
    expect(appReducer(next,back).mode).toBe('MENU')
    expect(appReducer(next,{type:'COUNTDOWN_DONE'})).toBe(next)
  }
})
it('renders weekly plan and invokes regeneration through a gesture without inferring exercises',async()=>{
  const plan={id:'plan',starts_on:'2026-09-28',rationale:'Controlled practice',items:[{id:'item',exercise_id:'squat',exercise:{name:'Bodyweight Squat'},day_index:2,sets:1,target_reps:5,rest_seconds:60}]} as TrainingPlan
  const generate=vi.fn<()=>Promise<void>>().mockResolvedValue(),back=vi.fn(),profile=vi.fn(),state={...INITIAL_STATE,mode:'PLAN' as const}
  act(()=>root.render(<GestureNavigationProvider state={state} onEvent={()=>state}><Capture/><PlanPage plan={plan} message={null} onGenerate={generate} onBack={back} onProfile={profile}/></GestureNavigationProvider>))
  expect(container.textContent).toContain('Среда');expect(container.textContent).toContain('1 × 5')
  await act(async()=>select('plan-generate'));expect(generate).toHaveBeenCalledOnce()
  select('plan-profile');select('plan-back');expect(profile).toHaveBeenCalledOnce();expect(back).toHaveBeenCalledOnce()
  expect(todayPlanLabel(plan,'Asia/Almaty',new Date('2026-09-30T00:00:00Z'))).toContain('1 × 5')
  expect(todayPlanLabel(plan,'Asia/Almaty',new Date('2026-10-01T00:00:00Z'))).toBe('На сегодня подходов нет')
  expect(todayPlanLabel(null,'Asia/Almaty')).toContain('подключении')
})
it('shows unobtrusive backend states',()=>{
  for(const [status,pending,label] of [['online',0,'Сохранено'],['offline',0,'Локальный режим'],['syncing',1,'Прогресс сохраняется'],['error',1,'Ожидает синхронизации']] as const){
    act(()=>root.render(<BackendBadge status={status} pending={pending}/>));expect(container.textContent).toBe(label)
  }
})
