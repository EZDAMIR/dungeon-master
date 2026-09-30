import { useTranslation } from '../shared/uiLanguage'
import { LanguageSwitcher } from '../features/gesture-navigation/LanguageSwitcher'
import { UiLanguageProvider } from './UiLanguageProvider'
import { createPortal } from "react-dom";
import { HandsOnboarding, createHandsRuntimeAdapter, type HandsRuntimeAdapter } from "../features/hands-onboarding/public";
import { inputPreferences } from "../features/input-settings/public";
import { WorkoutSessionRunner, WorkoutSessionController, RestView, NextExerciseView, type WorkoutSessionSnapshot } from "../features/workout-session/public";
import { projectSessionSets } from "../store/sessionProjection";
import { SessionResultsPage } from "../pages/SessionResultsPage";
import { MovementPreview } from "../features/personalization/components";
import { initialRouteState, routeUrl } from "./router/routes";
import { useBrowserRoutes } from "./router/useBrowserRoutes";
import { localized } from "../vision/exercises/generic/types";
import type { ActiveExercise } from "../api/aiCoach";
import type { GenericView } from "../vision/exercises/generic/types";
import { ContextFlow } from "../features/personalization/ContextFlow";
import { PlanExperience } from "../features/personalization/PlanExperience";
import { ReadyPrograms } from "../features/personalization/ReadyPrograms";
import { CameraCoachShell } from "../features/personalization/CameraCoachShell";
import { zeroLegacyErrors } from "../vision/exercises/generic/resultBuilder";
import { browserStorage } from "../store/persistence";
import { readVoiceCache, writeVoiceCache } from "../store/voiceCache";
import { backendStore, type BackendStore } from "../store/backend";
import { useBackend } from "./useBackend";
import type { SessionCreate } from "../api/types";
import { meanMinKneeAngle } from "../features/results/sessionAggregate";
import { BackendBadge } from "../shared/components/BackendBadge";
import { ProfilePage } from "../pages/ProfilePage";
import { PlanPage } from "../pages/PlanPage";
import { ProgressPage } from "../pages/ProgressPage";
import { LandingPage } from "../pages/LandingPage";
import { useMotionRoot, usePageMotion } from "../shared/motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { appReducer, type AppAction, INITIAL_STATE } from "./modes";
import { mapVisionEvent } from "./visionEventMapper";
import { FakeSource } from "./FakeSource";
import { TutorialPage } from "../pages/TutorialPage";
import { MenuPage } from "../pages/MenuPage";
import { CalibrationPage } from "../pages/CalibrationPage";
import { CountdownPage } from "../pages/CountdownPage";
import { WorkoutPage } from "../pages/WorkoutPage";
import { GoogleCallbackPage } from "../pages/GoogleCallbackPage";
import { ResultsPage } from "../pages/ResultsPage";
import { GestureNavigationProvider } from "../features/gesture-navigation/GestureNavigationProvider";
import {
  useGestureSnapshot,
  useGestureStore,
} from "../features/gesture-navigation/gestureNavigation";
import { fakeVisionEnabled } from "./visionMode";
import { GestureCursor } from "../features/gesture-navigation/GestureCursor";
import { GestureHud } from "../features/gesture-navigation/GestureHud";
import { GestureTarget } from "../features/gesture-navigation/GestureTarget";
import { GestureLink } from "../features/gesture-navigation/GestureLink";
import {
  RealVisionSource,
  poseStage,
} from "../features/workout/RealVisionSource";
import { PoseDebugPanel } from "../features/workout/PoseDebugPanel";
import { FakePoseControls } from "../features/workout/FakePoseControls";
import type { AppState } from "./modes";
import { CameraStage } from "../features/workout/CameraStage";
import { CameraPermissionView } from "../shared/components/CameraPermissionView";
import { CameraErrorView } from "../shared/components/CameraErrorView";
import { cueText, cueTexts } from "../audio/cues";
import { AudioCoordinator } from "../audio/audioCoordinator";
import { ReleaseClient, defaultVoice, speechCueRequest, type VoicePreferences } from "../api/release";
import { VoiceSelection } from "../features/voice/VoiceSelection";
import { CoachPanel } from "../features/coach/CoachPanel";
import { SchedulePanel } from "../features/schedule/SchedulePanel";
import { GuidedTour } from "../features/guided-tour/GuidedTour";
import type { GuideEvent } from "../features/guided-tour/guideMachine";
import type { VisionEvent } from "../types/vision";
import type { TutorialState } from "../features/onboarding/tutorialMachine";

class StableHandsAdapter implements HandsRuntimeAdapter {
 private value:HandsRuntimeAdapter|null=null;
 configure(value:HandsRuntimeAdapter){this.value=value}
 start=()=>this.value?.start();stop=()=>this.value?.stop();requireNeutralRelease=()=>this.value?.requireNeutralRelease();setScope=(element:HTMLElement|null)=>this.value?.setScope(element);subscribeEvents=(callback:(event:VisionEvent)=>void)=>this.value?.subscribeEvents(callback)??(()=>{});configureInput=()=>this.value?.configureInput();
}
type WorkoutRuntime = Pick<RealVisionSource, "finishGeneric" | "dispose">;
function CameraExperience({ fake, audio, state, exercise, onSource, onManual, onBack, handsOpen, onHandsDone, runnerControlled, onBindings }: {
 fake:boolean;audio:AudioCoordinator;state:AppState;exercise:ActiveExercise|null;onSource:(source:WorkoutRuntime|null)=>void;onManual:()=>void;onBack:()=>void;handsOpen:boolean;onHandsDone:()=>void;runnerControlled:boolean;onBindings:(adapter:HandsRuntimeAdapter,getSource:()=>RealVisionSource|null,clock:()=>number)=>void;
}) {
  const { language: uiLanguage, translateUi } = useTranslation()

 const video=useRef<HTMLVideoElement|null>(null), source=useRef<RealVisionSource|null>(null);
 const store=useGestureStore(),snapshot=useGestureSnapshot();
 const [host]=useState(()=>document.createElement('div'));
 const normal=useRef<HTMLDivElement|null>(null);
 const props=useRef({state,exercise,handsOpen,runnerControlled});useLayoutEffect(()=>{props.current={state,exercise,handsOpen,runnerControlled}},[state,exercise,handsOpen,runnerControlled]);
 const [runtimeStarted,setRuntimeStarted]=useState(false);
 const onVideo=useCallback((element:HTMLVideoElement|null)=>{video.current=element},[]);
 const stop=useCallback(()=>{source.current?.dispose();source.current=null;onSource(null);setRuntimeStarted(false)},[onSource]);
 const start=useCallback(()=>{
   audio.unlock();
   if(fake){store.emit({type:'camera.ready',at:store.replayClock.read()});return}
   if(!video.current)return;
   if(source.current && store.getSnapshot().camera==='ready'){source.current.setMode(props.current.handsOpen?'MENU':props.current.state.mode);return}
   source.current?.dispose();source.current=new RealVisionSource(video.current,store.emit,store.raw,undefined,store.poseRaw);
   const current=props.current.exercise;
   if(current?.spec)source.current.configureMovement(current.item.exercise_key,current.spec,current.item.target_reps,current.language);
   source.current.configureInput(inputPreferences.getSnapshot().preferences);
   source.current.setMode(props.current.handsOpen?'MENU':props.current.state.mode);
   onSource(source.current);setRuntimeStarted(true);return source.current.start();
 },[audio,fake,store,onSource]);
 const getSource=useCallback(()=>source.current,[]);
 const [adapter]=useState(()=>new StableHandsAdapter());
 useLayoutEffect(()=>adapter.configure(createHandsRuntimeAdapter(store,getSource,start,stop)),[adapter,store,getSource,start,stop]);
 useEffect(()=>{if(!adapter)return;onBindings(adapter,()=>source.current,()=>store.replayClock.read(performance.now()));const remove=inputPreferences.subscribe(adapter.configureInput);store.setPhysicalInteraction(()=>source.current?.requireNeutralRelease());return()=>{remove();store.setPhysicalInteraction(()=>{})}},[adapter,onBindings,store]);
 useLayoutEffect(()=>{if(!runnerControlled && exercise?.spec)source.current?.configureMovement(exercise.item.exercise_key,exercise.spec,exercise.item.target_reps,exercise.language)},[exercise,runnerControlled]);
 useLayoutEffect(()=>{if(handsOpen)source.current?.setMode('MENU');else if(!runnerControlled)source.current?.setMode(state.mode)},[state.mode,handsOpen,runnerControlled]);
 const attachNormal=useCallback((element:HTMLDivElement|null)=>{normal.current=element;if(element&&(!props.current.handsOpen||!host.parentNode))element.appendChild(host)},[host]);
 const attachWizard=useCallback((element:HTMLDivElement|null)=>{if(element)element.appendChild(host)},[host]);
 useLayoutEffect(()=>{if(!handsOpen)normal.current?.appendChild(host)},[handsOpen,host]);
 return <>
  {!fake&&createPortal(<CameraStage onVideo={onVideo} sourceRef={source} guide={!handsOpen&&!!poseStage(state.mode)}/>,host)}
  <div data-guide-target="gesture"><div ref={attachNormal} data-guide-target="camera" className="stable-camera-preview"/></div>
  {adapter&&<HandsOnboarding open={handsOpen} runtime={adapter} onComplete={onHandsDone} onUseMouse={()=>{}} onTrustedInteraction={()=>audio.unlock()} preview={<div ref={attachWizard} className="stable-camera-preview"/>}/>}
  {!handsOpen&&exercise?.item.camera_coaching_mode!=='manual_only'&&(snapshot.camera==='error'&&snapshot.error?<CameraErrorView message={translateUi(snapshot.error)} onRetry={start} onManual={exercise?onManual:undefined} onBack={onBack}/>:!fake&&((!runtimeStarted&&!fake)||snapshot.camera!=='ready')&&<CameraPermissionView onStart={start} loading={snapshot.camera==='loading'} instruction={exercise?.spec?localized(exercise.spec.calibration.messages,uiLanguage):exercise?.item.instruction}/>)}
  {import.meta.env.DEV&&fake&&!exercise&&<FakeSource/>}
  {import.meta.env.DEV&&fake&&exercise&&<MovementPreview title={translateUi(exercise.item.display_name)} label={translateUi("SYNTHETIC REPLAY / ILLUSTRATIVE PREVIEW")}/>}
  {import.meta.env.DEV&&fake&&<FakePoseControls mode={state.mode} exercise={exercise} onSource={onSource}/>}
  {import.meta.env.DEV&&!exercise&&poseStage(state.mode)&&<PoseDebugPanel/>}
  {!handsOpen&&(!poseStage(state.mode)||exercise?.item.camera_coaching_mode==='manual_only')&&<><GestureHud/><GestureCursor/></>}
 </>;
}
export function App({ backend = backendStore }: { backend?: BackendStore }) {
  return <UiLanguageProvider><AppContent backend={backend} /></UiLanguageProvider>
}
function AppContent({ backend }: { backend: BackendStore }) {

  if (window.location.pathname.replace(/\/$/, "").endsWith("/integrations/google/callback")) return <GestureNavigationProvider state={INITIAL_STATE} onEvent={() => INITIAL_STATE}><div className="app-header"><LanguageSwitcher /></div><GoogleCallbackPage /></GestureNavigationProvider>;
  return <DungeonMasterApp backend={backend} />;
}
function DungeonMasterApp({ backend }: { backend: BackendStore }) {
  const { language: uiLanguage, translateUi } = useTranslation()

  useMotionRoot();
  const main = useRef<HTMLElement | null>(null);
  const remote = useBackend(backend);
  const session = useRef<SessionCreate | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const pendingResult = useRef<{
    start: SessionCreate;
    result: NonNullable<AppState["workoutResult"]>;
    angle: number;
  } | null>(null);
  const jury =
    new URLSearchParams(window.location.search).get("juryDemo") === "1";
  const legacyFake =
    fakeVisionEnabled(import.meta.env.DEV, window.location.search) && !jury;
  const [state, dispatch] = useReducer(appReducer, legacyFake, (legacy) =>
    initialRouteState(
      window.location.pathname,
      import.meta.env.BASE_URL,
      legacy,
    ),
  );

  const [handsOpen,setHandsOpen]=useState(!legacyFake && !inputPreferences.getSnapshot().preferences.onboardingCompleted);
  const adapterRef=useRef<HandsRuntimeAdapter|null>(null), realGetter=useRef<()=>RealVisionSource|null>(()=>null), runtimeClock=useRef<()=>number>(()=>performance.now());
  const runnerRef=useRef<WorkoutSessionRunner|null>(null), controllerRef=useRef<WorkoutSessionController|null>(null), runnerRemove=useRef<(()=>void)|null>(null);
  const [sessionSnapshot,setSessionSnapshot]=useState<WorkoutSessionSnapshot|null>(null);
  const [sessionNames,setSessionNames]=useState<Record<string,string>>({});
  const getRealSource=useCallback(()=>realGetter.current(),[]);
  const captureBindings=useCallback((adapter:HandsRuntimeAdapter,getSource:()=>RealVisionSource|null,clock:()=>number)=>{adapterRef.current=adapter;realGetter.current=getSource;runtimeClock.current=clock},[]);
  const source = useRef<WorkoutRuntime | null>(null);
  const captureSource = useCallback((runtime: WorkoutRuntime | null) => {
    source.current = runtime;
    const snap=runnerRef.current?.getSnapshot();
    if(runtime && snap?.current && runtime instanceof RealVisionSource){
      runtime.configureMovement(snap.current.exerciseKey,snap.current.movementSpec,snap.current.reps,snap.current.language??'ru');
      runtime.setMode(snap.current.assessmentMode==='manual'?'MENU':snap.phase==='readiness'?'CALIBRATION':snap.phase==='active'?'WORKOUT':snap.phase==='paused'?'PAUSED':'MENU');
    }
  }, []);
  const [active, setActive] = useState<ActiveExercise | null>(null);
  const activeRef = useRef<ActiveExercise | null>(null);
  const [genericView, setGenericView] = useState<GenericView | null>(null);
  const [voice, setVoice] = useState("Voice muted");
  const current = useRef(state);
  const [audio] = useState(() => {
    const value = new AudioCoordinator();
    value.setMuted(true);
    return value;
  });
  const [release] = useState(() => new ReleaseClient(backend));
  const pendingGreeting = useRef(false);
  const [voiceStorage] = useState(browserStorage);
  const cachedVoice = readVoiceCache(voiceStorage, remote.auth?.user.id ?? null);
  const [voicePreferences, setVoicePreferences] = useState<VoicePreferences>(cachedVoice?.preferences ?? defaultVoice);
  const [voiceOpen, setVoiceOpen] = useState(!legacyFake && !cachedVoice);
  const [voiceEditing, setVoiceEditing] = useState(false);
  const preferenceRequest = useRef<AbortController | null>(null);
  const voiceMutedBeforeSettings = useRef(true);
  const [guideEvent, setGuideEvent] = useState<GuideEvent | undefined>();
  const [guideEnabled, setGuideEnabled] = useState(false);
  const [guideEpoch, setGuideEpoch] = useState(0);
  const audioState = useSyncExternalStore(audio.subscribe, audio.getSnapshot);
  const remoteOwner = remote.auth?.user.id ?? null;
  const remoteConnecting = remote.status === "connecting";
  const loadWorkoutCue = useCallback((cue: string, signal: AbortSignal) => {
    const exercise = activeRef.current;
    return release.speech(speechCueRequest(cue, exercise?.item.exercise_key, exercise?.specRevision), signal);
  }, [release]);
  useEffect(() => {
    if (!remoteOwner || remoteConnecting) return;
    const controller = new AbortController();
    preferenceRequest.current = controller;
    void release.preferences(controller.signal).then(preferences => {
      if (controller.signal.aborted) return;
      setVoicePreferences(preferences);
      if (preferences.revision > 0) { writeVoiceCache(voiceStorage, remoteOwner, preferences, true); }
      if (preferences.revision > 0) setVoiceOpen(false);
      audio.configure(loadWorkoutCue, preferences.language);
      audio.setMuted(!preferences.audio_enabled);
    }).catch(() => {});
    return () => controller.abort();
  }, [release, audio, remoteOwner, remoteConnecting, voiceStorage, loadWorkoutCue]);
  useEffect(() => {
    audio.setExerciseSpec(active?.spec ?? null, active?.specRevision ?? null);
    audio.setScope(`${state.mode}:${voicePreferences.revision}:${active?.item.exercise_key ?? ''}:${active?.specRevision ?? ''}`);
    const cues = state.mode === "PROFILE" ? ["welcome", "context_choice"] : state.mode === "PLAN" ? ["plan_ready", "camera_permission"] : state.mode === "CALIBRATION" ? ["tracking_recovery", "countdown_3", "countdown_2", "countdown_1", "start", "depth_insufficient", "too_fast", "incomplete_extension"] : [];
    const exerciseCues = ['CALIBRATION', 'COUNTDOWN', 'WORKOUT', 'PAUSED'].includes(state.mode) ? audio.exerciseCues() : [];
    void audio.prepare([...exerciseCues, ...cues]);
  }, [audio, state.mode, voicePreferences, active]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) audio.stop(); };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [audio]);
  useEffect(() => {
    if (voiceOpen || !pendingGreeting.current) return;
    pendingGreeting.current = false;
    audio.enqueue({ id: `welcome:${voicePreferences.revision}`, text: cueText("welcome", voicePreferences.language), priority: "guide", load: signal => release.speech({ cue_id: "welcome" }, signal) });
    void audio.prepare(Object.keys(cueTexts));
  }, [audio, release, voiceOpen, voicePreferences]);
  const fake = fakeVisionEnabled(import.meta.env.DEV, window.location.search);
  useEffect(() => () => audio.close(), [audio]);
  const send = useCallback(
    (action: AppAction) => {
      const before = current.current;
      if(runnerRef.current && runnerRef.current.getSnapshot().phase!=='results' && ['NAVIGATE','OPEN_PLAN','OPEN_PROFILE','OPEN_PROGRESS','OPEN_SCHEDULE','MENU'].includes(action.type))runnerRef.current.stop(runtimeClock.current());
      if (
        action.type === "CONFIRM_SELECTION" &&
        before.selectedWorkoutId === "planned-squat" &&
        !backend.getSnapshot().plan
      )
        return before;
      if (
        action.type === "NAVIGATE" &&
        poseStage(action.mode) &&
        before.selectedWorkoutId === "personalized" &&
        (!activeRef.current?.spec ||
          activeRef.current.planId !== backend.getSnapshot().plan?.id)
      )
        action = { type: "NAVIGATE", mode: "PLAN" };
      const next = appReducer(before, action);
      if (action.type === "NAVIGATE") {
        if (poseStage(next.mode)) {
          // CameraExperience switches the existing lease into pose mode.
        } else if (
          ["PROFILE", "PLAN", "PROGRESS", "RESULTS", "SCHEDULE"].includes(next.mode)
        ) {
          // Keep the same camera lease for hand navigation.
        }
        session.current = null;
        setGenericView(null);
      }
      current.current = next;
      dispatch(action);
      if (
        next.mode === "WORKOUT" &&
        before.mode === "COUNTDOWN" &&
        !session.current
      ) {
        session.current = backend.startWorkout(
          activeRef.current?.planId ??
            (before.selectedWorkoutId === "planned-squat"
              ? (backend.getSnapshot().plan?.id ?? null)
              : null),
          activeRef.current ? "generic-v1" : "squat-v1",
        );
        setSessionId(session.current.client_session_id);
      }
      if (action.type === "WORKOUT_DONE" && before.mode === "WORKOUT") {
        const start = session.current ?? backend.startWorkout(null);
        setSessionId(start.client_session_id);
        pendingResult.current = {
          start,
          result: action.result,
          angle: meanMinKneeAngle(before.workout.reps),
        };
      }

      if (
        action.type === "REPEAT" ||
        next.mode === "MENU" ||
        next.mode === "TUTORIAL"
      )
        session.current = null;
      return next;
    },
    [backend],
  );
  const { contextStep, setContextStep, goBack } = useBrowserRoutes(state, send);
  useLayoutEffect(() => {
    document.scrollingElement?.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [state.mode, contextStep]);
  useEffect(() => {
    if (state.mode === "RESULTS" && pendingResult.current) {
      const result = pendingResult.current;
      pendingResult.current = null;
      backend.recordWorkout(result.start, result.result, result.angle);
    }
  }, [state.mode, state.workoutResult, backend]);
  const onEvent = useCallback(
    (event: VisionEvent, tutorial: TutorialState) => {
      if (event.type === "workout.generic_updated") setGenericView(event.view);
      const controlled=runnerRef.current?.getSnapshot().phase !== 'results' && !!runnerRef.current;
      if(controlled)controllerRef.current?.consume(event);
      const action = controlled && ['workout.completed','workout.paused','workout.resumed','calibration.required','pose.tracking_lost'].includes(event.type) ? null : mapVisionEvent(event, current.current, tutorial);
      if (action) send(action);
      if (event.type === "camera.ready") setGuideEvent("camera.ready");
      if (event.type === "gesture.confirmed") setGuideEvent("gesture.success");
      if (event.type === "calibration.completed") setGuideEvent("calibration.completed");
      if (event.type === "workout.countdown") setGuideEvent("countdown.started");
      if (event.type === "workout.countdown_done") setGuideEvent("workout.started");
      if(!voiceOpen && (!controlled || event.type!=="workout.completed"))audio.event(event);
      return current.current;
    },
    [send, audio, voiceOpen],
  );
  const storePause = (type: "workout.paused" | "workout.resumed") =>
    onEvent(
      { type, at: runtimeClock.current() },
      { step: 0, handFound: false, handSince: null },
    );
  const startSession = useCallback((exercises: ActiveExercise[], mode:'full'|'quick-demo'='full') => {
    runnerRemove.current?.();controllerRef.current?.dispose();
    const stable=structuredClone(exercises);setSessionNames(Object.fromEntries(stable.map(ex=>[ex.item.exercise_key,ex.item.display_name])));
    const runner=new WorkoutSessionRunner(stable.map((exercise,index)=>({exerciseId:`${index}:${exercise.item.exercise_key}`,exerciseKey:exercise.item.exercise_key,specRevision:exercise.specRevision??null,movementSpec:exercise.spec,sets:exercise.item.sets,reps:exercise.item.target_reps,restSeconds:exercise.item.rest_seconds,assessmentMode:exercise.spec || exercise.item.exercise_key==='bodyweight_squat'&&exercise.item.camera_coaching_mode!=='manual_only'?'camera':'manual',language:exercise.language})),{mode});
    runnerRef.current=runner;controllerRef.current=new WorkoutSessionController(runner,getRealSource);
    session.current={...backend.startWorkout(stable[0]?.planId??null,'workout-session-v1'),client_session_id:runner.getSnapshot().clientSessionId};setSessionId(session.current.client_session_id);
    let previousPhase='',previousSet='',saved=false;
    const update=()=>{
      const snap=runner.getSnapshot();setSessionSnapshot(snap);
      const set=snap.current?.clientSetId??'',changedSet=set!==previousSet;
      if(changedSet&&snap.current){const exercise=stable[snap.exerciseIndex];const actual={...exercise,item:{...exercise.item,sets:snap.current.sets,target_reps:snap.current.reps,camera_coaching_mode:snap.current.assessmentMode==='manual'?'manual_only' as const:exercise.item.camera_coaching_mode},spec:snap.current.assessmentMode==='manual'?null:exercise.spec};activeRef.current=actual;setActive(actual);setGenericView(null)}
      if(snap.phase!==previousPhase || changedSet){
        const modes={idle:'PLAN',readiness:'CALIBRATION',active:'WORKOUT',paused:'PAUSED',rest:'REST','next-exercise':'NEXT_SET',results:'RESULTS'} as const;
        send({type:'SESSION_PHASE',mode:modes[snap.phase],reset:changedSet});
        if(snap.phase==='rest')setGuideEvent('rest.started');
        if(snap.phase==='results')setGuideEvent('results.opened');
        const cue=snap.phase==='rest'?'rest':snap.phase==='next-exercise'?'next_exercise':snap.phase==='results'?'workout_complete':null;
        if(cue)audio.enqueue({id:`session:${snap.clientSessionId}:${set}:${snap.phase}`,text:cueText(cue,voicePreferences.language),priority:'guide',load:signal=>release.speech({cue_id:cue},signal)});
      }
      previousPhase=snap.phase;previousSet=set;
      if(snap.phase==='results'&&!saved){saved=true;const measured=projectSessionSets(snap.sets);if(measured.length&&session.current)backend.recordSets(session.current,measured)}
    };
    runnerRemove.current=runner.subscribe(update);runner.start(runtimeClock.current());
  },[audio,backend,getRealSource,release,send,voicePreferences.language]);
  const startExercise=(exercise:ActiveExercise)=>startSession([exercise]);
  useEffect(()=>{
    const tick=setInterval(()=>controllerRef.current?.tick(runtimeClock.current()),250);
    const visibility=()=>controllerRef.current?.setVisible(!document.hidden,runtimeClock.current());document.addEventListener('visibilitychange',visibility);
    return()=>{clearInterval(tick);document.removeEventListener('visibilitychange',visibility);runnerRemove.current?.();controllerRef.current?.dispose()};
  },[]);
  const finishExercise = (seconds = 0) => {
    if(runnerRef.current && runnerRef.current.getSnapshot().phase!=='results'){
      const runner=runnerRef.current;
      if(runner.getSnapshot().current?.assessmentMode==='manual')runner.completeManual(runtimeClock.current());else runner.stop(runtimeClock.current());
      return;
    }
    const exercise = activeRef.current;
    if (!exercise) return;
    const result = source.current?.finishGeneric() ?? {
      exerciseKey: exercise.item.exercise_key,
      targetReps: exercise.item.target_reps,
      totalReps: 0,
      acceptedReps: 0,
      rejectedReps: 0,
      durationMs: seconds * 1000,
      meanRepDurationMs: 0,
      errorCounts: zeroLegacyErrors(),
      genericErrorCounts: {},
      engineVersion: "manual-v1" as const,
    };
    if (current.current.mode === "PAUSED") send({ type: "RESUME" });
    send({ type: "WORKOUT_DONE", result });
    source.current?.dispose();
    source.current = null;
  };
  const toggleVoice = () => {
    const muted = !audio.isMuted();
    audio.setMuted(muted);
    if (!muted) void audio.enable();
    setVoice(audio.status());
  };
  const openVoiceSettings = () => {
    preferenceRequest.current?.abort();
    voiceMutedBeforeSettings.current = audio.isMuted();
    if (runnerRef.current) runnerRef.current.pause(runtimeClock.current());
    else if (current.current.mode === 'WORKOUT') storePause('workout.paused');
    audio.stop(); setVoiceEditing(true); setVoiceOpen(true);
  };
  const closeVoiceSettings = () => {
    audio.configure(loadWorkoutCue, voicePreferences.language);
    audio.setMuted(voiceMutedBeforeSettings.current);
    setVoice(audio.status()); setVoiceOpen(false); setVoiceEditing(false);
  };
  const landing = state.mode === "LANDING";
  usePageMotion(main, `${state.mode}:${contextStep}`);
  const visibleHands = handsOpen && !landing && state.mode !== 'PLAN' && !voiceEditing;
  const planning = ["PROFILE", "PLAN", "PROGRESS", "RESULTS", "SCHEDULE"].includes(
    state.mode,
  );
  const inWorkout = !!poseStage(state.mode);
  const runnerActive=!!sessionSnapshot && sessionSnapshot.phase!=="results";
  const measuredSets=sessionSnapshot?projectSessionSets(sessionSnapshot.sets):[];
  const planningLinks = [
    { id: "nav-plan", mode: "PLAN", action: "OPEN_PLAN", label: "Your plan" },
    { id: "nav-progress", mode: "PROGRESS", action: "OPEN_PROGRESS", label: "Progress" },
    { id: "nav-profile", mode: "PROFILE", action: "OPEN_PROFILE", label: "Your context" },
    { id: "nav-schedule", mode: "SCHEDULE", action: "OPEN_SCHEDULE", label: "Расписание" },
  ] as const;
  const headerLinks = landing ? [planningLinks[0], { id: "nav-routines", mode: "PLAN", action: "OPEN_PLAN", label: "Routines" } as const, planningLinks[1], planningLinks[2]] : planningLinks;
  return (
    <GestureNavigationProvider state={state} onEvent={onEvent}>
      <div className={`app-shell ${landing ? "landing-shell" : ""} ${inWorkout ? "workout-shell" : ""} ${["WORKOUT","PAUSED"].includes(state.mode)?"workout-active":""}`}>
        <header className="app-header">
          <GestureLink id="nav-home" className="brand" href={routeUrl("LANDING", "intake", import.meta.env.BASE_URL, window.location.search)} current={landing} onSelect={() => send({ type: "NAVIGATE", mode: "LANDING" })}>
            <img src={`${import.meta.env.BASE_URL}design/dm-mark.svg`} alt={translateUi("")} width="36" height="36"/>{translateUi("DUNGEON MASTER")}</GestureLink>
          {(planning || landing) && (
            <nav className="planning-nav" data-guide-target="navigation" aria-label={translateUi("Разделы сайта")}>
              {headerLinks.map((link) => (
                <GestureLink
                  key={link.id}
                  id={link.id}
                  href={routeUrl(
                    link.mode,
                    "intake",
                    import.meta.env.BASE_URL,
                    window.location.search,
                  )}
                  current={state.mode === link.mode}
                  onSelect={() => {
                    if (state.mode === "PROFILE" && link.mode === "PROFILE")
                      setContextStep("intake");
                    send({ type: link.action });
                  }}
                >
                  {translateUi(link.label)}
                </GestureLink>
              ))}
            </nav>
          )}
          {landing && <>
            <div className="header-actions"><GestureTarget id="nav-demo-profiles" onSelect={() => {
              const url = new URL(window.location.href); url.searchParams.set("juryDemo", "1"); window.history.replaceState(null, "", url.pathname + url.search + url.hash); send({ type: "OPEN_PROFILE" });
            }}>{translateUi("Demo profiles")}</GestureTarget><GestureTarget id="nav-settings" className="dm-ghost" onSelect={() => { setHandsOpen(true); send({ type: "OPEN_PROFILE" }); }}>{translateUi("Settings")}</GestureTarget></div>
            <GestureLink id="nav-mobile-context" className="landing-header-context" href={routeUrl("PROFILE", "intake", import.meta.env.BASE_URL, window.location.search)} onSelect={() => send({ type: "OPEN_PROFILE" })}>{translateUi("Context")}</GestureLink>
          </>}
          {!landing && <div className="header-actions back-actions">
            <GestureTarget id="nav-back" className="dm-ghost" ariaLabel={translateUi("Go back")} onSelect={goBack}><span aria-hidden="true">← </span>{translateUi("Go back")}</GestureTarget>
            <span className="header-status">{import.meta.env.DEV && <code>{translateUi(state.mode)}</code>}<BackendBadge status={remote.status} pending={remote.pendingCount} /></span>
          </div>}
          <LanguageSwitcher />
        </header>
        <div className={landing ? "landing-content" : planning ? "planning-content" : "experience"}>
          <div className="camera-column" hidden={landing || planning && !legacyFake && !(inputPreferences.getSnapshot().preferences.mode==="hands" && !handsOpen) || active?.item.camera_coaching_mode==="manual_only" && inputPreferences.getSnapshot().preferences.mode!=="hands"}>

              <CameraExperience
                fake={fake}
                audio={audio}
                state={state}
                exercise={active}
                onSource={captureSource}
                handsOpen={visibleHands}
                onHandsDone={()=>{setHandsOpen(false);if(runnerRef.current?.getSnapshot().phase==='paused')runnerRef.current.resume(runtimeClock.current())}}
                runnerControlled={runnerActive}
                onBindings={captureBindings}
                onManual={() => {
                  if (active) {runnerRef.current?.stop(runtimeClock.current());startExercise({ ...active, item:{...active.item,camera_coaching_mode:"manual_only"},spec: null });}
                }}
                onBack={() => send({ type: "OPEN_PLAN" })}
              />
            </div>
          {active && !active.spec && inWorkout && (
            <div className="camera-column">
              <MovementPreview
                title={translateUi(active.item.display_name)}
                label={translateUi("ILLUSTRATIVE GUIDED MODE / NOT LIVE VIDEO")}
              />
            </div>
          )}
          <main ref={main} data-guide-target={state.mode === "PROFILE" ? "context" : state.mode === "PLAN" ? "plan" : state.mode === "CALIBRATION" ? "calibration" : state.mode === "COUNTDOWN" ? "countdown" : state.mode === "WORKOUT" ? "workout" : state.mode === "RESULTS" ? "results" : state.mode === "PROGRESS" ? "progress" : undefined}>
            {landing && <LandingPage onBuildPlan={() => send({ type: "OPEN_PROFILE" })} onRoutines={() => send({ type: "OPEN_PLAN" })}/>}
            {state.mode === "SCHEDULE" && <SchedulePanel key={`${remoteOwner}:${remoteConnecting}`} client={release} audio={audio} language={uiLanguage} />}
            <GuidedTour key={guideEpoch} audio={audio} client={release} screen={state.mode} event={guideEvent} language={uiLanguage} planReady={!!remote.plan} enabled={guideEnabled && !voiceOpen && !handsOpen && !landing} onDone={() => setGuideEnabled(false)} />
            {state.mode === "TUTORIAL" && (
              <TutorialPage onDone={() => send({ type: "TUTORIAL_DONE" })} />
            )}
            {state.mode === "MENU" && (
              <MenuPage
                selectedWorkoutId={state.selectedWorkoutId}
                onSelect={() =>
                  send({
                    type: "SELECT_WORKOUT",
                    workoutId: "bodyweight-squat",
                  })
                }
                onConfirm={() => send({ type: "CONFIRM_SELECTION" })}
                onBack={() => send({ type: "BACK" })}
                onProfile={() => send({ type: "OPEN_PROFILE" })}
                onPlan={() => send({ type: "OPEN_PLAN" })}
                onProgress={() => send({ type: "OPEN_PROGRESS" })}
                plan={remote.plan}
                planMessage={remote.planMessage}
                onSelectPlan={() =>
                  send({ type: "SELECT_WORKOUT", workoutId: "planned-squat" })
                }
                timezone={remote.profile.timezone}
              />
            )}
            {state.mode === "PROFILE" && !legacyFake && (
              <ContextFlow
                backend={backend}
                remote={remote}
                jury={jury}
                step={contextStep}
                onStepChange={setContextStep}
                onPlan={() => send({ type: "OPEN_PLAN" })}
                onBack={() => send({ type: "BACK" })}
              />
            )}
            {state.mode === "PROFILE" && legacyFake && (
              <ProfilePage
                profile={remote.profile}
                message={translateUi(remote.profileMessage)}
                onSave={(profile) => backend.saveProfile(profile)}
                onBack={() => send({ type: "BACK" })}
              />
            )}
            {state.mode === 'PLAN' && <ReadyPrograms backend={backend} onPlan={() => send({ type: 'OPEN_PLAN' })} onPersonalize={() => send({ type: 'OPEN_PROFILE' })} />}
            {state.mode === "PLAN" &&
              remote.plan?.ai_metadata &&
              remote.plan.ai_metadata.status !== "fallback" && (
                <PlanExperience
                  plan={remote.plan.ai_metadata}
                  planId={remote.plan.id}
                  backend={backend}
                  onStart={startExercise}
                  onStartSession={exercises=>startSession(exercises)}
                  onQuickDemo={exercise=>startSession([exercise],"quick-demo")}
                  onContext={() => send({ type: "OPEN_PROFILE" })}
                  onDetails={() => setGuideEvent("exercise.opened")}
                />
              )}
            {state.mode === "PLAN" &&
              remote.plan?.ai_metadata?.status === "fallback" && (
                <p className="dm-status" role="status">
                  {translateUi(remote.plan.ai_metadata.message)}
                </p>
              )}
            {state.mode === "PLAN" &&
              (!remote.plan?.ai_metadata ||
                remote.plan.ai_metadata.status === "fallback") && (
                <PlanPage
                  plan={remote.plan}
                  message={translateUi(remote.planMessage)}
                  onStartDay={day=>{if(!remote.plan)return;startSession(remote.plan.items.filter(item=>item.day_index===day).sort((a,b)=>a.position-b.position).map(item=>({planId:remote.plan!.id,spec:null,language:voicePreferences.language,item:{exercise_key:item.exercise.key,display_name:item.exercise.name,description:item.exercise.name,instruction:'Следуйте инструкции упражнения. Камера оценивает только поддерживаемое движение.',difficulty:item.exercise.difficulty,equipment_codes:item.exercise.equipment_codes,impact_level:item.exercise.impact_level,contraindication_tags:item.exercise.contraindication_tags,camera_angle:item.exercise.camera_angle,sets:item.sets,target_reps:item.target_reps,rest_seconds:item.rest_seconds,tempo_hint:item.tempo_hint??'',reason:'Базовый план',source_references:[],camera_coaching_mode:item.exercise.key==='bodyweight_squat'?'predefined':'manual_only',camera_coaching_status:item.exercise.key==='bodyweight_squat'?'validated':'manual_only',exercise_source:'predefined',detail_available:true,swap_available:false}})))}}
                  onGenerate={() => backend.generate()}
                  onProfile={() => send({ type: "OPEN_PROFILE" })}
                  onBack={() => send({ type: "BACK" })}
                />
              )}
            {state.mode === "PROGRESS" && (
              <ProgressPage
                progress={remote.progress}
                cached={remote.cachedProgress}
                pending={remote.pendingCount}
                onRetry={() => {
                  void backend.retry();
                }}
                onBack={() => send({ type: "BACK" })}
              />
            )}
            {sessionSnapshot && state.mode==='REST' && <div data-guide-target="rest"><RestView snapshot={sessionSnapshot} onNext={()=>runnerRef.current?.next(runtimeClock.current())} onStop={()=>runnerRef.current?.stop(runtimeClock.current())}/></div>}
            {sessionSnapshot && state.mode==='NEXT_SET' && <NextExerciseView snapshot={sessionSnapshot} onNext={()=>runnerRef.current?.next(runtimeClock.current())} onStop={()=>runnerRef.current?.stop(runtimeClock.current())}/>}
            {active && inWorkout && (
              <CameraCoachShell
                key={sessionSnapshot?.current?.clientSetId??'legacy'}
                exercise={active}
                sessionMode={sessionSnapshot?.mode}
                setNumber={(sessionSnapshot?.setIndex??0)+1}
                reps={sessionSnapshot?.currentReps}
                onStop={runnerActive?()=>runnerRef.current?.stop(runtimeClock.current()):undefined}
                view={genericView}
                stage={state.mode}
                countdown={state.workout.countdown}
                onPause={() => storePause("workout.paused")}
                onResume={() => storePause("workout.resumed")}
                onFinish={finishExercise}
                onCancel={()=>runnerActive?runnerRef.current?.stop(runtimeClock.current()):send({type:"OPEN_PLAN"})}
                voice={voice}
                onVoice={toggleVoice}
                onVoiceSettings={openVoiceSettings}
              />
            )}
            {state.mode === "CALIBRATION" && !active && (
              <CalibrationPage
                view={state.workout}
                onBack={() => send({ type: "BACK" })}
              />
            )}
            {state.mode === "COUNTDOWN" && !active && (
              <CountdownPage count={state.workout.countdown} />
            )}
            {(state.mode === "WORKOUT" || state.mode === "PAUSED") &&
              !active && (
                <WorkoutPage
                  view={state.workout}
                  paused={state.mode === "PAUSED"}
                  onPause={() => storePause("workout.paused")}
                  onResume={() => storePause("workout.resumed")}
                />
              )}
            {state.mode==='RESULTS'&&sessionSnapshot?.phase==='results'&&<SessionResultsPage sets={measuredSets} mode={sessionSnapshot.mode} status={sessionSnapshot.status} elapsedMs={sessionSnapshot.elapsedMs} names={sessionNames} syncMessage={remote.lastSavedClientId===sessionSnapshot.clientSessionId?'Сохранено':remote.syncMessage || (remote.pendingCount?'Ожидает синхронизации':'')} onProgress={()=>send({type:'OPEN_PROGRESS'})} onPlan={()=>send({type:'OPEN_PLAN'})} onRetry={()=>{void backend.retry()}}/>}
            {state.mode === "RESULTS" && state.workoutResult && (
              <ResultsPage
                result={state.workoutResult}
                exercise={active?.item.display_name}
                persona={
                  active
                    ? remote.plan?.ai_metadata &&
                      remote.plan.ai_metadata.status !== "fallback"
                      ? remote.plan.ai_metadata.coach_persona.tone
                      : undefined
                    : undefined
                }
                onProgress={() => send({ type: "OPEN_PROGRESS" })}
                onRepeat={() => {
                  if (active) {
                    send({ type: "OPEN_PLAN" });
                    startExercise(active);
                  } else {
                    session.current = null;
                    send({ type: "REPEAT" });
                  }
                }}
                onMenu={() => {
                  activeRef.current = null;
                  setActive(null);
                  send({ type: "MENU" });
                }}
                syncMessage={
                  remote.syncMessage.startsWith("Результат")
                    ? remote.syncMessage
                    : remote.lastSavedClientId === sessionId
                      ? "Сохранено"
                      : remote.pendingCount
                        ? remote.status === "syncing"
                          ? "Прогресс сохраняется"
                          : "Ожидает синхронизации"
                        : remote.syncMessage
                }
                onRetry={() => {
                  void backend.retry();
                }}
              />
            )}
            {planning && !voiceOpen && !handsOpen && <CoachPanel key={state.mode + (remote.auth?.user.id ?? "")} client={release} audio={audio} language={uiLanguage} screen={state.mode === "SCHEDULE" ? "schedule" : state.mode === "RESULTS" ? "results" : "planning"} onAction={(action) => {
              if (action === "open_plan" || action === "open_exercise" || action === "open_camera") send({ type: "OPEN_PLAN" });
              if (action === "open_schedule") send({ type: "OPEN_SCHEDULE" });
              if (action === "open_progress") send({ type: "OPEN_PROGRESS" });
            }} />}
          </main>
        </div>
        {!landing && <><footer className="privacy-notice">{translateUi("Видео обрабатывается локально. Кадры не отправляются, запись камеры не ведётся. Общая fitness feedback не заменяет тренера или врача.")}</footer>
        <div className="audio-status" data-guide-target="audio-controls"><span role="status">{translateUi(audio.status())}</span>
          <GestureTarget id="global-audio-enable" selected={audioState.status !== 'muted'} onSelect={() => { audio.setMuted(false); audio.unlock(); audio.tone(660); setVoice(audio.status()); }}>{translateUi("Включить звук")}</GestureTarget>
          <GestureTarget id="global-audio-stop" onSelect={() => audio.stop()}>{translateUi("Остановить звук")}</GestureTarget>
          <GestureTarget id="global-voice-settings" onSelect={openVoiceSettings}>{translateUi("Голос тренера")}</GestureTarget>
          <GestureTarget id="global-hands-settings" onSelect={() => { if(runnerActive)runnerRef.current?.pause(runtimeClock.current());setHandsOpen(true) }}>{translateUi("Настройки рук")}</GestureTarget>
          <GestureTarget id="global-guide" onSelect={() => { setGuideEpoch(epoch => epoch + 1);setGuideEnabled(true);setGuideEvent("voice.selected") }}>{translateUi("Обучение")}</GestureTarget>
        </div></>}
        {(planning || landing) && !voiceOpen && !visibleHands && <GestureCursor />}
        {audioState.subtitle && <p className="audio-subtitle" aria-live="polite">{translateUi(audioState.subtitle)}</p>}
        {voiceOpen && (voiceEditing || state.mode !== 'PLAN') && !visibleHands && !landing && <VoiceSelection key={`${remoteOwner}:${remoteConnecting}`} client={release} audio={audio} initial={voicePreferences} onClose={closeVoiceSettings} onComplete={(preferences, persisted) => { pendingGreeting.current = !voiceEditing; writeVoiceCache(voiceStorage, remote.auth?.user.id ?? null, preferences, persisted); setVoicePreferences(preferences); audio.configure(loadWorkoutCue, preferences.language); audio.setMuted(!preferences.audio_enabled); setVoiceOpen(false); setVoiceEditing(false); setGuideEnabled(true); setGuideEvent("voice.selected"); setVoice(audio.status()); }} />}
        {!landing && <label>
          <input
            type="checkbox"
            checked={audioState.status === "muted"}
            onChange={(event) => {
              audio.setMuted(event.target.checked);
              setVoice(audio.status());
            }}
          />{translateUi(" ")}{translateUi("Без звука")}</label>}
      </div>
    </GestureNavigationProvider>
  );
}
