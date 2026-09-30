export type PoseSide = "left" | "right";
export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence?: number;
};
export type PoseRecognitionSample = {
  at: number;
  landmarks: readonly PoseLandmark[];
  worldLandmarks?: readonly PoseLandmark[];
  aspectRatio?: number;
};
export interface PoseLandmarkerAdapter {
  initialize(): Promise<void>;
  recognize(
    video: HTMLVideoElement,
    timestampMs: number,
  ): PoseRecognitionSample | null;
  close(): void;
}
export type CalibrationIssue =
  | "body_not_fully_visible"
  | "wrong_camera_angle"
  | "stand_still"
  | "move_farther"
  | "move_closer";
export type CalibrationProfile = {
  version: "squat-calibration-v1" | "generic-calibration-v1";
  activeSide: PoseSide;
  standingKneeAngle: number;
  standingHipAngle: number;
  baselineTorsoTilt: number;
  bodyScale: number;
  sideViewScore: number;
  createdAt: number;
};
export type PoseStage = "calibration" | "countdown" | "workout" | "paused";
