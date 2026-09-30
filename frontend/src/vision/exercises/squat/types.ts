export type SquatPhase =
  "not_ready" | "standing" | "descending" | "bottom" | "ascending";
export type TechniqueErrorCode =
  "depth_insufficient" | "too_fast" | "incomplete_extension";
export type RepMetrics = {
  minKneeAngle: number;
  maxReturnKneeAngle: number;
  descentDurationMs: number;
  ascentDurationMs: number;
  totalDurationMs: number;
  depthScore: number;
  meanVisibility: number;
  tempo: "slow" | "ok" | "fast";
};
export type RepResult = {
  index: number;
  accepted: boolean;
  errors: readonly TechniqueErrorCode[];
  metrics: RepMetrics;
};
export type WorkoutResult = {
  exerciseKey: string;
  targetReps: number;
  totalReps: number;
  acceptedReps: number;
  rejectedReps: number;
  durationMs: number;
  meanRepDurationMs: number;
  errorCounts: Record<TechniqueErrorCode, number>;
  engineVersion: "squat-v1" | "generic-v1" | "manual-v1";
  genericErrorCounts?: Record<string, number>;
};
export type SquatFeatures = {
  at: number;
  kneeAngle: number;
  hipAngle: number;
  torsoTilt: number;
  hipY: number;
  kneeY: number;
  ankleY: number;
  hipVelocity: number;
  kneeVelocity: number;
  depthScore: number;
  visibility: number;
};
