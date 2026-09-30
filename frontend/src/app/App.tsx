import { MovementPreview } from "../features/personalization/components";
import { initialRouteState, routeUrl } from "./router/routes";
import { useBrowserRoutes } from "./router/useBrowserRoutes";
import { localized } from "../vision/exercises/generic/types";
import type { ActiveExercise } from "../api/aiCoach";
import type { GenericView } from "../vision/exercises/generic/types";
import { ContextFlow } from "../features/personalization/ContextFlow";
import { PlanExperience } from "../features/personalization/PlanExperience";
import { CameraCoachShell } from "../features/personalization/CameraCoachShell";
import { zeroLegacyErrors } from "../vision/exercises/generic/resultBuilder";
import { backendStore, type BackendStore } from "../store/backend";
import { useBackend } from "./useBackend";
import type { SessionCreate } from "../api/types";
import { meanMinKneeAngle } from "../features/results/sessionAggregate";
import { BackendBadge } from "../shared/components/BackendBadge";
import { ProfilePage } from "../pages/ProfilePage";
import { PlanPage } from "../pages/PlanPage";
import { ProgressPage } from "../pages/ProgressPage";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { appReducer, type AppAction } from "./modes";
import { mapVisionEvent } from "./visionEventMapper";
import { FakeSource } from "./FakeSource";
import { TutorialPage } from "../pages/TutorialPage";
import { MenuPage } from "../pages/MenuPage";
import { CalibrationPage } from "../pages/CalibrationPage";
import { CountdownPage } from "../pages/CountdownPage";
import { WorkoutPage } from "../pages/WorkoutPage";
import { ResultsPage } from "../pages/ResultsPage";
import { GestureNavigationProvider } from "../features/gesture-navigation/GestureNavigationProvider";
import {
  useGestureSnapshot,
  useGestureStore,
} from "../features/gesture-navigation/gestureNavigation";
import { fakeVisionEnabled } from "./visionMode";
import { GestureCursor } from "../features/gesture-navigation/GestureCursor";
import { GestureHud } from "../features/gesture-navigation/GestureHud";
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
import { WorkoutAudio } from "../audio/workoutAudio";
import type { VisionEvent } from "../types/vision";
import type { TutorialState } from "../features/onboarding/tutorialMachine";

type WorkoutRuntime = Pick<RealVisionSource, "finishGeneric" | "dispose">;
function CameraExperience({
  fake,
  audio,
  state,
  exercise,
  onSource,
  onManual,
  onBack,
}: {
  fake: boolean;
  audio: WorkoutAudio;
  state: AppState;
  exercise: ActiveExercise | null;
  onSource: (source: WorkoutRuntime | null) => void;
  onManual: () => void;
  onBack: () => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const source = useRef<RealVisionSource | null>(null);
  const store = useGestureStore(),
    snapshot = useGestureSnapshot();
  const [runtimeStarted, setRuntimeStarted] = useState(false);
  const onVideo = useCallback((element: HTMLVideoElement | null) => {
    video.current = element;
  }, []);
  useLayoutEffect(() => source.current?.setMode(state.mode), [state.mode]);
  const start = () => {
    void audio.enable();
    if (fake) {
      store.emit({ type: "camera.ready", at: store.replayClock.read() });
      return;
    }
    if (!video.current) return;
    source.current?.dispose();
    source.current = new RealVisionSource(
      video.current,
      store.emit,
      store.raw,
      undefined,
      store.poseRaw,
    );
    if (exercise?.spec)
      source.current.configureMovement(
        exercise.item.exercise_key,
        exercise.spec,
        exercise.item.target_reps,
        exercise.language,
      );
    source.current.setMode(state.mode);
    onSource(source.current);
    setRuntimeStarted(true);
    void source.current.start();
  };
  return (
    <>
      {!fake && (
        <CameraStage
          onVideo={onVideo}
          sourceRef={source}
          guide={!!poseStage(state.mode)}
        />
      )}
      {snapshot.camera === "error" && snapshot.error ? (
        <CameraErrorView
          message={snapshot.error}
          onRetry={start}
          onManual={exercise ? onManual : undefined}
          onBack={onBack}
        />
      ) : (
        ((!runtimeStarted && !fake) || snapshot.camera !== "ready") && (
          <CameraPermissionView
            onStart={start}
            loading={snapshot.camera === "loading"}
            instruction={
              exercise?.spec
                ? localized(
                    exercise.spec.calibration.messages,
                    exercise.language,
                  )
                : exercise?.item.instruction
            }
          />
        )
      )}
      {import.meta.env.DEV && fake && !exercise && <FakeSource />}
      {import.meta.env.DEV && fake && exercise && (
        <MovementPreview
          title={exercise.item.display_name}
          label="SYNTHETIC REPLAY / ILLUSTRATIVE PREVIEW"
        />
      )}
      {import.meta.env.DEV && fake && (
        <FakePoseControls
          mode={state.mode}
          exercise={exercise}
          onSource={onSource}
        />
      )}
      {import.meta.env.DEV && !exercise && poseStage(state.mode) && (
        <PoseDebugPanel />
      )}
      {!poseStage(state.mode) && (
        <>
          <GestureHud />
          <GestureCursor />
        </>
      )}
    </>
  );
}
export function App({ backend = backendStore }: { backend?: BackendStore }) {
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
  const [cameraEpoch, setCameraEpoch] = useState(0);
  const source = useRef<WorkoutRuntime | null>(null);
  const captureSource = useCallback((runtime: WorkoutRuntime | null) => {
    source.current = runtime;
  }, []);
  const [active, setActive] = useState<ActiveExercise | null>(null);
  const activeRef = useRef<ActiveExercise | null>(null);
  const [genericView, setGenericView] = useState<GenericView | null>(null);
  const [voice, setVoice] = useState("Voice muted");
  const current = useRef(state);
  const [audio] = useState(() => {
    const value = new WorkoutAudio();
    value.setMuted(true);
    return value;
  });
  const fake = fakeVisionEnabled(import.meta.env.DEV, window.location.search);
  useEffect(() => () => audio.close(), [audio]);
  const send = useCallback(
    (action: AppAction) => {
      const before = current.current;
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
          source.current?.dispose();
          source.current = null;
          setCameraEpoch((value) => value + 1);
        } else if (
          ["PROFILE", "PLAN", "PROGRESS", "RESULTS"].includes(next.mode)
        ) {
          source.current?.dispose();
          source.current = null;
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
      if (next.mode === "RESULTS") {
        source.current?.dispose();
        source.current = null;
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
  const { contextStep, setContextStep } = useBrowserRoutes(state, send);
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
      const action = mapVisionEvent(event, current.current, tutorial);
      if (action) send(action);
      audio.event(event);
      return current.current;
    },
    [send, audio],
  );
  const storePause = (type: "workout.paused" | "workout.resumed") =>
    onEvent(
      { type, at: performance.now() },
      { step: 0, handFound: false, handSince: null },
    );
  const startExercise = (exercise: ActiveExercise) => {
    activeRef.current = exercise;
    setActive(exercise);
    setGenericView(null);
    source.current?.dispose();
    source.current = null;
    session.current = null;
    send({ type: "BEGIN_EXERCISE", manual: !exercise.spec });
    if (!exercise.spec) {
      session.current = backend.startWorkout(exercise.planId, "manual-v1");
      setSessionId(session.current.client_session_id);
    }
  };
  const finishExercise = (seconds = 0) => {
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
  const planning = ["PROFILE", "PLAN", "PROGRESS", "RESULTS"].includes(
    state.mode,
  );
  const inWorkout = !!poseStage(state.mode);
  const planningLinks = [
    { mode: "PLAN", action: "OPEN_PLAN", label: "Your plan" },
    { mode: "PROGRESS", action: "OPEN_PROGRESS", label: "Progress" },
    { mode: "PROFILE", action: "OPEN_PROFILE", label: "Your context" },
  ] as const;
  return (
    <GestureNavigationProvider state={state} onEvent={onEvent}>
      <div className={`app-shell ${inWorkout ? "workout-shell" : ""}`}>
        <header>
          <strong className="brand">
            <img src={`${import.meta.env.BASE_URL}design/dm-mark.svg`} alt="" />
            DUNGEON MASTER
          </strong>
          {planning && (
            <nav className="planning-nav">
              {planningLinks.map((link) => (
                <a
                  key={link.mode}
                  href={routeUrl(
                    link.mode,
                    "intake",
                    import.meta.env.BASE_URL,
                    window.location.search,
                  )}
                  aria-current={state.mode === link.mode ? "page" : undefined}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.ctrlKey ||
                      event.metaKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    if (state.mode === "PROFILE" && link.mode === "PROFILE")
                      setContextStep("intake");
                    send({ type: link.action });
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}
          {import.meta.env.DEV && <code>{state.mode}</code>}
          <BackendBadge status={remote.status} pending={remote.pendingCount} />
        </header>
        <div className={planning ? "planning-content" : "experience"}>
          {(!planning || legacyFake) && !(active && !active.spec) && (
            <div className="camera-column">
              <CameraExperience
                key={cameraEpoch}
                fake={fake}
                audio={audio}
                state={state}
                exercise={active}
                onSource={captureSource}
                onManual={() => {
                  if (active) startExercise({ ...active, spec: null });
                }}
                onBack={() => send({ type: "OPEN_PLAN" })}
              />
            </div>
          )}
          {active && !active.spec && inWorkout && (
            <div className="camera-column">
              <MovementPreview
                title={active.item.display_name}
                label="ILLUSTRATIVE GUIDED MODE / NOT LIVE VIDEO"
              />
            </div>
          )}
          <main>
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
                message={remote.profileMessage}
                onSave={(profile) => backend.saveProfile(profile)}
                onBack={() => send({ type: "BACK" })}
              />
            )}
            {state.mode === "PLAN" &&
              remote.plan?.ai_metadata &&
              remote.plan.ai_metadata.status !== "fallback" && (
                <PlanExperience
                  plan={remote.plan.ai_metadata}
                  planId={remote.plan.id}
                  backend={backend}
                  onStart={startExercise}
                  onContext={() => send({ type: "OPEN_PROFILE" })}
                />
              )}
            {state.mode === "PLAN" &&
              remote.plan?.ai_metadata?.status === "fallback" && (
                <p className="dm-status" role="status">
                  {remote.plan.ai_metadata.message}
                </p>
              )}
            {state.mode === "PLAN" &&
              (!remote.plan?.ai_metadata ||
                remote.plan.ai_metadata.status === "fallback") && (
                <PlanPage
                  plan={remote.plan}
                  message={remote.planMessage}
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
            {active && inWorkout && (
              <CameraCoachShell
                exercise={active}
                view={genericView}
                stage={state.mode}
                countdown={state.workout.countdown}
                onPause={() => storePause("workout.paused")}
                onResume={() => storePause("workout.resumed")}
                onFinish={finishExercise}
                onCancel={() => send({ type: "OPEN_PLAN" })}
                voice={voice}
                onVoice={toggleVoice}
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
          </main>
        </div>
        <footer className="privacy-notice">
          Видео обрабатывается локально. Кадры не отправляются, запись камеры не
          ведётся. Общая fitness feedback не заменяет тренера или врача.
        </footer>
        <label>
          <input
            type="checkbox"
            checked={voice === "Voice muted"}
            onChange={(event) => {
              audio.setMuted(event.target.checked);
              setVoice(audio.status());
            }}
          />{" "}
          Без звука
        </label>
      </div>
    </GestureNavigationProvider>
  );
}
