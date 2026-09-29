# Dungeon Master Repository Instructions

These instructions apply to the entire repository. A nearer `CLAUDE.md` file
extends or overrides this file for its own subtree.

## Product

Dungeon Master is a browser-first fitness assistant controlled primarily through a
webcam. The complete demo flow is:

1. The user grants camera access.
2. The user learns the supported gestures.
3. The user navigates the interface without a mouse or keyboard.
4. The user calibrates their position for a supported exercise.
5. The application counts repetitions and detects selected technique errors.
6. The user receives concrete visual and audio correction.
7. The application displays a session result and optionally syncs it.

The first supported exercise is a side-view bodyweight squat. Do not add another
exercise until this flow is stable and tested.

## Read order

Before making changes, read:

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PROJECT_STRUCTURE.md`
4. `docs/VISION_PIPELINE.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. Every nearer `CLAUDE.md` or `AGENTS.md` file for the target directory

The existing files `backend/src/CLAUDE.md`,
`backend/src/api/CLAUDE.md`, and
`backend/src/migrations/postgres/CLAUDE.md` are authoritative for backend work.
Never replace or weaken them.

## Non-negotiable architecture

- Webcam frames and landmarks are processed in the browser.
- Do not stream live video, images, or per-frame landmarks to the backend.
- The backend receives only explicit user data and compact session summaries.
- The core gesture and workout demo must still work when the backend, OpenAI,
  Google Calendar, or ElevenLabs is unavailable.
- Visual recognition is deterministic and state-machine driven. Do not place an
  LLM or remote vision API in the real-time frame loop.
- React renders UI. Pure TypeScript modules own inference post-processing,
  smoothing, gesture classification, exercise state machines, and technique rules.
- The backend keeps its existing layer boundaries: schemas validate, models own
  SQL and transactions, controllers orchestrate, endpoints wire HTTP, provider
  adapters perform external I/O.
- Do not add repository, unit-of-work, command-bus, or generic service-layer
  abstractions to the backend.
- Every provider integration has a timeout, a typed error, and a deterministic
  fallback or clear degraded mode.

## Hackathon acceptance contract

The project must visibly demonstrate:

- Real-time webcam recognition in the browser.
- At least three distinct gestures or movements with different actions.
- Clear feedback that shows what the application recognized.
- One complete scenario from first motion to final result.
- A concrete error mode that explains what was wrong and how to correct it.
- A browser deployment that requires no local installation for the evaluator.

Primary gesture mapping:

- Index fingertip movement: virtual cursor.
- Thumb-index pinch: select the focused control.
- Closed fist held: go back.
- Thumb up held: confirm or start.
- Raised hand during a workout: pause or resume.

The first three are mandatory; the raised-hand command is an additional control.

## Safety and product boundaries

- Position the product as fitness and wellness support, not diagnosis,
  rehabilitation, treatment, or a replacement for a clinician.
- Only user-confirmed constraints may affect a generated plan.
- AI may select only from the server-side allowlisted exercise catalog.
- Deterministic filters run before and after AI generation.
- Do not claim clinical-grade motion analysis.
- Do not log health descriptions, OAuth tokens, uploaded documents, raw images,
  or secrets.
- Any future medical-document feature must be opt-in, isolated, and disabled in
  the hackathon MVP unless explicitly approved.

## Work rules

- Inspect the repository and `git status` before editing.
- Preserve current backend code and formatting conventions.
- Do not mass-rename or reorganize existing backend modules.
- Do not edit generated lockfiles by hand.
- Keep commits small and named by completed capability.
- Add or update tests in the same change as behavior.
- Never commit `.env`, credentials, OAuth tokens, model-provider keys, or personal
  health data.
- Declare all pre-existing scaffolding truthfully in the root README before
  submission.
- Do not create empty architecture layers merely to imitate enterprise patterns.

## Priority order

### P0 — submission-critical

- Gesture tutorial.
- Gesture-only menu navigation.
- Camera calibration.
- Squat repetition state machine.
- At least two concrete technique errors.
- Visual feedback, audio fallback, and results screen.
- Stable production build and deployment instructions.

### P1 — strong demo

- Guest profile and persisted workout session.
- Progress history.
- Server-provided exercise catalog and fallback workout plan.
- Phone-camera layout and responsive UI.

### P2 — optional integrations

- AI-assisted plan generation from an allowlist.
- Google Calendar event creation.
- Cached ElevenLabs voice assets.
- User-confirmed health constraints.

P2 must never delay or destabilize P0.

## Verification

Before reporting completion:

- Backend: run the existing lint, format and test commands from `backend/Makefile`.
- Backend coverage remains at least the configured threshold.
- Frontend: run type checking, unit tests, linting and production build.
- Test pure gesture and exercise rules with landmark fixtures.
- Test the complete scenario manually in a secure browser context.
- Verify behavior when the hand or body leaves the frame.
- Verify provider failures fall back without breaking the workout.
- Update `docs/development-log.md` or the repository development log after each
  completed sprint.

A task is not complete when only folders exist. It is complete when the current
sprint's acceptance criteria pass and the relevant documentation reflects reality.
