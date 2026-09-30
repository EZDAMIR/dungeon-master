import type { PoseSide } from "../../pose/types";
export type Language = "ru" | "kk" | "en";
export type Messages = Partial<Record<Language, string | null>>;
export type Operation =
  | "angle"
  | "distance"
  | "normalized_distance"
  | "relative_x"
  | "relative_y"
  | "position_x"
  | "position_y"
  | "velocity_x"
  | "velocity_y"
  | "delta"
  | "visibility"
  | "body_scale"
  | "average"
  | "minimum"
  | "maximum";
export type Feature = {
  id: string;
  operation: Operation;
  points: string[];
  inputs: string[];
  normalize_by: "body_scale" | null;
  scope: "frame" | "rep";
};
export type Condition = {
  feature: string;
  operator:
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "between"
    | "approximately"
    | "trend_up"
    | "trend_down";
  value: number;
  upper: number | null;
  tolerance: number;
};
export type Cue = { messages: Messages; secondary: Messages | null };
export type MovementSpec = {
  version: 1;
  exercise_key: string;
  display_name: string;
  camera: {
    preferred_angle: "front" | "side";
    body_scope: "full" | "upper";
    required_landmarks: string[];
    minimum_visibility: number;
  };
  calibration: {
    stable_ms: number;
    baseline_features: string[];
    messages: Messages;
  };
  features: Feature[];
  phases: { id: string; messages: Messages }[];
  transitions: {
    from: string;
    to: string;
    condition: Condition;
    hold_ms: number;
  }[];
  repetition: {
    start_phase: string;
    complete_from: string;
    complete_to: string;
    minimum_duration_ms: number;
    maximum_duration_ms: number;
  };
  error_rules: {
    code: string;
    evaluate_at: "rep" | "frame";
    condition: Condition;
    messages: Messages;
    secondary: Messages | null;
    reject_rep: boolean;
    hold_ms: number;
  }[];
  coach_messages: {
    ready: Cue;
    good_rep: Cue;
    tracking_recovery: Cue;
    complete: Cue;
  };
};
export type GenericView = {
  stage: string;
  label: string;
  primary: string;
  secondary: string;
  tracking: boolean;
  reps: number;
  target: number;
  side: PoseSide;
  correction: boolean;
};
export function localized(
  messages: Messages | null | undefined,
  language: Language,
  max = 56,
  fallback = "Продолжайте спокойно",
): string {
  for (const key of [language, "ru", "en"] as const) {
    const value = messages?.[key];
    if (
      value &&
      Array.from(value).length <= max &&
      value.split("\n").length <= 2
    )
      return value;
  }
  return fallback;
}
