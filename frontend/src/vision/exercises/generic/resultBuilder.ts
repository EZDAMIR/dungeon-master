import type { WorkoutResult } from "../squat/types";
export const zeroLegacyErrors = () => ({
  depth_insufficient: 0,
  too_fast: 0,
  incomplete_extension: 0,
});
export function genericResult(
  key: string,
  target: number,
  total: number,
  accepted: number,
  duration: number,
  repDuration: number,
  errors: Record<string, number>,
): WorkoutResult {
  return {
    exerciseKey: key,
    targetReps: target,
    totalReps: total,
    acceptedReps: accepted,
    rejectedReps: total - accepted,
    durationMs: Math.min(3_600_000, Math.max(0, duration)),
    meanRepDurationMs: total ? repDuration / total : 0,
    errorCounts: zeroLegacyErrors(),
    genericErrorCounts: { ...errors },
    engineVersion: "generic-v1",
  };
}
