import { SquatAnalyzer } from "../squat/analyzer";
import type { CalibrationProfile } from "../../pose/types";
import { GenericAnalyzer } from "./genericAnalyzer";
import { validateSpec } from "./validator";
import type { Language } from "./types";
export function analyzerFactory(
  key: string,
  spec: unknown,
  target: number,
  language: Language = "ru",
  legacy?: CalibrationProfile,
) {
  if (key === "bodyweight_squat" && legacy?.version === "squat-calibration-v1")
    return new SquatAnalyzer(legacy);
  const result = validateSpec(spec);
  return result.valid && Number.isInteger(target) && target >= 3 && target <= 20
    ? new GenericAnalyzer(result.spec, target, language)
    : null;
}
