import { useTranslation, translateUi as translatePreview } from '../../shared/uiLanguage'
import '../../index.css'
import {StrictMode,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {HandsOnboarding} from './HandsOnboarding'
import {NavigationContext} from '../gesture-navigation/gestureNavigation'
import {GestureStore} from '../gesture-navigation/gestureStore'
import {createHandsRuntimeAdapter} from './runtimeAdapter'
import {RestView} from '../workout-session/SessionViews'
import {WorkoutSessionRunner} from '../workout-session/runner'
const store=new GestureStore()
const runner=new WorkoutSessionRunner([{exerciseId:'synthetic',exerciseKey:'bodyweight_squat',specRevision:null,movementSpec:null,sets:2,reps:5,restSeconds:45,assessmentMode:'manual'}])
runner.start(0);runner.completeManual(1000)
const runtime=createHandsRuntimeAdapter(store,()=>null,()=>{store.emit({type:'camera.ready',at:0});store.emit({type:'tracking.acquired',at:1,target:'hand'})},()=>{})
export function Preview(){
  const { translateUi } = useTranslation()
const [open,setOpen]=useState(true);return <NavigationContext.Provider value={store}><p>{translateUi("SYNTHETIC DEV PREVIEW · Не проверяет камеру или распознавание.")}</p><button onClick={()=>setOpen(true)}>{translateUi("Открыть настройку")}</button><HandsOnboarding open={open} runtime={runtime} preview={<div style={{aspectRatio:'16 / 9',maxWidth:340,display:'grid',placeItems:'center',border:'1px solid #d9f36f'}}>{translateUi("SYNTHETIC · без камеры")}</div>} onUseMouse={()=>setOpen(false)} onComplete={()=>setOpen(false)}/><RestView snapshot={runner.getSnapshot()} onNext={()=>{}} onStop={()=>{}}/></NavigationContext.Provider>}
createRoot(document.getElementById('preview-root')!).render(import.meta.env.DEV?<StrictMode><Preview/></StrictMode>:<p>{translatePreview("Preview доступен только в development.")}</p>)
