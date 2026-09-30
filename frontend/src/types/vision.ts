import type { GenericView, Language } from "../vision/exercises/generic/types";
import type {
  CalibrationIssue,
  CalibrationProfile,
  PoseSide,
} from "../vision/pose/types";
import type {
  SquatPhase,
  RepMetrics,
  TechniqueErrorCode,
  WorkoutResult,
} from "../vision/exercises/squat/types";
export type {
  RepMetrics,
  TechniqueErrorCode,
  WorkoutResult,
} from "../vision/exercises/squat/types";
export type GestureCommand = "select" | "back" | "confirm";
export type CameraErrorCode =
  | "unsupported"
  | "insecure_context"
  | "not_allowed"
  | "not_found"
  | "not_readable"
  | "model_load_failed"
  | "unknown";

export type GenericRepMetrics = {
  totalDurationMs: number;
  minKneeAngle: number | null;
  maxReturnKneeAngle: number | null;
  descentDurationMs: number | null;
  ascentDurationMs: number | null;
  depthScore: number | null;
  meanVisibility: number | null;
  tempo: "slow" | "ok" | "fast";
};
export type VisionEvent =
  | { type: "workout.generic_rep_completed"; at: number; repIndex: number; accepted: boolean; errors: readonly string[]; metrics: GenericRepMetrics }

  | {
      type: "workout.generic_updated";
      at: number;
      view: GenericView;
      language: Language;
    }
  | { type: "camera.loading"; at: number }
  | { type: "camera.ready"; at: number }
  | { type: "camera.denied"; at: number; reason: string }
  | { type: "camera.error"; at: number; code: CameraErrorCode; message: string }
  | { type: "tracking.acquired"; at: number; target: "hand" }
  | { type: "tracking.lost"; at: number; target: "hand" | "body" }
  | { type: "cursor.moved"; at: number; x: number; y: number }
  | { type: "gesture.scrolled"; at: number; deltaY: number }
  | { type: "focus.changed"; at: number; targetId: string | null }
  | {
      type: "gesture.candidate";
      at: number;
      command: GestureCommand;
      progress: number;
      confidence?: number;
    }
  | { type: "gesture.cancelled"; at: number; command: GestureCommand }
  | {
      type: "gesture.confirmed";
      at: number;
      command: "select" | "back" | "confirm" | "pause";
      targetId?: string;
    }
  | {
      type: "workout.rep_completed";
      at: number;
      repIndex: number;
      accepted: boolean;
      errors: readonly TechniqueErrorCode[];
      metrics: RepMetrics;
    }
  | {
      type: "workout.technique_error";
      at: number;
      code: TechniqueErrorCode;
      correction: string;
      severity: "hint" | "warning";
    }
  | { type: "pose.tracking_acquired"; at: number }
  | { type: "pose.tracking_lost"; at: number }
  | {
      type: "calibration.updated";
      at: number;
      ready: boolean;
      progress: number;
      issue: CalibrationIssue | null;
      activeSide: PoseSide | null;
    }
  | { type: "calibration.completed"; at: number; profile: CalibrationProfile }
  | { type: "calibration.required"; at: number }
  | { type: "workout.countdown"; at: number; count: number }
  | { type: "workout.countdown_done"; at: number }
  | { type: "workout.feedback_cleared"; at: number; code: TechniqueErrorCode }
  | { type: "workout.paused"; at: number }
  | { type: "workout.resumed"; at: number }
  | { type: "workout.completed"; at: number; result: WorkoutResult }
  | { type: "workout.phase_changed"; at: number; phase: SquatPhase }
  | { type: "workout.positive_feedback_cleared"; at: number };
