import type { AppMode } from "../../app/modes";
import type { VisionEvent } from "../../types/vision";
import { CameraManager, cameraMessages } from "../../vision/core/camera";
import { now } from "../../vision/core/clock";
import { visionConfig } from "../../vision/core/config";
import { GestureEngine } from "../../vision/gestures/gestureEngine";
import { MediaPipeGestureRecognizer } from "../../vision/gestures/gestureRecognizer";
import type {
  GestureRecognizerAdapter,
  HandRecognitionSample,
} from "../../vision/gestures/types";
import { MediaPipePoseLandmarker } from "../../vision/pose/poseRecognizer";
import { PoseSession } from "../../vision/pose/session";
import type {
  PoseLandmarkerAdapter,
  PoseRecognitionSample,
  PoseSide,
  PoseStage,
} from "../../vision/pose/types";
export const poseStage = (mode: AppMode): PoseStage | null =>
  (
    ({
      CALIBRATION: "calibration",
      COUNTDOWN: "countdown",
      WORKOUT: "workout",
      PAUSED: "paused",
    }) as const
  )[mode as "CALIBRATION" | "COUNTDOWN" | "WORKOUT" | "PAUSED"] ?? null;
export type PosePresentation = {
  generic?: boolean;
  highlightIndices?: number[];
  sample: PoseRecognitionSample | null;
  activeSide: PoseSide | null;
  fps: number;
  inferenceMs: number;
};
type Factories = {
  gesture: () => GestureRecognizerAdapter;
  pose: () => PoseLandmarkerAdapter;
};
export class RealVisionSource {
  private camera: CameraManager;
  private engine = new GestureEngine();
  private session = new PoseSession();
  private disposed = false;
  private cameraReady = false;
  private ready = false;
  private starting: Promise<void> | null = null;
  private switching: Promise<void> = Promise.resolve();
  private generation = 0;
  private kind: "gesture" | "pose" = "gesture";
  private mode: AppMode = "TUTORIAL";
  private adapter: GestureRecognizerAdapter | PoseLandmarkerAdapter | null =
    null;
  private frame: number | null = null;
  private frameToken = 0;
  private lastInference = -Infinity;
  private lastVideoTime = -1;
  private lastPlayable = 0;
  private frames = 0;
  private fpsSince = 0;
  private fps = 0;
  private video: HTMLVideoElement;
  private emit: (event: VisionEvent) => void;
  private raw: (
    sample: HandRecognitionSample | null,
    fps: number,
    inferenceMs: number,
  ) => void;
  private generic = false;
  private poseRaw: (presentation: PosePresentation) => void;
  private factories: Factories;
  constructor(
    video: HTMLVideoElement,
    emit: (event: VisionEvent) => void,
    raw: (
      sample: HandRecognitionSample | null,
      fps: number,
      inferenceMs: number,
    ) => void,
    factories: Factories = {
      gesture: () => new MediaPipeGestureRecognizer(),
      pose: () => new MediaPipePoseLandmarker(),
    },
    poseRaw: (presentation: PosePresentation) => void = () => {},
  ) {
    this.video = video;
    this.emit = emit;
    this.raw = raw;
    this.factories = factories;
    this.poseRaw = poseRaw;
    this.camera = new CameraManager(video, (event) => {
      if (this.disposed || event.type === "camera.ready") return;
      this.emit(event);
      if (event.type === "camera.error") this.dispose();
    });
  }
  finishGeneric() {
    return this.session.finishGeneric(now());
  }
  configureMovement(
    key: string,
    spec: unknown,
    target: number,
    language: "ru" | "kk" | "en" = "ru",
  ) {
    this.generic = key !== "bodyweight_squat";
    return this.session.configureMovement(key, spec, target, language);
  }
  start(): Promise<void> {
    if (this.disposed || this.cameraReady) return Promise.resolve();
    this.starting ??= this.open();
    return this.starting;
  }
  private async open() {
    // Keep the permission request in the user's start action.
    const camera = this.camera.start();
    const model = this.switchRecognizer(this.kind);
    await Promise.all([
      camera.then((ready) => {
        this.cameraReady = ready;
      }),
      model,
    ]);
    if (this.disposed || !this.cameraReady || !this.ready) return;
    this.emit({ type: "camera.ready", at: now() });
    document.addEventListener("visibilitychange", this.visibility);
    this.lastPlayable = now();
    this.schedule();
  }
  setMode(mode: AppMode) {
    if (this.disposed || this.mode === mode) return;
    this.mode = mode;
    const stage = poseStage(mode),
      kind = stage ? "pose" : "gesture";
    if (stage) this.session.setStage(stage);
    if (kind === this.kind) return;
    this.kind = kind;
    if (kind === "gesture") this.session.reset();
    if (this.starting) void this.switchRecognizer(kind);
  }
  private switchRecognizer(kind: "gesture" | "pose"): Promise<void> {
    const generation = ++this.generation;
    this.ready = false;
    this.cancelFrame();
    this.adapter?.close();
    this.adapter = null;
    this.engine.reset();
    this.raw(null, 0, 0);
    this.poseRaw({ sample: null, activeSide: null, fps: 0, inferenceMs: 0 });
    this.emit({ type: "tracking.lost", at: now(), target: "hand" });
    // Await a late initialization before creating the next model: no overlapping initializers or loops.
    this.switching = this.switching.then(async () => {
      if (this.disposed || generation !== this.generation) return;
      const adapter =
        kind === "gesture" ? this.factories.gesture() : this.factories.pose();
      this.adapter = adapter;
      try {
        await adapter.initialize();
        if (this.disposed || generation !== this.generation) return;
        this.ready = true;
        this.lastVideoTime = -1;
        this.lastInference = -Infinity;
        this.lastPlayable = now();
        this.schedule();
      } catch {
        if (!this.disposed && generation === this.generation) {
          this.emit({
            type: "camera.error",
            at: now(),
            code: "model_load_failed",
            message: cameraMessages.model_load_failed,
          });
          this.dispose();
        }
      }
    });
    return this.switching;
  }
  private cancelFrame() {
    this.frameToken++;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }
  private schedule() {
    if (
      this.frame === null &&
      this.ready &&
      this.cameraReady &&
      !this.disposed &&
      !document.hidden
    ) {
      const token = ++this.frameToken;
      this.frame = requestAnimationFrame((at) => {
        if (token === this.frameToken && !this.disposed) this.tick(at);
      });
    }
  }
  private tick = (at: number) => {
    this.frame = null;
    if (this.disposed || !this.ready || !this.adapter || document.hidden)
      return;
    if (
      this.video.readyState >= 2 &&
      this.video.currentTime !== this.lastVideoTime &&
      at - this.lastInference >= visionConfig.inferenceIntervalMs
    ) {
      this.lastInference = at;
      this.lastVideoTime = this.video.currentTime;
      this.lastPlayable = at;
      const generation = this.generation;
      try {
        const began = import.meta.env.DEV ? now() : 0;
        const sample = this.adapter.recognize(this.video, at),
          duration = import.meta.env.DEV ? now() - began : 0;
        if (import.meta.env.DEV) {
          this.frames++;
          if (at - this.fpsSince >= 1000) {
            this.fps = (this.frames * 1000) / (at - this.fpsSince);
            this.frames = 0;
            this.fpsSince = at;
          }
        }
        let events: VisionEvent[];
        if (this.kind === "gesture") {
          // The active kind is changed only together with closing/replacing its adapter.
          const hand = sample as HandRecognitionSample | null;
          this.raw(hand, this.fps, duration);
          events = this.engine.update(hand, at, {
            width: window.innerWidth,
            height: window.innerHeight,
          });
        } else {
          events = this.session.update(
            sample as PoseRecognitionSample | null,
            at,
          );
          this.poseRaw({
            generic: this.generic,
            highlightIndices: this.session.highlightIndices(),
            sample: this.session.latest,
            activeSide: this.session.activeSide(),
            fps: this.fps,
            inferenceMs: duration,
          });
        }
        for (const event of events) {
          if (this.disposed || generation !== this.generation) break;
          this.emit(event);
        }
      } catch {
        this.emit({
          type: "camera.error",
          at: now(),
          code: "unknown",
          message: "Распознавание остановлено. Повтори запуск камеры.",
        });
        this.dispose();
      }
    } else if (this.kind === "pose" && at - this.lastPlayable > 500) {
      for (const event of this.session.update(null, at)) {
        if (this.disposed) break;
        this.emit(event);
      }
      this.poseRaw({
        sample: null,
        activeSide: this.session.activeSide(),
        fps: 0,
        inferenceMs: 0,
      });
    }
    this.schedule();
  };
  private visibility = () => {
    this.cancelFrame();
    this.engine.reset();
    this.raw(null, 0, 0);
    this.emit({ type: "tracking.lost", at: now(), target: "hand" });
    if (this.kind === "pose")
      for (const event of this.session.update(null, now())) this.emit(event);
    this.poseRaw({
      sample: null,
      activeSide: this.session.activeSide(),
      fps: 0,
      inferenceMs: 0,
    });
    if (!document.hidden) {
      this.lastVideoTime = -1;
      this.lastInference = -Infinity;
      this.lastPlayable = now();
      this.schedule();
    }
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.generation++;
    this.cancelFrame();
    document.removeEventListener("visibilitychange", this.visibility);
    this.engine.reset();
    this.session.reset();
    this.adapter?.close();
    this.adapter = null;
    this.camera.dispose();
    this.raw(null, 0, 0);
    this.poseRaw({ sample: null, activeSide: null, fps: 0, inferenceMs: 0 });
  }
}
