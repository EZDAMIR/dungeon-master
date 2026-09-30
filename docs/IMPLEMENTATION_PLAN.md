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
- Continuous two-finger natural scrolling, with cursor clutch and contained panel/modal scrolling.
- Pure fixture tests.

Acceptance:

- Three commands work reliably.
- Accidental repeat commands are prevented.
- The menu is usable at normal webcam distance.
- The user always sees what the system recognizes.

Sprint 1 implementation status (2026-09-30): camera lifecycle, MediaPipe adapter,
self-hosted verified assets, pointer/pinch/holds, targets/HUD/overlay, interactive
five-step tutorial and MENU selection/confirmation are implemented. Fake events
share the real semantic mapper. Automated frontend/backend checks and build are
recorded in `development-log.md`. CALIBRATION remains a placeholder.

Real webcam verification and person/device threshold tuning are pending. Acceptance
of recognition reliability remains pending until `SPRINT_1_MANUAL_CHECKLIST.md` is
performed. Sprint 2 implementation is recorded below.

## Sprint 2 — Pose Calibration and Squat Coaching

Goal: complete the fitness scenario locally.

Tasks:

- Pose recognizer.
- Side-view and full-body calibration.
- Pose smoothing.
- Squat movement state machine.
- Complete-cycle repetition counting.
- Three concrete technique errors: depth_insufficient, too_fast, incomplete_extension.
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

Sprint 2 implementation status (2026-09-30): official pinned Pose Landmarker Lite,
one-camera serial recognizer switching, sequential stable calibration, active-side
locking, EMA, skeleton, countdown readiness cancellation, complete-cycle squat
counting, three rejecting technique rules, recovery, pose pause/resume, local audio,
five-total-cycle results and development fake pose replay are implemented. Pure,
lifecycle and rendered semantic-flow tests cover these behaviors. Backend remains
unchanged. Automated/asset verification is in the development log.

Real camera acceptance and person/device threshold tuning: **not performed**.
Use `SPRINT_2_MANUAL_CHECKLIST.md` before claiming reliable real-world recognition.
Implementation does not establish clinical accuracy or injury assessment.

## Sprint 3 — Core Backend Domains, Persistence and Progress

Goal: add durable guest/profile/catalog/plan/session/progress capabilities while
camera and immediate local results remain independent of the backend.

Implemented in separate commits:

1. Camera-distance feedback banner with persistent high-contrast corrections.
2. Guest users, null-email JWTs, seven permissions and persisted `/auth/me`.
3. Full-replacement profile and explicitly confirmed constraint transaction.
4. Allowlisted squat seed and canonical controller-level eligibility helper.
5. `deterministic-v1` weekly plans, atomic archive/create/items and unique active index.
6. Typed aggregate sessions, client UUID idempotency and guarded immutable completion.
7. Completed-only progress totals and recent history, filtered by current user.
8. Typed frontend client, singleton bootstrap, gesture Profile/Plan/Progress,
   background sync, bounded pending queue and honest offline/cached states.
9. Domain/API/database/security tests, fresh migration chain and metadata drift checks.
10. Setup, contract, privacy, failure and manual-acceptance documentation.

Automated acceptance (2026-09-30): backend check and 161 tests pass with 99.19%
coverage against a disposable local DB; frontend lint/type checking and 116 tests
pass with coverage gates retained. Both root/subdirectory builds and asset delivery
are verified. Existing gesture/pose tests remain. No external provider dependency,
raw vision persistence, architecture rewrite or Sprint 4 implementation was added.

Manual acceptance is **not performed**: live camera, distance readability,
new-screen gestures, real browser persistence/reconnection and multi-user workflow
remain checklist work. See `SPRINT_3_MANUAL_CHECKLIST.md`; do not mark the sprint's
full Definition of Done complete before those checks. Guest expiry creates a new
identity without a refresh credential, and a full 20-entry pending queue cannot
persist a 21st result. These limits are documented rather than hidden.

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

## Sprint 4A — Personal AI Coach delivered scope

Context and confirmed document facts feed lightweight RAG and structured AI profiles/plans. Generated private exercises receive validated MovementSpecs, one repair and a manual fallback. The existing browser runtime executes generic coaching and saves aggregates through the current progress system. Figma retains the editorial planning and graphite/citron workout architecture; three synthetic jury personas compare without input or provider delay. [Report](SPRINT_4A_REPORT.md), [mapping](FIGMA_SPRINT_4A_MAP.md), [QA](FIGMA_VISUAL_QA.md) and [manual checklist](SPRINT_4A_MANUAL_CHECKLIST.md) provide evidence.

Sprint 4A completion checks: implemented context/upload/chunking/RAG/profile/plan/spec validation, generic counting/correction, legacy squat, ownership, aggregate sync, deterministic/manual fallbacks, Maya/Arman/Dana, source-linked reasons, details, honest unavailable swaps, localized cues, voice fallback and responsive layouts. Screenshot review is recorded with deviations; physical distance readability, actual webcam execution and live provider latency are pending manual checks. A tablet camera counterpart is inferred because the existing tablet node is a plan. No Sprint 4B integration is implemented.

The expanded [Sprint 4A Definition of Done](SPRINT_4A_DEFINITION_OF_DONE.md) tracks both the original implementation criteria and the Figma alignment patch. Hardware, exact visual parity and absent tablet camera source are explicitly unchecked.
