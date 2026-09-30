# Visual AI Core Instructions

Scope: `frontend/src/vision/`. Extends [source instructions](../CLAUDE.md).
Read the nearer folder guide before editing primitives, adapters or exercises.

This directory owns deterministic, client-side interpretation of hand and body
landmarks. It must remain usable without React, routing, the backend, or external
providers.

## Pipeline

```text
camera frame
  -> recognizer adapter
  -> normalized landmark sample
  -> visibility validation
  -> smoothing
  -> gesture or exercise analyzer
  -> temporal stabilizer
  -> semantic VisionEvent
  -> application action and feedback
```

## Module boundaries

- `core/`: camera lifecycle, clocks, configuration, geometry, smoothing and hold gates.
- `gestures/`: hand landmark mapping, pinch ratio, virtual cursor and command engine.
- `pose/`: recognizer adapter, side selection, visibility, calibration, smoothing,
  pause gate and pose-session orchestration.
- `exercises/<exercise>/`: one exercise state machine and technique rules.
- `feedback/`: error prioritization and cooldown policy.
- `workers/`: optional inference worker protocol and adapters.

Pure processing modules do not import React, app types, or manipulate DOM elements.
Camera and recognizer adapters may use browser video APIs and MediaPipe; they must
not query UI targets, navigate or call backend/providers.

## Required semantic events

Use the existing discriminated union in `../types/vision.ts`. Current event groups
include:

- `camera.ready`
- `camera.denied`
- `camera.error`
- `tracking.lost`
- `cursor.moved`
- `gesture.candidate`
- `gesture.confirmed`
- `calibration.updated`
- `calibration.completed`
- `calibration.required`
- `workout.phase_changed`
- `workout.rep_completed`
- `workout.technique_error`
- `workout.paused`
- `workout.completed`

This list is illustrative; `src/types/vision.ts` is the exact contract. Do not
invent an event bus or duplicate the union merely to match a folder template.

Events carry timestamps from one monotonic clock.

## Temporal stability

Never confirm a command or error from one frame.

- Smooth landmarks before geometry.
- Use separate enter and exit thresholds for pinch detection.
- Require a stable hold for fist and thumb-up commands.
- Require release before the same command can fire again.
- Apply a cooldown after confirmation.
- Require an error condition in N of the latest M samples.
- Rate-limit audio and repeated error cards independently.

Thresholds are starting defaults and must be calibrated against fixtures and several
people. They are not universal truths.

## Exercise analyzers

Each analyzer exposes a small interface similar to:

```ts
interface ExerciseAnalyzer {
  reset(calibration: CalibrationProfile): void;
  update(sample: PoseSample): readonly VisionEvent[];
  snapshot(): ExerciseSnapshot;
}
```

The side-view squat analyzer owns:

- body-ready validation;
- standing, descending, bottom and ascending phases;
- complete-cycle repetition counting;
- minimum depth relative to calibration;
- movement duration;
- final extension;
- selected visibility or camera-angle errors.

Do not label a repetition medically safe or unsafe. Report only the visual rule that
was observed and a concrete, limited correction.

## Performance and privacy

- Do not allocate large arrays on every frame.
- Bound inference frequency.
- Do not retain frames after processing.
- Do not upload frames or raw landmark streams.
- Session persistence uses aggregates and error counts only.
