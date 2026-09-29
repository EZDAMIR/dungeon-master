import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
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
import { RealVisionSource, poseStage } from '../features/workout/RealVisionSource'
import { PoseDebugPanel } from '../features/workout/PoseDebugPanel'
import { FakePoseControls } from '../features/workout/FakePoseControls'
import type { AppState } from './modes'
import { CameraStage } from '../shared/components/CameraStage'
import { CameraPermissionView } from '../shared/components/CameraPermissionView'
import { CameraErrorView } from '../shared/components/CameraErrorView'
import { WorkoutAudio } from '../audio/workoutAudio'
import type { VisionEvent } from '../types/vision'
import type { TutorialState } from '../features/onboarding/tutorialMachine'

function CameraExperience({fake,audio,state}:{fake:boolean;audio:WorkoutAudio;state:AppState}) {
  const video=useRef<HTMLVideoElement|null>(null)
  const source=useRef<RealVisionSource|null>(null)
  const store=useGestureStore(),snapshot=useGestureSnapshot()
  const onVideo=useCallback((element:HTMLVideoElement|null)=>{video.current=element},[])
  useLayoutEffect(()=>source.current?.setMode(state.mode),[state.mode])
  const start=()=>{
    void audio.enable()
    if (fake) { store.emit({type:'camera.ready',at:store.replayClock.read()});return }
    if (!video.current) return
    source.current?.dispose()
    source.current=new RealVisionSource(video.current,store.emit,store.raw,undefined,store.poseRaw)
    source.current.setMode(state.mode)
    void source.current.start()
  }
  return <>
    {!fake && <CameraStage onVideo={onVideo} sourceRef={source} guide={!!poseStage(state.mode)} />}
    {snapshot.camera==='error' && snapshot.error ? <CameraErrorView message={snapshot.error} onRetry={start} /> : snapshot.camera!=='ready' && <CameraPermissionView onStart={start} loading={snapshot.camera==='loading'} />}
    {import.meta.env.DEV && fake && <FakeSource />}
    {import.meta.env.DEV && fake && <FakePoseControls mode={state.mode}/>}
    {import.meta.env.DEV && poseStage(state.mode) && <PoseDebugPanel/>}
    {!poseStage(state.mode) && <><GestureHud /><GestureCursor /></>}
  </>
}
export function App() {
  const [state,dispatch]=useReducer(appReducer,INITIAL_STATE)
  const current=useRef(state)
  const [audio]=useState(()=>new WorkoutAudio())
  const fake=fakeVisionEnabled(import.meta.env.DEV,window.location.search)
  useEffect(()=>()=>audio.close(),[audio])
  const send=useCallback((action:AppAction)=>{current.current=appReducer(current.current,action);dispatch(action)},[])
  const onEvent=useCallback((event:VisionEvent,tutorial:TutorialState)=>{
    const action=mapVisionEvent(event,current.current,tutorial)
    if(action) send(action)
    audio.event(event)
    return current.current
  },[send,audio])
  const storePause=(type:'workout.paused'|'workout.resumed')=>onEvent({type,at:performance.now()},{step:0,handFound:false,handSince:null})
  return <GestureNavigationProvider state={state} onEvent={onEvent}>
    <div className="app-shell"><header><strong>Dungeon Master</strong><code>{state.mode}</code></header>
      <div className="experience"><div className="camera-column"><CameraExperience fake={fake} audio={audio} state={state} /></div>
        <main>
          {state.mode==='TUTORIAL' && <TutorialPage onDone={()=>send({type:'TUTORIAL_DONE'})} />}
          {state.mode==='MENU' && <MenuPage selectedWorkoutId={state.selectedWorkoutId} onSelect={()=>send({type:'SELECT_WORKOUT',workoutId:'bodyweight-squat'})} onConfirm={()=>send({type:'CONFIRM_SELECTION'})} onBack={()=>send({type:'BACK'})} />}
          {state.mode==='CALIBRATION' && <CalibrationPage view={state.workout} onBack={()=>send({type:'BACK'})} />}
          {state.mode==='COUNTDOWN' && <CountdownPage count={state.workout.countdown} />}
          {(state.mode==='WORKOUT'||state.mode==='PAUSED') && <WorkoutPage view={state.workout} paused={state.mode==='PAUSED'} onPause={()=>storePause('workout.paused')} onResume={()=>storePause('workout.resumed')} />}
          {state.mode==='RESULTS' && state.workoutResult && <ResultsPage result={state.workoutResult} onRepeat={()=>send({type:'REPEAT'})} onMenu={()=>send({type:'MENU'})} />}
        </main>
      </div>
      <footer className="privacy-notice">Видео обрабатывается локально. Кадры не отправляются, запись камеры не ведётся. Общая fitness feedback не заменяет тренера или врача.</footer>
      <label><input type="checkbox" onChange={event=>{audio.setMuted(event.target.checked)}}/> Без звука</label>
    </div>
  </GestureNavigationProvider>
}
