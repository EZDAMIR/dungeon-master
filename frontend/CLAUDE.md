# Frontend Instructions

Scope: `frontend/`.

Build a React + TypeScript + Vite browser application. Keep TypeScript strict.
Prefer small, explicit modules over framework-heavy abstractions.

## Layer responsibilities

- `src/app/`: application providers, router, top-level mode machine and startup.
- `src/pages/`: route-level composition only.
- `src/features/`: user-facing feature UI and feature state.
- `src/vision/`: pure camera/inference post-processing and movement logic.
- `src/audio/`: browser speech and cached-audio adapters.
- `src/api/`: typed backend client.
- `src/store/`: low-frequency global application state.
- `src/shared/`: reusable UI and utilities.

Pages and components may subscribe to visual events. They must not implement
landmark math, gesture thresholds, repetition logic, or technique rules.

## Visual runtime

- Camera access uses `getUserMedia`.
- Use MediaPipe Tasks Vision in the browser.
- Hand recognition drives menu navigation.
- Pose recognition drives workout analysis.
- Keep model files local under `public/models/` for a reliable demo.
- Process at a bounded inference rate rather than every display frame.
- Move heavy synchronous inference to a worker when supported by the selected API.
- Store per-frame mutable data in ordinary objects or refs, not React state.
- Update React state only for semantic events such as focused target, confirmed
  command, repetition, error, phase or result.

## Gesture-only UX

- The primary demo path must be completable without a mouse or keyboard after
  browser camera permission is granted.
- Use large, separated targets suitable for an imprecise virtual cursor.
- Show the virtual cursor, recognized gesture, hold progress and cooldown.
- Require a hold for destructive or navigation actions.
- Disable menu gestures while an exercise state machine is active, except the
  documented pause command.
- Provide a visible and audible response to every confirmed command.
- Keep conventional controls as an accessibility and debugging fallback, but do not
  rely on them in the demo.

## Reliability

- No backend request belongs in the frame loop.
- No provider request belongs in the frame loop.
- The tutorial, menu, calibration, workout, correction and result screen must work
  with a seeded local workout.
- If the backend fails, queue or discard optional sync and keep the session result
  visible.
- If audio fails, visual feedback remains complete.

## Testing

- Unit-test geometry, smoothing, hysteresis, hold/cooldown, state transitions,
  repetition counting and error rules with fixture landmarks.
- Mock MediaPipe at component boundaries.
- Do not require a real camera in unit tests.
- Add one browser smoke test for the complete flow using a fake vision event source.
