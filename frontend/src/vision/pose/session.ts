import { GenericAnalyzer } from "../exercises/generic/genericAnalyzer";
import { pointIndex } from "../exercises/generic/featureEvaluator";
import { analyzerFactory } from "../exercises/generic/analyzerFactory";
import type { Language } from "../exercises/generic/types";
import type { VisionEvent } from "../../types/vision";
import { PoseCalibration } from "./calibration";
import { poseConfig as c } from "./config";
import { PoseSmoother } from "./smoothing";
import { distance2D } from "../core/geometry";
import { SIDES } from "./landmarks";
import { readiness, validPose, metricPoint } from "./readiness";
import { squatConfig } from "../exercises/squat/config";
import { squatFeatures } from "../exercises/squat/features";
import { SquatAnalyzer } from "../exercises/squat/analyzer";
import {
  ErrorPolicy,
  FeedbackQueue,
  feedbackPriority,
} from "../feedback/errorPolicy";
import { PauseGesture } from "./pauseGesture";
import type {
  CalibrationProfile,
  PoseRecognitionSample,
  PoseStage,
  CalibrationIssue,
} from "./types";
export class PoseSession {
  private generic: GenericAnalyzer | null = null;
  configureMovement(
    key: string,
    spec: unknown,
    target: number,
    language: Language = "ru",
  ) {
    this.reset();
    this.target = Number.isInteger(target) && target >= 1 && target <= 100 ? target : 5;
    const analyzer = analyzerFactory(key, spec, target, language);
    this.generic = analyzer instanceof GenericAnalyzer ? analyzer : null;
    this.manual = key !== "bodyweight_squat" && this.generic === null;
    return this.generic !== null;
  }
  cancelPartial(at: number) { this.generic?.cancelPartial(); this.analyzer?.cancelPartial(at) }
  private target = 5;
  private manual = false;
  private calibration = new PoseCalibration();
  private smoother = new PoseSmoother();
  private policy = new ErrorPolicy();
  private feedback = new FeedbackQueue();
  private positiveUntil: number | null = null;
  private pause = new PauseGesture();
  private profile: CalibrationProfile | null = null;
  private analyzer: SquatAnalyzer | null = null;
  private stage: PoseStage = "calibration";
  private tracking = false;
  private lostSince: number | null = null;
  private calibrationEmitted = false;
  private countdownSince: number | null = null;
  private countdownAnchor: PoseRecognitionSample | null = null;
  private calibrationSide: CalibrationProfile["activeSide"] | null = null;
  private countdownDone = false;
  private lastCount = -1;
  private lastPublish = -Infinity;
  private lastStatus = "";
  latest: PoseRecognitionSample | null = null;
  finishGeneric(at: number) {
    return this.generic?.result(at) ?? null;
  }
  activeSide() {
    return (
      this.generic?.activeSide() ??
      this.profile?.activeSide ??
      this.calibrationSide
    );
  }
  highlightIndices() {
    return this.generic?.spec.camera.required_landmarks.map((p) =>
      pointIndex(p, this.generic!.activeSide()),
    );
  }
  setStage(stage: PoseStage) {
    if (stage === this.stage) return;
    this.stage = stage;
    this.generic?.setStage(stage);
    this.lastPublish = -Infinity;
    this.lastStatus = "";
    if (stage === "calibration") {
      this.calibration.reset();
      this.calibrationEmitted = false;
      this.profile = null;
      this.calibrationSide = null;
      this.smoother.reset();
    }
    if (stage === "countdown") {
      this.countdownAnchor = this.latest;
      this.countdownSince = null;
      this.lastCount = -1;
      this.countdownDone = false;
    }
    if (stage === "paused" || stage === "workout")
      this.analyzer?.cancelPartial(0);
  }
  reset() {
    this.generic = null;
    this.manual = false;
    this.calibration.reset();
    this.smoother.reset();
    this.policy.reset();
    this.pause.reset();
    this.profile = null;
    this.analyzer = null;
    this.latest = null;
    this.tracking = false;
    this.lostSince = null;
    this.calibrationEmitted = false;
    this.countdownSince = null;
    this.lastCount = -1;
    this.countdownDone = false;
    this.lastPublish = -Infinity;
    this.lastStatus = "";
    this.stage = "calibration";
    this.calibrationSide = null;
    this.countdownAnchor = null;
    this.feedback = new FeedbackQueue();
    this.positiveUntil = null;
  }
  private status(
    at: number,
    ready: boolean,
    issue: CalibrationIssue | null,
    progress: number,
    side = this.profile?.activeSide ?? null,
  ): VisionEvent[] {
    const signature = `${ready}:${issue}:${side}:${Math.round(progress * 10)}`;
    if (
      signature === this.lastStatus ||
      at - this.lastPublish < c.semanticIntervalMs
    )
      return [];
    this.lastStatus = signature;
    this.lastPublish = at;
    return [
      {
        type: "calibration.updated",
        at,
        ready,
        issue,
        progress,
        activeSide: side,
      },
    ];
  }
  update(raw: PoseRecognitionSample | null, at: number): VisionEvent[] {
    const events: VisionEvent[] = [];
    if(this.manual) return events;
    if (this.generic) {
      const sample = validPose(raw) ? this.smoother.update(raw) : null;
      this.latest = sample;
      if (!sample) this.smoother.reset();
      return this.generic.update(sample, at);
    }
    if (!validPose(raw)) {
      this.latest = null;
      this.smoother.reset();
      this.policy.reset();
      this.lostSince ??= at;
      events.push(...(this.analyzer?.cancelPartial(at) ?? []));
      if (this.tracking && at - this.lostSince >= c.trackingSignalMs) {
        this.tracking = false;
        events.push({ type: "pose.tracking_lost", at });
      }
      if (this.stage === "calibration") {
        this.calibration.reset();
        this.calibrationEmitted = false;
        events.push(...this.status(at, false, "body_not_fully_visible", 0));
      }
      if (
        this.stage === "countdown" ||
        ((this.stage === "workout" || this.stage === "paused") &&
          at - this.lostSince >= c.trackingLostMs &&
          this.profile)
      ) {
        this.profile = null;
        events.push({ type: "calibration.required", at });
      }
      return this.finish(events, at, true);
    }
    this.lostSince = null;
    if (!this.tracking) {
      this.tracking = true;
      events.push({ type: "pose.tracking_acquired", at });
    }
    const sample = this.smoother.update(raw);
    if (!sample) {
      this.smoother.reset();
      this.latest = null;
      events.push(...(this.analyzer?.cancelPartial(at) ?? []));
      if (this.stage === "calibration") {
        this.calibration.reset();
        this.calibrationEmitted = false;
        events.push(...this.status(at, false, "stand_still", 0));
      }
      if (this.stage === "countdown")
        events.push({ type: "calibration.required", at });
      return this.finish(events, at, true);
    }
    this.latest = sample;
    if (this.stage === "calibration") {
      const result = this.calibration.update(sample);
      this.calibrationSide = result.activeSide;
      const status = this.policy.update(result.issue, at);
      events.push(
        ...this.status(
          at,
          !!result.profile,
          status.issue ??
            (result.issue === "stand_still" ? "stand_still" : null),
          result.progress,
          result.activeSide,
        ),
      );
      if (result.profile && !this.calibrationEmitted) {
        this.profile = result.profile;
        this.calibrationEmitted = true;
        if (this.analyzer) this.analyzer.recalibrate(result.profile);
        else this.analyzer = new SquatAnalyzer(result.profile, this.target);
        events.push({
          type: "calibration.completed",
          at,
          profile: result.profile,
        });
      }
      return this.finish(events, at, !!result.issue);
    }
    if (!this.profile) return this.finish(events, at, true);
    const rawIssue = readiness(raw, this.profile.activeSide, this.policy.ready);
    const features = squatFeatures(sample, this.profile.activeSide);
    const standing =
      features.kneeAngle >=
      this.profile.standingKneeAngle - squatConfig.standingEnterTolerance;
    const side = SIDES[this.profile.activeSide];
    const moved =
      this.countdownAnchor &&
      [side.shoulder, side.hip].some(
        (i) =>
          distance2D(
            metricPoint(sample, i),
            metricPoint(this.countdownAnchor!, i),
          ) /
            this.profile!.bodyScale >
          c.standingMotion,
      );
    const issue =
      rawIssue ??
      (this.stage === "countdown" && (!standing || moved)
        ? "stand_still"
        : null);
    const status = this.policy.update(issue, at);
    events.push(...this.status(at, status.ready, status.issue, 1));
    if (this.stage === "countdown") {
      if (issue) {
        events.push({ type: "calibration.required", at });
        return this.finish(events, at, true);
      }
      this.countdownSince ??= at;
      const count = Math.max(
        0,
        3 - Math.floor((at - this.countdownSince) / 1000),
      );
      if (count !== this.lastCount) {
        this.lastCount = count;
        events.push({ type: "workout.countdown", at, count });
      }
      if (
        !this.countdownDone &&
        at - this.countdownSince >= c.countdownMs + c.startDisplayMs
      ) {
        this.countdownDone = true;
        events.push({ type: "workout.countdown_done", at });
      }
    } else if (this.stage === "workout" || this.stage === "paused") {
      if (issue || !status.ready) {
        events.push(...(this.analyzer?.cancelPartial(at) ?? []));
        return this.finish(events, at, true);
      }
      const eligible =
        standing &&
        (this.stage === "paused" || this.analyzer?.phase === "standing");
      if (this.pause.update(sample, eligible)) {
        events.push({
          type: this.stage === "paused" ? "workout.resumed" : "workout.paused",
          at,
        });
        events.push(...(this.analyzer?.cancelPartial(at) ?? []));
        return this.finish(events, at, false);
      }
      if (this.stage === "workout")
        events.push(...(this.analyzer?.update(sample) ?? []));
    }
    return this.finish(events, at, !!status.issue);
  }
  private finish(events: VisionEvent[], at: number, readinessError: boolean) {
    const output: VisionEvent[] = [];
    const primary = events
      .filter((e) => e.type === "workout.technique_error")
      .toSorted(
        (a, b) => feedbackPriority[b.code] - feedbackPriority[a.code],
      )[0];
    for (const e of events) {
      if (e.type === "workout.rep_completed" && e.accepted)
        this.positiveUntil = at + c.positiveFeedbackMs;
      if (
        e.type !== "workout.technique_error" ||
        (e === primary && this.feedback.activate(e.code, at))
      )
        output.push(e);
    }
    if (
      this.positiveUntil !== null &&
      (at >= this.positiveUntil || readinessError)
    ) {
      this.positiveUntil = null;
      output.push({ type: "workout.positive_feedback_cleared", at });
    }
    const cleared = this.feedback.clear(at, readinessError);
    if (cleared)
      output.push({ type: "workout.feedback_cleared", at, code: cleared });
    return output;
  }
}
