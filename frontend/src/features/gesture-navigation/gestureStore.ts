import type { AppState } from "../../app/modes";
import type { GestureCommand, VisionEvent } from "../../types/vision";
import { now, ReplayClock } from "../../vision/core/clock";
import { visionConfig } from "../../vision/core/config";
import { clamp, distance } from "../../vision/core/geometry";
import { gestureConfig } from "../../vision/gestures/gestureConfig";
import type { HandRecognitionSample } from "../../vision/gestures/types";
import {
  initialTutorial,
  tutorialTransition,
  type TutorialState,
} from "../onboarding/tutorialMachine";
import { GestureTargetRegistry } from "./gestureTargetRegistry";
import { scrollForSwipe } from "./gestureScroll";
export type GestureSnapshot = {
  camera: "idle" | "loading" | "ready" | "error";
  error: string | null;
  hand: boolean;
  recognized: string;
  confidence: number | null;
  candidate: GestureCommand | null;
  progress: number;
  focused: string | null;
  lastCommand: string | null;
  message: string;
  tutorial: TutorialState;
  fps: number;
  inferenceMs: number;
  handProgress: number;
  qualityHint: string | null;
};
export class GestureStore {
  readonly replayClock = new ReplayClock();
  pose: import("../workout/RealVisionSource").PosePresentation = {
    sample: null,
    activeSide: null,
    fps: 0,
    inferenceMs: 0,
  };
  poseRaw = (
    presentation: import("../workout/RealVisionSource").PosePresentation,
  ) => {
    this.pose = presentation;
  };
  readonly registry = new GestureTargetRegistry();
  cursor = { x: 0, y: 0, visible: false, pinching: false, lostAt: -Infinity };
  sample: HandRecognitionSample | null = null;
  private mode: AppState["mode"] = "CAMERA_PERMISSION";
  private selected: string | null = null;
  private listeners = new Set<() => void>();
  private lastPublish = -Infinity;
  private snapshot: GestureSnapshot = {
    camera: "idle",
    error: null,
    hand: false,
    recognized: "—",
    confidence: null,
    candidate: null,
    progress: 0,
    focused: null,
    lastCommand: null,
    message: "Включи камеру, чтобы начать.",
    tutorial: initialTutorial,
    fps: 0,
    inferenceMs: 0,
    handProgress: 0,
    qualityHint: null,
  };
  onPhysicalInteraction: () => void = () => {};
  setPhysicalInteraction(callback:()=>void) {this.onPhysicalInteraction=callback;}
  private scope: HTMLElement | null = null;
  private scopedListeners = new Set<(event: VisionEvent) => void>();
  subscribeEvents = (callback: (event: VisionEvent) => void) => { this.scopedListeners.add(callback); return () => { this.scopedListeners.delete(callback) } };
  setTargetScope(scope: HTMLElement | null) { this.scope = scope; this.registry.setScope(scope); this.publish({ focused: null, candidate: null, progress: 0 }) }
  onEvent: (event: VisionEvent, tutorial: TutorialState) => AppState | void =
    () => {};
  connect(
    callback: (event: VisionEvent, tutorial: TutorialState) => AppState | void,
  ) {
    this.onEvent = callback;
  }
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(patch: Partial<GestureSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((callback) => callback());
  }
  setAppState(state: AppState) {
    if (this.mode !== state.mode) {
      this.mode = state.mode;
      if (state.mode === "TUTORIAL")
        this.publish({
          tutorial: {
            ...initialTutorial,
            handFound: this.snapshot.hand,
            handSince: this.snapshot.hand ? now() : null,
          },
          handProgress: 0,
          message: "Покажи ладонь перед камерой",
        });
      this.publish({ focused: null, candidate: null, progress: 0 });
    }
    this.selected = state.selectedWorkoutId;
  }
  raw = (
    sample: HandRecognitionSample | null,
    fps: number,
    inferenceMs: number,
  ) => {
    this.sample = sample;
    const at = sample?.at ?? now();
    if (at - this.lastPublish < visionConfig.hudIntervalMs) return;
    this.lastPublish = at;
    let qualityHint: string | null = null;
    if (sample) {
      const palm = distance(sample.landmarks[5], sample.landmarks[17]);
      if (palm > gestureConfig.maxPalmWidth)
        qualityHint = "Отодвинь ладонь немного дальше от камеры";
      else if (
        sample.gesture &&
        sample.gesture.name !== "None" &&
        sample.gesture.confidence <
          gestureConfig.minimumClassificationConfidence
      )
        qualityHint = "Поверни ладонь к камере и удерживай жест стабильнее";
    }
    const since = this.snapshot.tutorial.handSince;
    const handProgress =
      since !== null && sample
        ? clamp((at - since) / visionConfig.handStableMs)
        : 0;
    this.publish({
      recognized: sample?.gesture?.name ?? "—",
      confidence: sample?.gesture?.confidence ?? null,
      fps,
      inferenceMs,
      qualityHint,
      handProgress,
    });
  };
  emit = (original: VisionEvent) => {
    if (original.type === "gesture.swiped" &&
      !["TUTORIAL", "MENU", "PROFILE", "PLAN", "PROGRESS", "RESULTS"].includes(this.mode)) return;
    let event = original;
    if (event.type === "cursor.moved") {
      this.cursor.x = event.x;
      this.cursor.y = event.y;
      this.cursor.visible = true;
      const focused = this.registry.resolve(event.x, event.y);
      if (focused !== this.snapshot.focused)
        this.emit({ type: "focus.changed", at: event.at, targetId: focused });
    }
    if (
      event.type === "gesture.confirmed" &&
      event.command === "select" &&
      !event.targetId
    )
      event = { ...event, targetId: this.snapshot.focused ?? undefined };
    let tutorial = this.snapshot.tutorial;
    if (this.mode === "TUTORIAL") {
      const next = tutorialTransition(tutorial, event);
      if (next !== tutorial) {
        tutorial = next;
        this.publish({ tutorial });
      }
    }
    switch (event.type) {
      case "camera.loading":
        this.publish({
          camera: "loading",
          error: null,
          message: "Камера и модуль распознавания загружаются…",
        });
        break;
      case "camera.ready":
        this.publish({
          camera: "ready",
          error: null,
          message: "Покажи ладонь перед камерой",
        });
        break;
      case "camera.denied":
        this.publish({ camera: "error", error: event.reason });
        break;
      case "camera.error":
        this.publish({ camera: "error", error: event.message });
        break;
      case "tracking.acquired":
        this.publish({
          hand: true,
          message: "Рука найдена. Двигай указательным пальцем.",
        });
        break;
      case "tracking.lost":
        if (event.target !== "hand") break;
        this.cursor.pinching = false;
        this.cursor.lostAt = event.at;
        this.cursor.visible = false;
        this.publish({
          hand: false,
          focused: null,
          candidate: null,
          progress: 0,
          handProgress: 0,
          qualityHint: null,
          recognized: "—",
          confidence: null,
          message: "Рука не видна. Подними ладонь и держи её в центре камеры",
        });
        break;
      case "focus.changed":
        this.publish({ focused: event.targetId });
        break;
      case "gesture.swiped": {
        const moved = scrollForSwipe(event.direction, this.cursor);
        this.cursor.pinching = false;
        this.publish({
          candidate: null,
          progress: 0,
          focused: null,
          lastCommand: event.direction === "up" ? "scroll-up" : "scroll-down",
          message: moved
            ? `Прокрутка ${event.direction === "up" ? "вверх" : "вниз"}. Останови ладонь перед следующим свайпом.`
            : "Достигнут край страницы. Свайпни открытой ладонью в другую сторону.",
        });
        break;
      }
      case "gesture.candidate":
        this.cursor.pinching = event.command === "select";
        this.publish({
          candidate: event.command,
          progress: clamp(event.progress),
          confidence: event.confidence ?? this.snapshot.confidence,
          message:
            event.command === "select"
              ? "Наведи курсор на кнопку, затем соедини большой и указательный пальцы"
              : "Удерживай жест ещё немного",
        });
        break;
      case "gesture.cancelled":
        this.cursor.pinching = false;
        this.publish({
          candidate: null,
          progress: 0,
          message:
            event.command === "select"
              ? "Наведи курсор на кнопку, затем соедини большой и указательный пальцы"
              : "Удерживай жест ещё немного",
        });
        break;
      case "gesture.confirmed": {
        this.cursor.pinching = event.command === "select";
        const message =
          event.command === "select" && !event.targetId
            ? "Наведи курсор на карточку, затем соедини пальцы"
            : event.command === "confirm" &&
                this.mode === "MENU" &&
                !this.selected
              ? "Сначала выбери тренировку щипком"
              : "Команда подтверждена. Убери жест перед следующей командой.";
        this.publish({
          candidate: null,
          progress: 0,
          lastCommand: event.command,
          message,
        });
        break;
      }
    }
    const targetMode = this.mode;
    const hadScope = this.scope !== null;
    this.scopedListeners.forEach(callback => callback(event));
    if (hadScope) {
      if (event.type === 'gesture.confirmed' && event.command === 'select' && event.targetId) this.registry.activate(event.targetId);
      return;
    }
    const state = this.onEvent(event, tutorial);
    if (state) this.setAppState(state);
    if (
      event.type === "gesture.confirmed" &&
      event.command === "select" &&
      event.targetId &&
      (event.targetId.startsWith("session-") || ["PROFILE", "PLAN", "PROGRESS", "SCHEDULE"].includes(targetMode) ||
        (targetMode === "RESULTS" &&
          ["results-sync", "results-progress", "results-plan"].includes(event.targetId)))
    )
      this.registry.activate(event.targetId);
  };
}
