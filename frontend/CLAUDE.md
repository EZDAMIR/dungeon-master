# Frontend Instructions

Scope: `frontend/`.

Build a React + TypeScript + Vite browser application. Keep TypeScript strict.
Prefer small, explicit modules over framework-heavy abstractions.

## Folder instructions

Read this file and each nearer `CLAUDE.md` before editing. Every authored folder,
including tests, scripts, assets and reserved folders, has its own guide describing
purpose, code rules, dependencies and verification. `AGENTS.md` applies alongside
these guides; `AGENT.md` remains a compatibility entrypoint.

This instruction style is adapted from
[1wash-front's folder guides](https://github.com/Ya-Sabyr/1wash-front/tree/main/src),
using Dungeon Master's existing architecture and stack. Keep direct imports and
flat modules until an implemented capability needs more structure. Add entities,
widgets, barrel exports or new libraries only for a demonstrated need.

`npm run check:instructions` verifies nonempty guides and their local links for all
authored folders. Dependencies, build output and generated model/WASM directories
are excluded using git's ignore rules. Run `npm run test:instructions` when changing
the checker. Add a guide when adding an authored folder.

## Layer responsibilities

- `src/app/`: application providers, router, top-level mode machine and startup.
- `src/pages/`: route-level composition only.
- `src/features/`: user-facing feature UI and feature state.
- `src/vision/`: pure camera/inference post-processing and movement logic.
- `src/audio/`: browser speech and cached-audio adapters.
- `src/api/`: typed backend client.
- `src/store/`: low-frequency global application state.
- `src/types/`: provider-neutral semantic event contracts.
- `src/shared/`: reusable UI and utilities.

Pages and components may subscribe to visual events. They must not implement
landmark math, gesture thresholds, repetition logic, or technique rules.

`app` composes pages/features; pages render state and callbacks; features integrate
vision contracts. Shared runtime modules must not import features, pages or app.
Current type-only app snapshot/mode imports at UI and runtime boundaries are
permitted. Pure vision processors must not depend on app types or UI modules.
Browser/MediaPipe adapters may use video and camera APIs; they remain separate
from deterministic math and state machines.

Use PascalCase component filenames, camelCase helper filenames and descriptive
feature folders. Keep strict types, explicit props and early returns. Follow the
existing CSS, oxlint and Vitest setup. Refactor only to clarify responsibilities,
remove repeated logic or fix an observed issue, with focused behavior tests.

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
