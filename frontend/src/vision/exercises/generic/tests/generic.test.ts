import { describe, expect, it } from "vitest";
import fixture from "./calfSpec.json";
import { validateSpec } from "../validator";
import { condition } from "../conditionEvaluator";
import { PhaseMachine } from "../phaseMachine";
import { localized } from "../types";
import { GenericAnalyzer } from "../genericAnalyzer";
import { FeatureEvaluator } from "../featureEvaluator";
import {
  calfPose,
  calfCycle,
} from "../../../../../tests/fixtures/pose/generic";
import type { VisionEvent } from "../../../../types/vision";
describe("Sprint 4A declarative camera runtime", () => {
  it("counts complete landmark cycles, rejects small range and keeps one correction", () => {
    const parsed = validateSpec(fixture);
    if (!parsed.valid) throw Error("fixture");
    const analyzer = new GenericAnalyzer(parsed.spec, 3, "kk");
    for (let at = 0; at <= 800; at += 50) analyzer.update(calfPose(at), at);
    analyzer.setStage("workout");
    const events: VisionEvent[] = [];
    for (const sample of calfCycle(850))
      events.push(...analyzer.update(sample, sample.at));
    for (const sample of calfCycle(3900, 0.047))
      events.push(...analyzer.update(sample, sample.at));
    const reps = events.filter((e) => e.type === "workout.rep_completed");
    expect(reps).toHaveLength(2);
    expect(reps.map((e) => e.accepted)).toEqual([true, false]);
    expect(
      events.some(
        (e) =>
          e.type === "workout.generic_updated" &&
          e.view.primary === "Қозғалысты сәл толық орында",
      ),
    ).toBe(true);
    for (let at = 6950; at <= 7300; at += 50) analyzer.update(calfPose(at), at);
    expect(analyzer.result(7300).totalReps).toBe(2);
    expect(analyzer.result(7300).genericErrorCounts).toEqual({
      range_too_small: 1,
    });
  });
  it("cancels a partial cycle after tracking loss and finishes after the target", () => {
    const parsed = validateSpec(fixture);
    if (!parsed.valid) throw Error("fixture");
    const analyzer = new GenericAnalyzer(parsed.spec, 1);
    for (let at = 0; at <= 800; at += 50) analyzer.update(calfPose(at), at);
    analyzer.setStage("workout");
    for (const sample of calfCycle(850).slice(0, 25))
      analyzer.update(sample, sample.at);
    expect(
      analyzer.update(null, 2100).some((e) => e.type === "pose.tracking_lost"),
    ).toBe(true);
    for (let at = 2150; at <= 2450; at += 50) analyzer.update(calfPose(at), at);
    expect(analyzer.result(2450).totalReps).toBe(0);
    const events = calfCycle(2500).flatMap((s) => analyzer.update(s, s.at));
    expect(events.filter((e) => e.type === "workout.completed")).toHaveLength(
      1,
    );
    expect(analyzer.update(calfPose(6000), 6000)).toEqual([]);
  });
  it("resets repetition averages and enforces label bounds on the client", () => {
    const parsed = validateSpec(fixture);
    if (!parsed.valid) throw Error("fixture");
    parsed.spec.features.push({
      id: "mean",
      operation: "average",
      points: [],
      inputs: ["movement"],
      normalize_by: null,
      scope: "rep",
    });
    const evaluator = new FeatureEvaluator(parsed.spec);
    evaluator.baseline = { height: 0 };
    evaluator.evaluate(calfPose(0, 0.1), "left");
    evaluator.resetRep();
    expect(evaluator.evaluate(calfPose(50, 0), "left").mean).toBeCloseTo(0);
    const invalid = structuredClone(fixture);
    invalid.phases[0].messages.ru = "я".repeat(33);
    expect(validateSpec(invalid).valid).toBe(false);
  });
  it("rejects code and dangling graph references", () => {
    expect(validateSpec(fixture).valid).toBe(true);
    expect(validateSpec({ ...fixture, script: "alert(1)" }).valid).toBe(false);
    const broken = structuredClone(fixture);
    broken.transitions[0].to = "absent";
    expect(validateSpec(broken).valid).toBe(false);
  });
  it("uses bounded multilingual fallback", () => {
    expect(localized({ ru: "Медленнее", en: "Slow" }, "kk")).toBe("Медленнее");
    expect(localized({ en: "Slow" }, "kk")).toBe("Slow");
    expect(localized({ ru: "x".repeat(57) }, "ru")).toBe(
      "Продолжайте спокойно",
    );
  });
  it("evaluates explicit operators only", () => {
    expect(
      condition(
        {
          feature: "x",
          operator: "between",
          value: 1,
          upper: 3,
          tolerance: 0.01,
        },
        { x: 2 },
        {},
      ),
    ).toBe(true);
    expect(
      condition(
        {
          feature: "x",
          operator: "trend_up",
          value: 0.5,
          upper: null,
          tolerance: 0.01,
        },
        { x: 2 },
        { x: 1 },
      ),
    ).toBe(true);
    expect(
      condition(
        {
          feature: "x",
          operator: "gt",
          value: 1,
          upper: null,
          tolerance: 0.01,
        },
        {},
        {},
      ),
    ).toBe(false);
  });
  it("requires held transitions and a complete cycle; resets partials on tracking loss", () => {
    const parsed = validateSpec(fixture);
    if (!parsed.valid) throw Error("fixture");
    const m = new PhaseMachine(parsed.spec);
    expect(m.update({ movement: 0.03 }, {}, 0).completed).toBe(false);
    expect(m.update({ movement: 0.03 }, {}, 100).stage).toBe("moving");
    m.cancel();
    expect(m.update({ movement: 0 }, {}, 200).completed).toBe(false);
    for (const [at, height] of [
      [400, 0.03],
      [500, 0.03],
      [700, 0.05],
      [800, 0.05],
      [1100, 0.03],
      [1200, 0.03],
      [1800, 0],
    ] as const)
      m.update({ movement: height }, {}, at);
    expect(m.update({ movement: 0 }, {}, 1900).completed).toBe(true);
    expect(m.update({ movement: 0 }, {}, 2000).completed).toBe(false);
  });
});
