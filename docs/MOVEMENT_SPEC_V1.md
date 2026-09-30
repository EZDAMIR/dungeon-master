# Sprint 4A — MovementSpec V1

The authoritative strict schema is `backend/src/api/schemas/movement_spec.py`; its exported JSON schema is `frontend/src/vision/exercises/generic/schema.json`. The frontend validator also checks semantic references and graph reachability before the interpreter starts. Unknown fields, executable-code fields, invalid landmarks/operations, non-finite numbers and dangling references are rejected.

A spec contains `version`, exercise identity, camera angle/scope/required landmarks/visibility, stable calibration and baseline features, ordered features, 2–8 movement stages, held transitions, a complete repetition edge and duration bounds, at most 12 error rules, and coach messages. Feature dependencies must precede their users. Repetition completion returns to the starting stage. Calibration motion, tracking loss, pauses, stale frames and long gaps cancel partial repetitions; completed totals remain. Calibration does not prove medical safety.

| Feature operation | Meaning |
|---|---|
| angle | Three-point angle in degrees, aspect-ratio corrected |
| distance / normalized_distance | Two-point distance, optionally divided by torso scale |
| relative_x / relative_y | Signed coordinate difference |
| position_x / position_y | Landmark position |
| velocity_x / velocity_y | Coordinate change per second, bounded frame gap |
| delta | Difference from a calibrated baseline feature |
| visibility | Landmark visibility |
| body_scale | Shoulder-to-hip distance |
| average / minimum / maximum | Previously computed features; optional repetition accumulation |

Conditions allow `gt`, `gte`, `lt`, `lte`, `between`, `approximately`, `trend_up`, `trend_down`. Landmarks allow nose, shoulder, elbow, wrist, hip, knee, ankle, heel, foot_index and left/right/active aliases. The active side locks after calibration. The camera-angle heuristic is not a measured 3D orientation.

Primary/calibration/correction/ready/good-repetition/recovery/completed messages contain `{ru, kk, en}`; values may be absent but at least one must exist. Fallback is requested language → RU → EN → stable system copy. Primary cues are at most 56 Unicode characters and two explicit lines; secondary explanations 120, stage labels 32 and titles 48. The browser measures wrapping and substitutes short readable copy when needed, retaining the display font size. Two visual lines depend on available width and are checked in the browser. No workout-time LLM translation occurs.

`GenericAnalyzer` evaluates frame features, transitions and held errors, counts completed attempts and accepted repetitions, and produces aggregate generic error counts. Attempts below minimum duration are rejected with a stable localized tempo correction. Frame errors accumulate once per completed attempt. A correction persists for at least 1.8 seconds unless tracking/readiness takes priority. Only one primary cue is displayed: readiness → correction → positive → movement instruction.

`analyzerFactory` preserves the stable legacy squat path; valid other declarations select GenericAnalyzer. Invalid/missing declarations select manual execution at the UI boundary. The backend performs one repair call and persists `manual_only` if validation still fails. Internal validation errors stay out of user-facing responses.

Synthetic calf and squat specs and synthetic landmark replay exercise the interpreter. Tests cover complete cycles, range corrections, tracking recovery, held transitions, no duplicate completion, repetition-average reset and localization. The browser result uses `generic-v1`; manual completion uses `manual-v1` with no claimed technique/repetition assessment. Legacy squat metrics and `squat-v1` remain unchanged.
