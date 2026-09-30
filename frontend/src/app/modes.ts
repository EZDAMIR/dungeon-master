import type {
  CalibrationProfile,
  CalibrationIssue,
  PoseSide,
} from "../vision/pose/types";
import type {
  RepResult,
  SquatPhase,
  TechniqueErrorCode,
  WorkoutResult,
} from "../vision/exercises/squat/types";
import type { VisionEvent } from "../types/vision";
export type { WorkoutResult } from "../vision/exercises/squat/types";
export type AppMode =
  | "CAMERA_PERMISSION"
  | "TUTORIAL"
  | "MENU"
  | "CALIBRATION"
  | "COUNTDOWN"
  | "WORKOUT"
  | "PAUSED"
  | "RESULTS"
  | "PROFILE"
  | "PLAN"
  | "PROGRESS"
  | "SCHEDULE"
  | "REST"
  | "NEXT_SET";
export type WorkoutView = {
  profile: CalibrationProfile | null;
  progress: number;
  ready: boolean;
  issue: CalibrationIssue | null;
  activeSide: PoseSide | null;
  positive: boolean;
  tracked: boolean;
  phase: SquatPhase;
  reps: readonly RepResult[];
  feedback: { code: TechniqueErrorCode; message: string } | null;
  countdown: number;
};
export const emptyWorkout = (): WorkoutView => ({
  profile: null,
  progress: 0,
  ready: false,
  issue: null,
  activeSide: null,
  positive: false,
  tracked: false,
  phase: "not_ready",
  reps: [],
  feedback: null,
  countdown: 3,
});
export type AppAction =
  | { type: "NAVIGATE"; mode: AppMode }
  | { type: "SESSION_PHASE"; mode: AppMode; reset?: boolean }
  | { type: "CAMERA_READY" }
  | { type: "CAMERA_RETRY" }
  | { type: "TUTORIAL_DONE" }
  | { type: "SELECT_WORKOUT"; workoutId: string }
  | { type: "CONFIRM_SELECTION" }
  | { type: "BACK" }
  | { type: "CALIBRATION_READY"; profile: CalibrationProfile }
  | { type: "CALIBRATION_LOST" }
  | { type: "COUNTDOWN_DONE" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "WORKOUT_DONE"; result: WorkoutResult }
  | { type: "RESTART" }
  | { type: "REPEAT" }
  | { type: "MENU" }
  | { type: "BEGIN_EXERCISE"; manual: boolean }
  | { type: "OPEN_PROFILE" }
  | { type: "OPEN_PLAN" }
  | { type: "OPEN_PROGRESS" }
  | { type: "OPEN_SCHEDULE" }
  | { type: "POSE_EVENT"; event: VisionEvent };
export type AppState = {
  mode: AppMode;
  selectedWorkoutId: string | null;
  workoutResult: WorkoutResult | null;
  workout: WorkoutView;
  sessionFinished?: boolean;
};
export const INITIAL_STATE: AppState = {
  mode: "CAMERA_PERMISSION",
  selectedWorkoutId: null,
  workoutResult: null,
  workout: emptyWorkout(),
};
const TRANSITIONS: Record<
  AppMode,
  Partial<Record<AppAction["type"], AppMode>>
> = {
  REST: {},
  NEXT_SET: {},
  CAMERA_PERMISSION: { CAMERA_READY: "TUTORIAL" },
  TUTORIAL: { TUTORIAL_DONE: "MENU" },
  MENU: {
    CONFIRM_SELECTION: "CALIBRATION",
    BACK: "TUTORIAL",
    OPEN_PROFILE: "PROFILE",
    OPEN_PLAN: "PLAN",
    OPEN_PROGRESS: "PROGRESS",
    OPEN_SCHEDULE: "SCHEDULE",
  },
  CALIBRATION: { CALIBRATION_READY: "COUNTDOWN", BACK: "MENU" },
  COUNTDOWN: { COUNTDOWN_DONE: "WORKOUT", CALIBRATION_LOST: "CALIBRATION" },
  WORKOUT: {
    PAUSE: "PAUSED",
    WORKOUT_DONE: "RESULTS",
    CALIBRATION_LOST: "CALIBRATION",
  },
  PAUSED: { RESUME: "WORKOUT", CALIBRATION_LOST: "CALIBRATION" },
  RESULTS: {
    RESTART: "TUTORIAL",
    REPEAT: "CALIBRATION",
    MENU: "MENU",
    OPEN_PROGRESS: "PROGRESS",
    OPEN_SCHEDULE: "SCHEDULE",
    OPEN_PROFILE: "PROFILE",
    OPEN_PLAN: "PLAN",
  },
  PROFILE: { BACK: "MENU", OPEN_PLAN: "PLAN", OPEN_PROGRESS: "PROGRESS", OPEN_SCHEDULE: "SCHEDULE" },
  PLAN: { BACK: "MENU", OPEN_PROFILE: "PROFILE", OPEN_PROGRESS: "PROGRESS", OPEN_SCHEDULE: "SCHEDULE" },
  PROGRESS: { BACK: "MENU", OPEN_PROFILE: "PROFILE", OPEN_PLAN: "PLAN", OPEN_SCHEDULE: "SCHEDULE" },
  SCHEDULE: { BACK: "PLAN", OPEN_PROFILE: "PROFILE", OPEN_PLAN: "PLAN", OPEN_PROGRESS: "PROGRESS" },
};
export function transition(
  mode: AppMode,
  action: AppAction["type"],
  selectedWorkoutId: string | null = null,
): AppMode {
  if (action === "CAMERA_RETRY") return "CAMERA_PERMISSION";
  if (action === "CONFIRM_SELECTION" && !selectedWorkoutId) return mode;
  return TRANSITIONS[mode][action] ?? mode;
}
function poseEvent(view: WorkoutView, event: VisionEvent): WorkoutView {
  switch (event.type) {
    case "pose.tracking_acquired":
      return { ...view, tracked: true };
    case "pose.tracking_lost":
      return { ...view, tracked: false, ready: false, feedback: null };
    case "calibration.updated":
      return {
        ...view,
        progress: event.progress,
        ready: event.ready,
        issue: event.issue,
        activeSide: event.activeSide,
      };
    case "workout.phase_changed":
      return { ...view, phase: event.phase };
    case "workout.countdown":
      return { ...view, countdown: event.count };
    case "workout.rep_completed":
      return event.repIndex !== view.reps.length + 1
        ? view
        : {
            ...view,
            reps: [
              ...view.reps,
              {
                index: event.repIndex,
                accepted: event.accepted,
                errors: event.errors,
                metrics: event.metrics,
              },
            ],
            feedback: null,
            positive: event.accepted,
          };
    case "workout.positive_feedback_cleared":
      return { ...view, positive: false };
    case "workout.technique_error":
      return {
        ...view,
        feedback: { code: event.code, message: event.correction },
      };
    case "workout.feedback_cleared":
      return view.feedback?.code === event.code
        ? { ...view, feedback: null }
        : view;
    default:
      return view;
  }
}
export function appReducer(state: AppState, action: AppAction): AppState {
  if(action.type==='SESSION_PHASE')return {...state,mode:action.mode,selectedWorkoutId:'personalized',workout:action.reset?emptyWorkout():state.workout,workoutResult:null,sessionFinished:action.mode==='RESULTS'};
  if (action.type === "NAVIGATE") {
    const cameraRoute = [
      "CALIBRATION",
      "COUNTDOWN",
      "WORKOUT",
      "PAUSED",
    ].includes(action.mode);
    let mode = action.mode;
    if (cameraRoute) mode = state.selectedWorkoutId ? "CALIBRATION" : "PLAN";
    if (["REST","NEXT_SET"].includes(mode)) mode="PLAN";
    if (mode === "RESULTS" && !state.workoutResult && !state.sessionFinished) mode = "PROGRESS";
    // A history return to the entry screen keeps an acquired hand camera alive.
    if (mode === "CAMERA_PERMISSION" && state.mode !== "CAMERA_PERMISSION")
      mode = "TUTORIAL";
    return {
      ...state,
      mode,
      // History may select screens, but cannot restore an old counting gate.
      workout: emptyWorkout(),
    };
  }
  if (
    action.type === "OPEN_PLAN" &&
    state.selectedWorkoutId === "personalized" &&
    ["CALIBRATION", "COUNTDOWN", "WORKOUT", "PAUSED"].includes(state.mode)
  )
    return { ...state, mode: "PLAN" };
  if (
    action.type === "BEGIN_EXERCISE" &&
    (state.mode === "PLAN" ||
      (action.manual &&
        state.mode === "CALIBRATION" &&
        state.selectedWorkoutId === "personalized"))
  )
    return {
      ...state,
      mode: action.manual ? "WORKOUT" : "CALIBRATION",
      selectedWorkoutId: "personalized",
      workoutResult: null,
      workout: emptyWorkout(),
    };
  if (action.type === "SELECT_WORKOUT")
    return state.mode === "MENU" &&
      ["bodyweight-squat", "planned-squat"].includes(action.workoutId)
      ? { ...state, selectedWorkoutId: action.workoutId }
      : state;
  if (action.type === "POSE_EVENT") {
    if (!["CALIBRATION", "COUNTDOWN", "WORKOUT", "PAUSED"].includes(state.mode))
      return state;
    const workout = poseEvent(state.workout, action.event);
    return workout === state.workout ? state : { ...state, workout };
  }
  const mode = transition(state.mode, action.type, state.selectedWorkoutId);
  if (mode === state.mode) return state;
  let workout = state.workout;
  if (action.type === "CALIBRATION_READY")
    workout = {
      ...workout,
      profile: action.profile,
      activeSide: action.profile.activeSide,
      ready: true,
      progress: 1,
      countdown: 3,
    };
  if (action.type === "CALIBRATION_LOST")
    workout = {
      ...workout,
      profile: null,
      progress: 0,
      ready: false,
      phase: "not_ready",
    };
  if (action.type === "PAUSE" || action.type === "RESUME")
    workout = { ...workout, phase: "not_ready" };
  const fresh =
    action.type === "REPEAT" ||
    action.type === "CONFIRM_SELECTION" ||
    mode === "MENU" ||
    mode === "CAMERA_PERMISSION" ||
    mode === "TUTORIAL";
  if (fresh) workout = emptyWorkout();
  return {
    ...state,
    mode,
    workout,
    selectedWorkoutId:
      mode === "TUTORIAL" || mode === "CAMERA_PERMISSION"
        ? null
        : state.selectedWorkoutId,
    workoutResult:
      action.type === "WORKOUT_DONE"
        ? action.result
        : fresh
          ? null
          : state.workoutResult,
  };
}
