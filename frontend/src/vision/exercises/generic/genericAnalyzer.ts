import type { VisionEvent } from "../../../types/vision";
import type {
  CalibrationIssue,
  CalibrationProfile,
  PoseRecognitionSample,
  PoseSide,
  PoseStage,
} from "../../pose/types";
import { validPose, sideViewScore } from "../../pose/readiness";
import { FeatureEvaluator, pointIndex, bodyScale } from "./featureEvaluator";
import { PhaseMachine } from "./phaseMachine";
import { condition } from "./conditionEvaluator";
import { genericResult } from "./resultBuilder";
import { localized } from "./types";
import type { GenericView, Language, MovementSpec } from "./types";
function freezeSpec<T>(value:T):T { if(value && typeof value==='object'){Object.values(value).forEach(freezeSpec);Object.freeze(value)}return value }
export class GenericAnalyzer {
  private evaluator: FeatureEvaluator;
  private machine: PhaseMachine;
  private side: PoseSide = "left";
  private stage: PoseStage = "calibration";
  private stableAt: number | null = null;
  private anchor: PoseRecognitionSample | null = null;
  private calibrated = false;
  private tracked = false;
  private countdown: number | null = null;
  private countdownValue = -1;
  private previous: Record<string, number> = {};
  private lastAt = -Infinity;
  private started: number | null = null;
  private total = 0;
  private accepted = 0;
  private repDuration = 0;
  private errors: Record<string, number> = {};
  private pending = new Set<string>();
  private holds = new Map<string, number>();
  private cueUntil = -Infinity;
  private primary = "";
  private secondary = "";
  private correction = false;
  private done = false;
  private lostSince: number | null = null;
  private visibilitySum = 0;
  private visibilityCount = 0;
  readonly spec: MovementSpec;
  readonly target: number;
  readonly language: Language;
  constructor(spec: MovementSpec, target: number, language: Language = "ru") {
    this.spec = freezeSpec(structuredClone(spec));
    this.target = target;
    this.language = language;
    this.evaluator = new FeatureEvaluator(this.spec);
    this.machine = new PhaseMachine(this.spec);
  }
  activeSide() {
    return this.side;
  }
  setStage(stage: PoseStage) {
    if (this.stage === stage) return;
    this.stage = stage;
    this.cancelPartial();
    this.countdown = null;
    this.countdownValue = -1;
    if (stage === "calibration") {
      this.calibrated = false;
      this.stableAt = null;
      this.anchor = null;
    }
  }
  cancelPartial() {
    this.machine.cancel();
    this.evaluator.clearHistory();
    this.previous = {};
    this.pending.clear();
    this.holds.clear();
    this.visibilitySum=0;this.visibilityCount=0;
  }
  private issue(s: PoseRecognitionSample | null): CalibrationIssue | null {
    if (!validPose(s)) return "body_not_fully_visible";
    if (!this.calibrated) {
      const score = (side: PoseSide) =>
        this.spec.camera.required_landmarks.reduce(
          (n, p) => n + s.landmarks[pointIndex(p, side)].visibility,
          0,
        );
      this.side = score("left") >= score("right") ? "left" : "right";
    }
    const points = this.spec.camera.required_landmarks.map(
      (p) => s.landmarks[pointIndex(p, this.side)],
    );
    if (
      points.some(
        (p) =>
          p.visibility < this.spec.camera.minimum_visibility ||
          (p.presence ?? 1) < this.spec.camera.minimum_visibility,
      )
    )
      return "body_not_fully_visible";
    if (
      points.some((p) => p.x < 0.03 || p.x > 0.97 || p.y < 0.03 || p.y > 0.97)
    )
      return "move_farther";
    const sideScore = sideViewScore(s);
    if (
      (this.spec.camera.preferred_angle === "side" && sideScore < 0.5) ||
      (this.spec.camera.preferred_angle === "front" && sideScore > 0.8)
    )
      return "wrong_camera_angle";
    return null;
  }
  private cue(primary: string, secondary = "", correction = false, at = 0) {
    this.primary = primary;
    this.secondary = secondary;
    this.correction = correction;
    this.cueUntil = at + 1800;
  }
  private view(at: number, tracking: boolean): VisionEvent {
    const phase = this.spec.phases.find((p) => p.id === this.machine.stage)!;
    const label = localized(phase.messages, this.language, 32, "Движение");
    const view: GenericView = {
      stage: this.machine.stage,
      label,
      primary: this.primary || label,
      secondary: this.secondary,
      tracking,
      reps: this.total,
      target: this.target,
      side: this.side,
      correction: this.correction,
    };
    return {
      type: "workout.generic_updated",
      at,
      view,
      language: this.language,
    };
  }
  update(sample: PoseRecognitionSample | null, at: number): VisionEvent[] {
    if (this.done || !Number.isFinite(at) || at <= this.lastAt) return [];
    if (this.lastAt !== -Infinity && at - this.lastAt > 500) {
      this.cancelPartial();
      this.stableAt = null;
      this.anchor = null;
      if(this.calibrated && this.stage==='workout') {
        this.calibrated=false;this.lastAt=at;
        return [{type:'calibration.required',at}];
      }
    }
    this.lastAt = at;
    const events: VisionEvent[] = [],
      issue = this.issue(sample);
    if (issue || !sample) {
      this.lostSince ??= at;
      this.cancelPartial();
      this.stableAt = null;
      this.anchor = null;
      if (this.tracked) {
        this.tracked = false;
        events.push({ type: "pose.tracking_lost", at });
      }
      const recovery = this.spec.coach_messages.tracking_recovery;
      this.cue(
        issue === "wrong_camera_angle"
          ? this.spec.camera.preferred_angle === "front"
            ? this.language === "kk"
              ? "Камераға қара"
              : this.language === "en"
                ? "Face the camera"
                : "Повернись лицом к камере"
            : this.language === "kk"
              ? "Қырыңмен тұр"
              : this.language === "en"
                ? "Stand side-on"
                : "Повернись боком к камере"
          : localized(recovery.messages, this.language),
        localized(recovery.secondary, this.language, 120, ""),
        true,
        at,
      );
      events.push(
        {
          type: "calibration.updated",
          at,
          ready: false,
          progress: 0,
          issue,
          activeSide: this.side,
        },
        this.view(at, false),
      );
      if (this.stage === "countdown" || (this.calibrated && (this.stage==='workout'||this.stage==='paused') && (issue==='wrong_camera_angle'||at-this.lostSince>=500))) {
        this.calibrated = false;
        events.push({ type: "calibration.required", at });
      }
      return events;
    }
    this.lostSince=null;
    if (!this.tracked) {
      this.tracked = true;
      events.push({ type: "pose.tracking_acquired", at });
    }
    if (this.stage === "calibration") {
      const scale = bodyScale(sample, this.side);
      const moved =
        this.anchor &&
        this.spec.camera.required_landmarks.some((p) => {
          const i = pointIndex(p, this.side);
          return (
            Math.hypot(
              (sample.landmarks[i].x - this.anchor!.landmarks[i].x) *
                (sample.aspectRatio ?? 1),
              sample.landmarks[i].y - this.anchor!.landmarks[i].y,
            ) /
              scale >
            0.08
          );
        });
      if (!this.anchor || moved) {
        this.anchor = sample;
        this.stableAt = at;
      }
      this.stableAt ??= at;
      const progress = Math.min(
        1,
        (at - this.stableAt) / this.spec.calibration.stable_ms,
      );
      events.push({
        type: "calibration.updated",
        at,
        ready: progress === 1,
        progress,
        issue: progress === 1 ? null : "stand_still",
        activeSide: this.side,
      });
      this.cue(
        localized(this.spec.calibration.messages, this.language),
        "",
        false,
        at,
      );
      if (progress === 1 && !this.calibrated) {
        this.calibrated = true;
        this.evaluator.baseline = this.evaluator.evaluate(sample, this.side);
        this.evaluator.clearHistory();
        const profile: CalibrationProfile = {
          version: "generic-calibration-v1",
          activeSide: this.side,
          bodyScale: scale,
          standingKneeAngle: 180,
          standingHipAngle: 180,
          baselineTorsoTilt: 0,
          sideViewScore: sideViewScore(sample),
          createdAt: at,
        };
        events.push({ type: "calibration.completed", at, profile });
      }
      return [...events, this.view(at, true)];
    }
    if (!this.calibrated) return events;
    if (this.stage === "countdown") {
      this.countdown ??= at;
      const count = Math.max(0, 3 - Math.floor((at - this.countdown) / 1000));
      if (count !== this.countdownValue) {
        this.countdownValue = count;
        events.push({ type: "workout.countdown", at, count });
      }
      if (at - this.countdown >= 3300)
        events.push({ type: "workout.countdown_done", at });
      this.cue(
        localized(this.spec.coach_messages.ready.messages, this.language),
        "",
        false,
        at,
      );
      return [...events, this.view(at, true)];
    }
    if (this.stage === "paused") {
      this.cancelPartial();
      this.cue("Пауза", "Повторения сохранены", false, at);
      return [...events, this.view(at, true)];
    }
    this.started ??= at;
    const values = this.evaluator.evaluate(sample, this.side);
    for (const rule of this.spec.error_rules.filter(
      (r) => r.evaluate_at === "frame",
    )) {
      if (!condition(rule.condition, values, this.previous)) {
        this.holds.delete(rule.code);
        continue;
      }
      if (!this.holds.has(rule.code)) this.holds.set(rule.code, at);
      if (at - this.holds.get(rule.code)! >= rule.hold_ms) {
        this.pending.add(rule.code);
        if (at >= this.cueUntil)
          this.cue(
            localized(rule.messages, this.language),
            localized(rule.secondary, this.language, 120, ""),
            true,
            at,
          );
      }
    }
    const previous = this.previous;
    const cycle = this.machine.update(values, previous, at);
    if(cycle.changed || this.machine.stage !== this.spec.repetition.start_phase) {
      this.visibilitySum += this.spec.camera.required_landmarks.reduce((sum, point) => sum + sample.landmarks[pointIndex(point, this.side)].visibility, 0) / this.spec.camera.required_landmarks.length;
      this.visibilityCount++;
    }
    this.previous = values;
    if (cycle.completed) {
      for (const rule of this.spec.error_rules.filter(
        (r) => r.evaluate_at === "rep",
      ))
        if (condition(rule.condition, values, previous))
          this.pending.add(rule.code);
      if (cycle.duration < this.spec.repetition.minimum_duration_ms)
        this.pending.add("too_fast");
      const rejected = [...this.pending].some(
        (code) =>
          code === "too_fast" ||
          this.spec.error_rules.find((r) => r.code === code)?.reject_rep,
      );
      this.total++;
      if (!rejected) this.accepted++;
      this.repDuration += cycle.duration;
      for (const code of this.pending)
        this.errors[code] = Math.min(500, (this.errors[code] ?? 0) + 1);
      const first = this.spec.error_rules.find((r) => this.pending.has(r.code));
      if (first)
        this.cue(
          localized(first.messages, this.language),
          localized(first.secondary, this.language, 120, ""),
          true,
          at,
        );
      else if (rejected)
        this.cue(
          this.language === "en"
            ? "Slow the way down"
            : this.language === "kk"
              ? "Баяуырақ қозғал"
              : "Двигайся медленнее",
          "",
          true,
          at,
        );
      else
        this.cue(
          localized(this.spec.coach_messages.good_rep.messages, this.language),
          "",
          false,
          at,
        );
      events.push({
        type: "workout.generic_rep_completed",
        at,
        repIndex: this.total,
        accepted: !rejected,
        errors: [...this.pending],
        metrics: {
          minKneeAngle: null,
          maxReturnKneeAngle: null,
          descentDurationMs: null,
          ascentDurationMs: null,
          totalDurationMs: cycle.duration,
          depthScore: null,
          meanVisibility: this.visibilityCount ? this.visibilitySum / this.visibilityCount : null,
          tempo: cycle.duration < this.spec.repetition.minimum_duration_ms ? "fast" : "ok",
        },
      });
      this.pending.clear();
      this.holds.clear();
      this.visibilitySum=0;this.visibilityCount=0;
      this.evaluator.resetRep();
      if (this.total >= this.target) {
        this.done = true;
        this.cue(
          localized(this.spec.coach_messages.complete.messages, this.language),
          "",
          false,
          at,
        );
        events.push({ type: "workout.completed", at, result: this.result(at) });
      }
    } else if (at >= this.cueUntil) {
      this.cue(
        localized(
          this.spec.phases.find((p) => p.id === this.machine.stage)!.messages,
          this.language,
        ),
        "",
        false,
        at,
      );
    }
    return [...events, this.view(at, true)];
  }
  result(at: number) {
    return genericResult(
      this.spec.exercise_key,
      this.target,
      this.total,
      this.accepted,
      this.started === null ? 0 : at - this.started,
      this.repDuration,
      this.errors,
    );
  }
}
