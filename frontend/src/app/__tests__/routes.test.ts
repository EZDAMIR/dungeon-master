import { describe, expect, it } from "vitest";
import { initialRouteState, readRoute, routeUrl } from "../router/routes";
import { appReducer, INITIAL_STATE } from "../modes";
import { buildResult } from "../../vision/exercises/squat/resultBuilder";

describe("Sprint 4A browser routes", () => {
  it("resolves context steps and respects a subdirectory deployment", () => {
    expect(
      readRoute("/dungeon-master/context/review", "/dungeon-master/"),
    ).toEqual({ mode: "PROFILE", contextStep: "review" });
    expect(readRoute("/dungeon-master/plan/", "/dungeon-master/").mode).toBe(
      "PLAN",
    );
    expect(
      routeUrl(
        "PROFILE",
        "documents",
        "/dungeon-master/",
        "?juryDemo=1&fakeVision=1",
      ),
    ).toBe("/dungeon-master/context/documents?juryDemo=1&fakeVision=1");
    expect(
      readRoute("/dungeon-master-other/plan", "/dungeon-master/").mode,
    ).toBe("PROFILE");
    expect(readRoute("/missing", "/").mode).toBe("PROFILE");
  });
  it("boots direct planning links but never boots a counting gate or fabricated result", () => {
    expect(initialRouteState("/plan", "/", false).mode).toBe("PLAN");
    expect(initialRouteState("/progress", "/", false).mode).toBe("PROGRESS");
    expect(initialRouteState("/", "/", true).mode).toBe("CAMERA_PERMISSION");
    for (const path of [
      "/workout",
      "/workout/paused",
      "/camera/setup",
      "/camera/countdown",
    ])
      expect(initialRouteState(path, "/", false)).toMatchObject({
        mode: "PLAN",
        selectedWorkoutId: null,
        workout: { ready: false },
      });
    expect(initialRouteState("/results", "/", false).mode).toBe("PROGRESS");
  });
  it("requires fresh calibration on history traversal while retaining an existing result", () => {
    const result = buildResult([], 0);
    const completed = {
      ...INITIAL_STATE,
      mode: "PROGRESS" as const,
      selectedWorkoutId: "bodyweight-squat",
      workoutResult: result,
    };
    expect(
      appReducer(completed, { type: "NAVIGATE", mode: "RESULTS" })
        .workoutResult,
    ).toBe(result);
    const resumed = appReducer(
      {
        ...completed,
        workout: { ...completed.workout, ready: true, progress: 1 },
      },
      { type: "NAVIGATE", mode: "WORKOUT" },
    );
    expect(resumed).toMatchObject({
      mode: "CALIBRATION",
      workout: { ready: false, progress: 0, profile: null, reps: [] },
    });
    expect(appReducer(resumed, { type: "COUNTDOWN_DONE" })).toBe(resumed);
  });
  it("does not restart the camera permission flow when returning to its history entry", () => {
    expect(
      appReducer(
        { ...INITIAL_STATE, mode: "MENU" },
        { type: "NAVIGATE", mode: "CAMERA_PERMISSION" },
      ).mode,
    ).toBe("TUTORIAL");
  });
});
