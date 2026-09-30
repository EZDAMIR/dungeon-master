import type { Language, MovementSpec } from "../vision/exercises/generic/types";
import type { Constraint, Equipment, Experience } from "./types";
export type PersonaKey = "maya" | "arman" | "dana";
export type CoachStyle = "calm" | "energetic" | "strict" | "supportive";
export type AIContext = {
  self_description: string;
  preferred_coach_style: CoachStyle;
  preferred_language: Language;
  additional_preferences: Record<string, unknown>;
};
export type SourceReference = {
  type: "profile" | "preferences" | "document" | "progress";
  label: string;
  source_id: string | null;
};
export type Fact = {
  id: string;
  document_id: string;
  normalized_fact: string;
  source_excerpt: string;
  constraint_code: Constraint | null;
  status: "pending" | "confirmed" | "rejected";
};
export type DocumentSource = {
  id: string;
  filename: string;
  media_type: string;
  size_bytes: number;
  extracted_character_count: number;
  status: "uploaded" | "processed" | "failed";
  message: string | null;
  facts: Fact[];
  created_at: string;
};
export type AIProfile = {
  summary: string;
  fitness_level: Experience;
  primary_goals: string[];
  secondary_goals: string[];
  preferences: string[];
  constraints: Constraint[];
  equipment: Equipment[];
  schedule: { days_per_week: number; minutes_per_session: number };
  coach_persona: {
    tone: CoachStyle;
    language: Language;
    verbosity: "short";
    motivation_style: string;
  };
  plan_strategy: {
    intensity: string;
    complexity: string;
    preferred_tempo: string;
    rest_style: string;
  };
  personalization_highlights: string[];
  persona_key: PersonaKey | null;
  routine_preferences: string[];
  source_highlights: {
    label: string;
    source_type: SourceReference["type"];
    source_id: string | null;
  }[];
};
export type AIProfileResponse = {
  id: string;
  version: number;
  profile: AIProfile;
  model: string;
  status: "completed" | "fallback" | "synthetic";
};
export type AIPlanExercise = {
  exercise_key: string;
  display_name: string;
  description: string;
  instruction: string;
  difficulty: Experience;
  equipment_codes: Equipment[];
  impact_level: string;
  contraindication_tags: Constraint[];
  camera_angle: "front" | "side" | "none";
  sets: number;
  target_reps: number;
  rest_seconds: number;
  tempo_hint: string;
  reason: string;
  source_references: SourceReference[];
  camera_coaching_mode: "predefined" | "ai_generated" | "manual_only";
  camera_coaching_status: "validated" | "experimental" | "manual_only";
  exercise_source: "synthetic" | "ai_generated" | "predefined";
  detail_available: boolean;
  swap_available: boolean;
};
export type RoutineBlock = {
  routine_type: "morning_reset" | "desk_reset" | "pre_sleep";
  title: string;
  estimated_minutes: number;
  camera_coaching_available: boolean;
  items: {
    title: string;
    instruction: string;
    duration_seconds: number;
    camera_coaching_available: boolean;
  }[];
};
export type AIPlanMetadata = {
  status: "completed" | "synthetic";
  title: string;
  summary: string;
  why_this_plan: string[];
  excluded_exercises: string[];
  coach_persona: { tone: CoachStyle; language: Language };
  days: {
    day_index: number;
    title: string;
    estimated_minutes: number;
    items: AIPlanExercise[];
  }[];
  routine_blocks: RoutineBlock[];
  ai_profile: AIProfile;
  model: string;
  prompt_version: string;
};
export type FallbackMetadata = { status: "fallback"; message: string };
export type ExerciseSpec = {
  id?: string;
  spec_revision?: string;
  exercise_key: string;
  display_name: string;
  description: string;
  status: "valid" | "manual_only" | "invalid" | "generated";
  generated_by_model: string;
  movement_spec: MovementSpec | null;
};
export type ActiveExercise = {
  specRevision?: string | null;
  item: AIPlanExercise;
  spec: MovementSpec | null;
  planId: string | null;
  language: Language;
};
