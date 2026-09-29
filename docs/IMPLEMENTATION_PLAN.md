# Implementation Plan

Implement one sprint at a time. P0 visual functionality is more important than
optional integrations.

## Sprint 0 — Architecture and runnable shells

Goal: establish the monorepo structure without changing backend behavior.

Tasks:

- Add root agent files and architecture docs.
- Preserve existing backend instructions.
- Initialize `frontend/` with React, TypeScript and Vite.
- Add strict type checking, linting and unit-test commands.
- Create route placeholders for tutorial, menu, calibration, workout and results.
- Add a fake `VisionEvent` source to drive the full route flow.
- Add a root README with truthful pre-existing scaffold disclosure.
- Confirm existing backend tests still pass.
- Confirm the frontend production build passes.

Acceptance:

- Both applications start.
- Fake events can drive the user from tutorial to result.
- No camera or backend domain work is required yet.
- Existing backend architecture files are unchanged.

## Sprint 1 — Gesture navigation

Goal: complete browser navigation without mouse or keyboard after permission.

Tasks:

- Camera permission and preview.
- Hand recognizer adapter.
- Virtual cursor.
- Pinch selection with hysteresis.
- Fist back command with hold and release.
- Thumb-up confirm command with hold and release.
- Gesture tutorial.
- Focus feedback, progress ring and command audio.
- Hand-lost recovery feedback.
- Pure fixture tests.

Acceptance:

- Three commands work reliably.
- Accidental repeat commands are prevented.
- The menu is usable at normal webcam distance.
- The user always sees what the system recognizes.

## Sprint 2 — Squat workout and error mode

Goal: complete the fitness scenario locally.

Tasks:

- Pose recognizer.
- Side-view and full-body calibration.
- Pose smoothing.
- Squat phase state machine.
- Complete-cycle repetition counting.
- At least two concrete technique errors.
- Pause/resume.
- Results summary.
- Browser speech or cached local audio.
- Fixture tests and fake-camera smoke flow.

Acceptance:

- Correct repetitions count.
- Selected incorrect repetitions produce specific correction.
- Loss of visibility pauses analysis rather than inventing results.
- The full scenario ends with a result screen.
- No backend or provider is required.

## Sprint 3 — Core backend domains

Goal: persist profile, catalog, plans and sessions using the existing architecture.

Domain order:

1. Users or guest identity.
2. Profiles and confirmed constraints.
3. Exercises.
4. Deterministic training plans.
5. Workout sessions and progress.

For each domain:

- table metadata;
- generated migration;
- schemas;
- model functions;
- controller;
- endpoint;
- router registration;
- layer tests.

Acceptance:

- Existing and new backend tests pass at the configured coverage threshold.
- The frontend can work in guest/local mode and optionally sync.
- Session sync contains aggregates only.

## Sprint 4 — Optional integrations

Implement independently behind capability checks.

### AI plan generation

- Filter eligible exercises first.
- Use structured output.
- Validate every returned exercise ID.
- Fall back deterministically.
- Persist generator and prompt version.

### Google Calendar

- OAuth state protection.
- Minimum scopes.
- Encrypted tokens.
- Idempotent event links.
- Retryable status.

### Voice

- Generate reusable clips or a final summary.
- Cache assets.
- Browser speech remains the fallback.
- Never call remote TTS per frame or repetition.

## Sprint 5 — Submission hardening

- Deploy frontend over HTTPS.
- Deploy backend and database.
- Configure CORS.
- Test on laptop and phone camera.
- Verify fresh-clone instructions.
- Verify denied-camera and provider-failure paths.
- Record a backup demo video.
- Complete README disclosure and project description.
- Confirm the public repository and commit history are ready for judging.

## Stop conditions

Stop optional work and return to P0/P1 when:

- production build fails;
- core gesture flow regresses;
- squat counting is unstable;
- the result screen depends on a network call;
- provider integration consumes time needed for deployment or README.
