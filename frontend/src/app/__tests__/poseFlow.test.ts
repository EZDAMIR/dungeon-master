import curlFixture from "../../vision/exercises/generic/tests/curlSpec.json";
import squatFixture from "../../vision/exercises/generic/tests/squatSpec.json";
import fixture from "../../vision/exercises/generic/tests/calfSpec.json";
import { expect, it } from "vitest";
import { ReplayClock } from "../../vision/core/clock";
import { FakePoseSource } from "../../features/workout/FakePoseSource";
import { poseStage } from "../../features/workout/RealVisionSource";
import { appReducer, INITIAL_STATE } from "../modes";
import { mapVisionEvent } from "../visionEventMapper";
import { initialTutorial } from "../../features/onboarding/tutorialMachine";
import type { VisionEvent } from "../../types/vision";
function setup() {
  let state = appReducer(
    { ...INITIAL_STATE, mode: "MENU" },
    { type: "SELECT_WORKOUT", workoutId: "bodyweight-squat" },
  );
  state = appReducer(state, { type: "CONFIRM_SELECTION" });
  const events: VisionEvent[] = [];
  const emit = (event: VisionEvent) => {
    events.push(event);
    const action = mapVisionEvent(event, state, initialTutorial);
    if (action) {
      const before = state.mode;
      state = appReducer(state, action);
      if (state.mode !== before) {
        const stage = poseStage(state.mode);
        if (stage) source.setStage(stage);
      }
    }
  };
  const source = new FakePoseSource(emit, () => {});
  return { source, emit, events, state: () => state };
}
it("fake pose events complete calibration/countdown/5 cycles/results via the shared mapper", () => {
  const s = setup();
  s.source.play("wrong-angle", 0);
  expect(s.state().mode).toBe("CALIBRATION");
  s.source.play("standing-side", 4000);
  expect(s.state().mode).toBe("COUNTDOWN");
  s.source.lost(8000);
  expect(s.state().mode).toBe("CALIBRATION");
  s.source.play("standing-side", 9000);
  s.source.play("standing-side", 13000);
  expect(s.state().mode).toBe("WORKOUT");
  for (const kind of [
    "correct-squat",
    "shallow-squat",
    "fast-squat",
    "incomplete-extension",
    "correct-squat",
  ]) {
    s.source.standing(17000);
    s.source.play(kind, 17000);
  }
  expect(s.state()).toMatchObject({
    mode: "RESULTS",
    workoutResult: {
      totalReps: 5,
      acceptedReps: 2,
      rejectedReps: 3,
      errorCounts: {
        depth_insufficient: 1,
        too_fast: 1,
        incomplete_extension: 1,
      },
    },
  });
  expect(poseStage(s.state().mode)).toBeNull();
  s.emit({ type: "gesture.confirmed", at: 80000, command: "confirm" });
  expect(s.state().mode).toBe("CALIBRATION");
  expect(s.state().workout.reps).toHaveLength(0);
});
it("pause/resume preserves results and conventional back resets calibration", () => {
  const s = setup();
  s.source.play("standing-side", 0);
  s.source.play("standing-side", 4000);
  s.source.standing(8000);
  s.source.play("correct-squat", 10000);
  expect(s.state().workout.reps).toHaveLength(1);
  s.source.standing(16000);
  s.source.play("pause-gesture", 18000);
  expect(s.state().mode).toBe("PAUSED");
  s.source.play("correct-squat", 22000);
  expect(s.state().workout.reps).toHaveLength(1);
  s.source.standing(26000);
  s.source.play("pause-gesture", 28000);
  expect(s.state().mode).toBe("WORKOUT");
  expect(s.state().workout.reps).toHaveLength(1);
  const calibration = { ...s.state(), mode: "CALIBRATION" as const };
  expect(appReducer(calibration, { type: "BACK" })).toMatchObject({
    mode: "MENU",
    workout: { profile: null, reps: [] },
  });
});
it("hand controls and immediate pose replay share a monotonic clock", () => {
  const clock = new ReplayClock();
  const events: VisionEvent[] = [],
    source = new FakePoseSource(
      (e) => events.push(e),
      () => {},
      clock,
    );
  source.play("standing-side", 100);
  const at = clock.read(120);
  expect(at).toBeGreaterThan(120);
  events.push({ type: "gesture.confirmed", at, command: "back" });
  expect(events.every((e, i) => !i || e.at >= events[i - 1].at)).toBe(true);
});

it("keeps a personalized camera failure recoverable through manual mode", () => {
  const plan = { ...INITIAL_STATE, mode: "PLAN" as const };
  const camera = appReducer(plan, { type: "BEGIN_EXERCISE", manual: false });
  const mapped = mapVisionEvent(
    { type: "camera.denied", at: 1, reason: "Synthetic denial" },
    camera,
    { step: 0, handFound: false, handSince: null },
  );
  expect(mapped).toBeNull();
  expect(
    appReducer(camera, { type: "BEGIN_EXERCISE", manual: true }).mode,
  ).toBe("WORKOUT");
  expect(appReducer(camera, { type: "OPEN_PLAN" }).mode).toBe("PLAN");
});

it("replays generated calf corrections and a valid recovery through the shared pose session", () => {
  const spec = fixture;
  let mode: "calibration" | "workout" = "calibration";
  const events: VisionEvent[] = [];
  const source = new FakePoseSource(
    (e) => {
      events.push(e);
      if (e.type === "calibration.required") source.setStage("calibration");
      if (e.type === "calibration.completed") {
        mode = "workout";
      }
    },
    () => {},
  );
  source.configureMovement(
    spec as import("../../vision/exercises/generic/types").MovementSpec,
    6,
    "ru",
  );
  source.play("standing-side", 0);
  source.setStage(mode);
  source.play("shallow-squat", 4100);
  source.lost(8500);
  source.standing(9200);
  source.setStage("workout");
  source.play("correct-squat", 10700);
  expect(
    events
      .filter((e) => e.type === "workout.generic_rep_completed")
      .map((e) => e.accepted),
  ).toEqual([false, true]);
});

it.each([
  ["Dumbbell Bicep Curl", curlFixture],
  ["Controlled Squat", squatFixture],
])("interprets complete %s synthetic movement cycles", (_title, spec) => {
  const events: VisionEvent[] = [];
  const source = new FakePoseSource(
    (e) => events.push(e),
    () => {},
  );
  source.configureMovement(
    spec as import("../../vision/exercises/generic/types").MovementSpec,
    6,
    "ru",
  );
  source.play("standing-side", 0);
  expect(events.some((e) => e.type === "calibration.completed")).toBe(true);
  source.setStage("workout");
  source.play("shallow-squat", 4100);
  source.standing(7650);
  source.play("correct-squat", 9150);
  expect(
    events
      .filter((e) => e.type === "workout.generic_rep_completed")
      .map((e) => e.accepted),
  ).toEqual([false, true]);
});
