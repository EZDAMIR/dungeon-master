import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { appReducer, INITIAL_STATE, type AppAction } from './modes'
import { mapVisionEvent } from './visionEventMapper'
import { FakeSource } from './FakeSource'
import { TutorialPage } from '../pages/TutorialPage'
import { MenuPage } from '../pages/MenuPage'
import { CalibrationPage } from '../pages/CalibrationPage'
import { CountdownPage } from '../pages/CountdownPage'
import { WorkoutPage } from '../pages/WorkoutPage'
import { ResultsPage } from '../pages/ResultsPage'
import { GestureNavigationProvider } from '../features/gesture-navigation/GestureNavigationProvider'
import { useGestureSnapshot, useGestureStore } from '../features/gesture-navigation/gestureNavigation'
import { fakeVisionEnabled } from './visionMode'
import { GestureCursor } from '../features/gesture-navigation/GestureCursor'
import { GestureHud } from '../features/gesture-navigation/GestureHud'
import { RealGestureSource } from '../features/gesture-navigation/RealGestureSource'
import { CameraStage } from '../shared/components/CameraStage'
import { CameraPermissionView } from '../shared/components/CameraPermissionView'
import { CameraErrorView } from '../shared/components/CameraErrorView'
import { GestureAudio } from '../audio/gestureAudio'
import type { VisionEvent } from '../types/vision'
import type { TutorialState } from '../features/onboarding/tutorialMachine'

function CameraExperience({fake,audio}:{fake:boolean;audio:GestureAudio}) {
  const video=useRef<HTMLVideoElement|null>(null)
  const source=useRef<RealGestureSource|null>(null)
  const store=useGestureStore(),snapshot=useGestureSnapshot()
  const onVideo=useCallback((element:HTMLVideoElement|null)=>{video.current=element},[])
  const start=()=>{
    void audio.enable()
    if (fake) { store.emit({type:'camera.ready',at:performance.now()});return }
    if (!video.current) return
    source.current?.dispose()
    source.current=new RealGestureSource(video.current,store.emit,store.raw)
    void source.current.start()
  }
  return <>
    {!fake && <CameraStage onVideo={onVideo} sourceRef={source} />}
    {snapshot.camera==='error' && snapshot.error ? <CameraErrorView message={snapshot.error} onRetry={start} /> : snapshot.camera!=='ready' && <CameraPermissionView onStart={start} loading={snapshot.camera==='loading'} />}
    {import.meta.env.DEV && fake && <FakeSource />}
    <GestureHud /><GestureCursor />
  </>
}
export function App() {
  const [state,dispatch]=useReducer(appReducer,INITIAL_STATE)
  const current=useRef(state)
  const [audio]=useState(()=>new GestureAudio())
  const fake=fakeVisionEnabled(import.meta.env.DEV,window.location.search)
  useEffect(()=>()=>audio.close(),[audio])
  const send=useCallback((action:AppAction)=>{current.current=appReducer(current.current,action);dispatch(action)},[])
  const onEvent=useCallback((event:VisionEvent,tutorial:TutorialState)=>{
    const action=mapVisionEvent(event,current.current,tutorial)
    if(action) send(action)
    audio.event(event)
    return current.current
  },[send,audio])
  return <GestureNavigationProvider state={state} onEvent={onEvent}>
    <div className="app-shell"><header><strong>Dungeon Master</strong><code>{state.mode}</code></header>
      <div className="experience"><div className="camera-column"><CameraExperience fake={fake} audio={audio} /></div>
        <main>
          {state.mode==='TUTORIAL' && <TutorialPage onDone={()=>send({type:'TUTORIAL_DONE'})} />}
          {state.mode==='MENU' && <MenuPage selectedWorkoutId={state.selectedWorkoutId} onSelect={()=>send({type:'SELECT_WORKOUT',workoutId:'bodyweight-squat'})} onConfirm={()=>send({type:'CONFIRM_SELECTION'})} onBack={()=>send({type:'BACK'})} />}
          {state.mode==='CALIBRATION' && <CalibrationPage onBack={()=>send({type:'BACK'})} />}
          {state.mode==='COUNTDOWN' && <CountdownPage onDone={()=>send({type:'COUNTDOWN_DONE'})} />}
          {state.mode==='WORKOUT' && <WorkoutPage onDone={result=>send({type:'WORKOUT_DONE',result})} />}
          {state.mode==='RESULTS' && <ResultsPage result={state.workoutResult??{reps:0,errors:0}} onRestart={()=>send({type:'RESTART'})} />}
        </main>
      </div>
    </div>
  </GestureNavigationProvider>
}
