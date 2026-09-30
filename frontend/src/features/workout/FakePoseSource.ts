import { ReplayClock } from "../../vision/core/clock";
import { PoseSession } from "../../vision/pose/session";
import { sequence, pose } from "../../../tests/fixtures/pose/builder";
import {
  calfCycle,
  calfPose,
  curlPose,
  angularCycle,
} from "../../../tests/fixtures/pose/generic";
import type {
  MovementSpec,
  Language,
} from "../../vision/exercises/generic/types";
import type { VisionEvent } from "../../types/vision";
import type { PoseRecognitionSample, PoseStage } from "../../vision/pose/types";
import type { PosePresentation } from "./RealVisionSource";
export class FakePoseSource {
  private session = new PoseSession();
  private last = 0;
  private calf = false;
  private angularKind: "curl" | "squat" | null = null;
  private generic = false;
  private clock: ReplayClock;
  private emit: (event: VisionEvent) => void;
  private raw: (presentation: PosePresentation) => void;
  constructor(
    emit: (event: VisionEvent) => void,
    raw: (presentation: PosePresentation) => void,
    clock = new ReplayClock(),
  ) {
    this.emit = emit;
    this.raw = raw;
    this.clock = clock;
  }
  setStage(stage: PoseStage) {
    this.session.setStage(stage);
  }
  configureMovement(spec: MovementSpec, target: number, language: Language) {
    this.generic = true;
    this.angularKind = spec.features.some(
      (f) => f.operation === "angle" && f.points.includes("elbow"),
    )
      ? "curl"
      : spec.features.some(
            (f) => f.operation === "angle" && f.points.includes("knee"),
          )
        ? "squat"
        : null;
    this.calf = spec.features.some(
      (f) => f.id === "height" && f.operation === "relative_y",
    );
    return this.session.configureMovement(
      spec.exercise_key,
      spec,
      target,
      language,
    );
  }
  configureLegacy(target:number) {this.generic=false;this.calf=false;this.angularKind=null;this.session.configureMovement("bodyweight_squat",null,target)}
  finishGeneric() {
    return this.session.finishGeneric(this.last);
  }
  dispose() {
    this.reset();
  }
  reset() {
    this.session.reset();
    this.raw({ sample: null, activeSide: null, fps: 0, inferenceMs: 0 });
  }
  play(kind: string, now: number) {
    // Synthetic landmarks, no recordings. One monotonic clock for all fake pose events.
    const base = Math.max(this.clock.read(now), this.last + 50);
    const samples =
      this.angularKind === "curl" && kind === "standing-side"
        ? Array.from({ length: 81 }, (_, i) => curlPose(i * 50))
        : this.angularKind && ["correct-squat", "shallow-squat"].includes(kind)
          ? angularCycle(0, this.angularKind, kind === "shallow-squat")
          : this.calf && kind === "standing-side"
            ? Array.from({ length: 81 }, (_, i) => calfPose(i * 50))
            : this.calf && ["correct-squat", "shallow-squat"].includes(kind)
              ? calfCycle(0, kind === "shallow-squat" ? 0.047 : 0.08)
              : sequence(kind);
    for (const s of samples) this.frame({ ...s, at: base + s.at });
  }
  standing(now: number) {
    const base = Math.max(this.clock.read(now), this.last + 50);
    for (let i = 0; i < 30; i++)
      this.frame(
        this.angularKind === "curl"
          ? curlPose(base + i * 50)
          : this.calf
            ? calfPose(base + i * 50)
            : pose(base + i * 50),
      );
  }
  lost(now: number) {
    const base = Math.max(this.clock.read(now), this.last + 50);
    for (let i = 0; i < 12; i++) this.frame(null, base + i * 50);
  }
  private frame(
    sample: PoseRecognitionSample | null,
    at = sample?.at ?? this.last + 50,
  ) {
    at = this.clock.read(at);
    this.last = at;
    const events = this.session.update(sample, at);
    this.raw({
      generic: this.generic,
      highlightIndices: this.session.highlightIndices(),
      sample: this.session.latest,
      activeSide: this.session.activeSide(),
      fps: 20,
      inferenceMs: 0,
    });
    for (const event of events) this.emit(event);
  }
}
