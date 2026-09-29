# Visual AI Core Instructions

Scope: `frontend/src/vision/`.

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

- `core/`: shared types, clocks, geometry, smoothing, stabilizers and event bus.
- `gestures/`: hand landmark mapping, pinch ratio, virtual cursor and command engine.
- `pose/`: pose selection, visibility and body-orientation helpers.
- `exercises/<exercise>/`: one exercise state machine and technique rules.
- `feedback/`: error prioritization and cooldown policy.
- `workers/`: optional inference worker protocol and adapters.

Low-level modules do not import React or manipulate DOM elements.

## Required semantic events

Use a discriminated union containing at least:

- `camera.ready`
- `camera.denied`
- `tracking.lost`
- `cursor.moved`
- `gesture.candidate`
- `gesture.confirmed`
- `calibration.updated`
- `workout.phase_changed`
- `workout.rep_completed`
- `workout.technique_error`
- `workout.paused`
- `workout.completed`

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
