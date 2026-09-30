import { angleDegrees, distance2D } from "../../core/geometry";
import type {
  PoseLandmark,
  PoseRecognitionSample,
  PoseSide,
} from "../../pose/types";
import type { MovementSpec } from "./types";
const indices: Record<string, number> = {
  shoulder: 11,
  elbow: 13,
  wrist: 15,
  hip: 23,
  knee: 25,
  ankle: 27,
  heel: 29,
  foot_index: 31,
};
export function pointIndex(name: string, side: PoseSide): number {
  if (name === "nose") return 0;
  const match = name.match(/^(?:(left|right|active)_)?(.+)$/)!;
  return (
    indices[match[2]] +
    (match[1] === "right" ||
    ((!match[1] || match[1] === "active") && side === "right")
      ? 1
      : 0)
  );
}
export function bodyScale(
  sample: PoseRecognitionSample,
  side: PoseSide,
): number {
  const shoulder = sample.landmarks[pointIndex("shoulder", side)],
    hip = sample.landmarks[pointIndex("hip", side)];
  return Math.max(
    0.01,
    Math.hypot(
      (shoulder.x - hip.x) * (sample.aspectRatio ?? 1),
      shoulder.y - hip.y,
    ),
  );
}
export class FeatureEvaluator {
  private history = new Map<string, { at: number; point: PoseLandmark }>();
  private minimum: Record<string, number> = {};
  private maximum: Record<string, number> = {};
  baseline: Record<string, number> = {};
  private spec: MovementSpec;
  constructor(spec: MovementSpec) {
    this.spec = spec;
  }
  resetRep() {
    this.minimum = {};
    this.maximum = {};
    for (const f of this.spec.features)
      if (f.scope === "rep") this.history.delete(f.id);
  }
  clearHistory() {
    this.history.clear();
    this.resetRep();
  }
  evaluate(
    sample: PoseRecognitionSample,
    side: PoseSide,
  ): Record<string, number> {
    const scale = bodyScale(sample, side),
      values: Record<string, number> = {};
    const point = (name: string) => {
      const p = sample.landmarks[pointIndex(name, side)];
      return { ...p, x: p.x * (sample.aspectRatio ?? 1) };
    };
    for (const f of this.spec.features) {
      const p = f.points.map(point),
        inputs = f.inputs.map((id) => values[id]);
      let v = 0;
      switch (f.operation) {
        case "angle":
          v = angleDegrees(p[0], p[1], p[2]);
          break;
        case "distance":
          v = distance2D(p[0], p[1]);
          break;
        case "normalized_distance":
          v = distance2D(p[0], p[1]) / scale;
          break;
        case "relative_x":
          v = p[0].x - p[1].x;
          break;
        case "relative_y":
          v = p[0].y - p[1].y;
          break;
        case "position_x":
          v = p[0].x;
          break;
        case "position_y":
          v = p[0].y;
          break;
        case "visibility":
          v = p[0].visibility;
          break;
        case "body_scale":
          v = scale;
          break;
        case "delta":
          v = inputs[0] - (this.baseline[f.inputs[0]] ?? inputs[0]);
          break;
        case "average":
          v = inputs.reduce((a, b) => a + b, 0) / inputs.length;
          break;
        case "minimum":
          v = Math.min(...inputs);
          break;
        case "maximum":
          v = Math.max(...inputs);
          break;
        case "velocity_x":
        case "velocity_y": {
          const old = this.history.get(f.id),
            axis = f.operation === "velocity_x" ? "x" : "y";
          v =
            old && sample.at > old.at && sample.at - old.at <= 500
              ? ((p[0][axis] - old.point[axis]) * 1000) / (sample.at - old.at)
              : 0;
          this.history.set(f.id, { at: sample.at, point: p[0] });
          break;
        }
      }
      if (
        f.normalize_by === "body_scale" &&
        f.operation !== "normalized_distance"
      )
        v /= scale;
      if (f.scope === "rep") {
        this.minimum[f.id] = Math.min(this.minimum[f.id] ?? v, v);
        this.maximum[f.id] = Math.max(this.maximum[f.id] ?? v, v);
        if (f.operation === "minimum") v = this.minimum[f.id];
        if (f.operation === "maximum") v = this.maximum[f.id];
        if (f.operation === "average") {
          const old = this.history.get(f.id);
          const count = old?.at ?? 0;
          v = ((old?.point.x ?? 0) * count + v) / (count + 1);
          this.history.set(f.id, {
            at: count + 1,
            point: { x: v, y: 0, z: 0, visibility: 1 },
          });
        }
      }
      if (!Number.isFinite(v)) return {};
      values[f.id] = v;
    }
    return values;
  }
}
