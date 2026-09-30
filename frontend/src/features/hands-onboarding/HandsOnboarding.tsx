import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GestureTarget } from '../gesture-navigation/GestureTarget'
import { GestureCursor } from '../gesture-navigation/GestureCursor'
import { useGestureSnapshot } from '../gesture-navigation/gestureNavigation'
import { InputSettings } from '../input-settings/InputSettings'
import { inputPreferences, useInputPreferences, type InputPreferencesV1 } from '../input-settings/preferences'
import type { HandsRuntimeAdapter } from './runtimeAdapter'
import './handsOnboarding.css'
export type HandsIntroExit = {mode:'hands'|'mouse';preferences:InputPreferencesV1;outcome:'calibrated'|'default'|'skipped'}
export interface HandsOnboardingProps {open:boolean;runtime:HandsRuntimeAdapter;onComplete(result:HandsIntroExit):void;onUseMouse():void;onTrustedInteraction?():void;preview?:ReactNode}
type Stage = 'INTRO'|'REQUESTING_CAMERA'|'WAITING_FOR_HAND'|'CURSOR_SETUP'|'TARGET_PRACTICE'|'COMPLETE'
export function HandsOnboarding(props:HandsOnboardingProps) { return props.open ? <HandsOnboardingDialog {...props}/> : null }
function HandsOnboardingDialog(props:HandsOnboardingProps) {
 const {open,runtime,preview} = props
 const [stage,setStage] = useState<Stage>('INTRO'), [practice,setPractice] = useState(0), [slow,setSlow] = useState(false)
 const [waitingRelease,setWaitingRelease] = useState(false)
 const pending = useRef<HandsIntroExit['outcome']|null>(null), completed = useRef(false)
 const root = useRef<HTMLDivElement>(null), callbacks = useRef(props)
 useLayoutEffect(()=>{callbacks.current=props},[props])
 const gesture = useGestureSnapshot(), {preferences} = useInputPreferences()
 const finish = useCallback((mode:HandsIntroExit['mode'],outcome:HandsIntroExit['outcome']) => {
  if(completed.current) return
  completed.current=true;pending.current=null;setWaitingRelease(false);runtime.requireNeutralRelease()
  inputPreferences.set({mode,onboardingCompleted:true});setStage('COMPLETE')
  if(mode==='mouse'){runtime.stop();callbacks.current.onUseMouse()}
  callbacks.current.onComplete({mode,preferences:inputPreferences.getSnapshot().preferences,outcome})
 },[runtime])
 const completeHands = (source:'hands'|'physical'|undefined,outcome:HandsIntroExit['outcome']) => {
  if(source==='hands'){pending.current=outcome;setWaitingRelease(true)}else finish('hands',outcome)
 }
 useEffect(()=>{
  if(!open)return
  const element=root.current!;runtime.setScope(element);runtime.requireNeutralRelease()
  const previous=document.activeElement as HTMLElement|null
  const siblings=Array.from(document.body.children).filter(child=>child!==element) as HTMLElement[]
  const old=siblings.map(child=>child.inert);siblings.forEach(child=>{child.inert=true})
  element.querySelector<HTMLButtonElement>('button')?.focus()
  const remove=runtime.subscribeEvents(event=>{
   if(event.type==='tracking.acquired')setStage(current=>current==='WAITING_FOR_HAND'||current==='REQUESTING_CAMERA'?'CURSOR_SETUP':current)
   if(event.type==='camera.ready')setStage(current=>current==='REQUESTING_CAMERA'?'WAITING_FOR_HAND':current)
   if(pending.current && event.type==='gesture.cancelled' && event.command==='select')finish('hands',pending.current)
  })
  const unsubscribe=inputPreferences.subscribe(()=>runtime.configureInput())
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();finish('mouse','skipped')}
   if(event.key==='Tab'){
    const controls=Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'))
    const first=controls[0],last=controls.at(-1)
    if(event.shiftKey && (document.activeElement===first || !element.contains(document.activeElement))){event.preventDefault();last?.focus()}
    else if(!event.shiftKey && (document.activeElement===last || !element.contains(document.activeElement))){event.preventDefault();first?.focus()}
   }
  }
  element.addEventListener('keydown',keydown)
  return ()=>{remove();unsubscribe();runtime.setScope(null);runtime.requireNeutralRelease();siblings.forEach((child,index)=>{child.inert=old[index]});element.removeEventListener('keydown',keydown);previous?.focus()}
 // Lifecycle follows the stable adapter and open flag, callbacks remain current.
 },[open,runtime,finish])
 useEffect(()=>{
  if(stage!=='REQUESTING_CAMERA')return
  const timer=setTimeout(()=>setSlow(true),12000);return()=>clearTimeout(timer)
 },[stage])
 if(!open)return null
 const request=()=>{callbacks.current.onTrustedInteraction?.();setStage('REQUESTING_CAMERA');setSlow(false);void runtime.start()}
 const retry=()=>{runtime.stop();request()}
 return createPortal(<div ref={root} className="hands-intro" role="dialog" aria-modal="true" aria-labelledby="hands-title" data-stage={stage}>
  <GestureCursor/>
  <div className="hands-content"><small>DUNGEON MASTER · УПРАВЛЕНИЕ</small>
   <h1 id="hands-title">Твои руки — твой курсор</h1>
   <p>Управляй сайтом без мыши: наведи указательный палец на кнопку и соедини его с большим пальцем, чтобы выбрать. Большой палец вверх — подтвердить, кулак — назад. Сейчас включим камеру и подстроим чувствительность под тебя.</p>
   <p>Мышь остаётся запасным вариантом. Видео обрабатывается на устройстве.</p>
   {stage==='INTRO'? <><svg className="hands-illustration" viewBox="0 0 200 150" aria-hidden="true"><circle cx="100" cy="75" r="65" fill="#d9f36f"/><path d="M68 112V70c0-12 14-12 14 0V36c0-15 16-15 16 0v45l18-25c8-12 21-4 14 8l-25 48z" fill="#282a28"/><circle cx="136" cy="33" r="8" fill="#282a28"/></svg><button className="hands-primary" onClick={request}>Включить управление руками</button></>:
   <><div className="hands-live">{preview}<p role="status" aria-live="polite">{gesture.camera==='error'?gesture.error:gesture.hand?'Рука найдена':gesture.camera==='ready'?'Камера готова. Покажи кисть перед камерой.':'Включаем камеру…'}</p></div>
    {(gesture.camera==='error'||slow)&&<div className="hands-recovery"><p>{slow?'Камера запускается дольше обычного. Проверь разрешение браузера или попробуй ещё раз.':gesture.error}</p><button onClick={retry}>Повторить запуск камеры</button></div>}
    {(stage==='CURSOR_SETUP'||stage==='TARGET_PRACTICE')&&<><InputSettings/>
     {stage==='CURSOR_SETUP'?<GestureTarget id="hands-practice-start" onSelect={()=>setStage('TARGET_PRACTICE')}>Проверить жесты</GestureTarget>:<div className="hands-practice"><p>Выбери цель щипком: {practice}/3. Клик мышью не считается проверкой жеста.</p><div className="hands-actions">{[0,1,2].map(index=><GestureTarget id={`hands-practice-${index}`} key={index} disabled={index!==practice} onSelect={source=>{if(source==='hands')setPractice(value=>Math.min(3,value+1))}}>{index<practice?'✓':`Цель ${index+1}`}</GestureTarget>)}</div></div>}
     <GestureTarget id="hands-done" onSelect={source=>completeHands(source,practice===3?'calibrated':'default')}>Готово — управлять руками</GestureTarget>
    </>}
    {gesture.camera==='ready'&&<GestureTarget id="hands-default" onSelect={source=>completeHands(source,'default')}>Использовать стандартные настройки</GestureTarget>}
    {waitingRelease&&<p role="status">Разъедини пальцы перед переходом к следующему экрану.</p>}
   </>}
   <button className="hands-mouse" onClick={()=>{callbacks.current.onTrustedInteraction?.();finish('mouse','skipped')}}>Продолжить с мышью</button>
   {stage!=='INTRO'&&<small>Чувствительность: {Math.round(preferences.sensitivity*100)}% · Калибровка тела будет перед упражнением.</small>}
  </div>
 </div>,document.body)
}
