import { pose } from "./builder";
import type { PoseRecognitionSample } from "../../../src/vision/pose/types";

// Sprint 4A synthetic landmarks exercise the same interpreter as a local camera.
export function calfPose(at: number, height = 0): PoseRecognitionSample {
  const sample = pose(at);
  const landmarks = sample.landmarks.map((p) => ({ ...p }));
  for (const index of [29, 30]) landmarks[index].y -= height * 0.23;
  return { ...sample, landmarks };
}

export function calfCycle(start: number, peak = 0.08): PoseRecognitionSample[] {
  const samples: PoseRecognitionSample[] = [];
  for (let i = 0; i <= 60; i++) {
    const progress = i / 60;
    const height =
      progress < 0.4
        ? (peak * progress) / 0.4
        : progress < 0.6
          ? peak
          : (peak * (1 - progress)) / 0.4;
    samples.push(calfPose(start + i * 50, Math.max(0, height)));
  }
  // Allow the shared smoothing filter and held return condition to settle.
  for (let i = 1; i <= 10; i++) samples.push(calfPose(start + 3000 + i * 50));
  return samples;
}

export function curlPose(at: number, angle = 178): PoseRecognitionSample {
  const sample = pose(at, 178, { front: true });
  const landmarks = sample.landmarks.map((p) => ({ ...p }));
  for (const [shoulder, elbow, wrist] of [
    [11, 13, 15],
    [12, 14, 16],
  ]) {
    const s = landmarks[shoulder];
    const radians = ((180 - angle) * Math.PI) / 180;
    landmarks[elbow] = { ...s, y: s.y + 0.15 };
    landmarks[wrist] = {
      ...s,
      x: s.x + Math.sin(radians) * 0.15,
      y: s.y + 0.15 + Math.cos(radians) * 0.15,
    };
  }
  return { ...sample, landmarks };
}

export function angularCycle(
  start: number,
  kind: "curl" | "squat",
  shallow = false,
): PoseRecognitionSample[] {
  const samples: PoseRecognitionSample[] = [];
  const min = kind === "curl" ? (shallow ? 100 : 65) : shallow ? 120 : 95;
  for (let i = 0; i <= 60; i++) {
    const progress = i / 60;
    const angle =
      progress < 0.4
        ? 178 - ((178 - min) * progress) / 0.4
        : progress < 0.6
          ? min
          : min + ((178 - min) * (progress - 0.6)) / 0.4;
    samples.push(
      kind === "curl"
        ? curlPose(start + i * 50, angle)
        : pose(start + i * 50, angle),
    );
  }
  for (let i = 1; i <= 10; i++)
    samples.push(
      kind === "curl"
        ? curlPose(start + 3000 + i * 50)
        : pose(start + 3000 + i * 50),
    );
  return samples;
}
