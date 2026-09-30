import type { AIPlanMetadata, FallbackMetadata } from "./aiCoach";
export type Goal = "general_fitness" | "strength_foundation" | "mobility";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Equipment = "none" | "chair" | "resistance_band" | "dumbbells";
export type Constraint =
  "no_high_impact" | "avoid_deep_knee_flexion" | "avoid_overhead";
export type User = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_guest: boolean;
  created_at: string;
};
export type GuestToken = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
};
export type AuthState = { accessToken: string; user: User; expiresAt: number };
export type ProfileUpdate = {
  goal: Goal;
  experience_level: Experience;
  days_per_week: number;
  session_minutes: number;
  equipment: Equipment[];
  locale: string;
  timezone: string;
  confirmed_constraints: Constraint[];
};
export type Profile = ProfileUpdate & {
  created_at: string;
  updated_at: string;
};
export type Exercise = {
  id: string;
  key: string;
  name: string;
  difficulty: Experience;
  equipment_codes: Equipment[];
  impact_level: "low" | "medium" | "high";
  camera_angle: "side" | "front" | "none";
  contraindication_tags: Constraint[];
  analysis_profile: {
    version: 1;
    engine_key: "bodyweight_squat_side_v1" | "generic_v1";
    engine_version: string;
    target_reps: number;
    supported_client: "web";
  };
};
export type PlanItem = {
  id: string;
  exercise_id: string;
  exercise: Exercise;
  day_index: number;
  position: number;
  sets: number;
  target_reps: number;
  rest_seconds: number;
  tempo_hint: string | null;
  scheduled_at: string | null;
};
export type TrainingPlan = {
  ai_metadata?: AIPlanMetadata | FallbackMetadata | null;
  id: string;
  status: "draft" | "active" | "completed" | "archived";
  source: "deterministic" | "ai_assisted";
  starts_on: string;
  rationale: string;
  generator_version: string;
  created_at: string;
  updated_at: string;
  items: PlanItem[];
};
export type ErrorCode =
  "depth_insufficient" | "too_fast" | "incomplete_extension";
export type ErrorCounts = Record<ErrorCode, number>;
export type SessionCreate = {
  client_session_id: string;
  plan_id: string | null;
  started_at: string;
  client_engine_version: string;
};
export type SetCreate = {
  assessment_mode?: "camera" | "manual";
  completion_status?: "completed" | "partial";
  spec_revision?: string | null;
  target_snapshot?: { target_reps: number | null; duration_seconds: number | null; rest_seconds: number; plan_sets: number } | null;
  client_set_id: string;
  exercise_key: string;
  set_index: number;
  total_reps: number;
  accepted_reps: number;
  duration_ms: number;
  error_counts: ErrorCounts;
  generic_error_counts?: Record<string, number>;
  metrics: { mean_rep_duration_ms: number | null; mean_min_knee_angle: number | null };
  engine_version: string;
};
export type SessionSummary = {
  total_sets?: number;
  camera_total_reps?: number;
  manual_completed_sets?: number;
  total_reps: number;
  accepted_reps: number;
  rejected_reps: number;
  duration_ms: number;
  error_counts: ErrorCounts;
  generic_error_counts?: Record<string, number>;
};
export type SessionComplete = { completed_at: string; summary: SessionSummary };
export type WorkoutSession = SessionCreate & {
  id: string;
  status: "started" | "completed" | "abandoned";
  completed_at: string | null;
  summary: SessionSummary | null;
  created_at: string;
  updated_at: string;
};
export type WorkoutSet = SetCreate & {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
};
export type Progress = {
  total_sets?: number;
  camera_total_reps?: number;
  manual_completed_sets?: number;
  completed_sessions: number;
  total_reps: number;
  accepted_reps: number;
  rejected_reps: number;
  acceptance_rate: number;
  error_counts: ErrorCounts;
  generic_error_counts?: Record<string, number>;
  recent_sessions: {
    id: string;
    exercise_key: string;
    completed_at: string;
    total_reps: number;
    accepted_reps: number;
    duration_ms: number;
    dominant_error: string | null;
    generic_error_counts?: Record<string, number>;
  }[];
};
export type BackendStatus =
  "connecting" | "online" | "offline" | "syncing" | "error";
