# Dungeon Master development log

## 2026-09-30 — Sprint 0 architecture follow-up: frontend folder instructions

Acceptance for this task: every authored frontend folder has guidance tied to its
current code, and the existing Sprint 1–2 local flow continues to pass checks.
This extends the Sprint 0 architecture documentation without implementing any
later-sprint capability. The working tree was clean at the start.

Read `Ya-Sabyr/1wash-front` through authenticated, read-only GitHub CLI requests:
the root and app/pages/features/entities/widgets/shared `CLAUDE.md` guides. Web and
connector access could not resolve the repository; the locally authenticated CLI
could. Its purpose/responsibility/dependency style was adapted to Dungeon Master's
existing layers and stack. No changes were made to the reference repository.

Added 41 folder-specific `CLAUDE.md` files, so all 43 authored frontend folders
now have instructions, including scripts, assets, test directories, fixtures and
reserved folders. Reserved guides explicitly describe unimplemented capabilities.
Updated frontend entrypoints, the source/vision boundary descriptions, README and
project-structure documentation. Browser adapters may use video APIs; pure vision
processors remain independent of React, UI targets and backend availability.

Moved `CameraStage.tsx` from `shared/components/` to `features/workout/` because
it composes the gesture store and pose overlay. Updated App and the existing
overlay tests. Its behavior and lifecycle are unchanged; shared components now
have no feature imports. Existing type-only app state imports remain explicit
UI/runtime contracts; this task does not introduce FSD layers or barrel exports.

Added `check:instructions`, which derives authored folders from tracked and
nonignored untracked frontend paths, checks nonempty guides and validates local
guide links. Generated models/WASM, dependencies and build output are excluded
by git ignore rules. Two Node tests cover ancestor/placeholder/fixture coverage,
missing/empty guides and broken/inherited links. The first broader test run exposed
Vitest discovering Node tests named `.test.mjs`; naming them `.node-test.mjs`
keeps the runners separate, and the subsequent complete suite passed.

| Command/check | Result |
|---|---|
| `cd frontend && npm run check:instructions` | Passed: 43 authored folders; initially failed on the 41 missing guides |
| `npm run test:instructions` | Passed: 2 Node tests |
| `npm run test -- src/features/gesture-navigation/__tests__/overlays.test.tsx src/features/workout src/app/__tests__/App.test.tsx` | Passed: 9 focused tests |
| `npm run lint` | Passed |
| `npm run type-check` | Passed |
| `npm run test` | Final run passed: 93 tests in 17 files |
| `npm run build` | Passed; both pinned model checksums verified and local WASM prepared |
| `python3 scripts/verify_architecture.py` | Passed; scaffold check only |
| `git diff --check` | Passed |
| Shared import inspection / backend diff | No shared feature imports; backend unchanged |

Limitations: instruction checks validate coverage/content presence and local links,
not semantic compliance with every rule. Real-camera testing was not performed;
existing Sprint 1–2 device/person reliability acceptance remains pending. Backend
tests were not rerun because no backend files or contracts changed.

Next safe task: perform `SPRINT_1_MANUAL_CHECKLIST.md` and
`SPRINT_2_MANUAL_CHECKLIST.md`, then tune named configuration only from observations.

## 2026-09-30 — Sprint 1: Gesture Navigation

Branch: `sprint/gesture-navigation`.
Starting commit: `e9206e411ac65a04011e797ef1a61c2aadba756c`.

The working tree was clean initially. The requested reference `9ec09a95cb89a42ef58d57babfaa0fe6449db825` exists locally but is not an ancestor of the current main history. Current HEAD is later (02:34:58 +05:00 versus 02:11:43 +05:00); tree comparison shows the same scaffold with terminology/document updates. Work preserves the current history and starts from that later HEAD. No push or history rewrite was performed.

Implemented:

- Controlled video-only permission flow and camera manager with typed errors, play-before-ready, track-ended handling, startup/disposal guards and cleanup.
- Official exact `@mediapipe/tasks-vision` 1.0.1 adapter, checked against installed TypeScript declarations; one hand, VIDEO, GPU initialization with one CPU fallback.
- Reproducible official version-1 model download with SHA-256 validation and self-hosted WASM copied from the exact dependency. Automatic dev/build preparation and BASE_URL asset paths.
- Pure mirrored ROI cursor mapping, exponential smoothing, normalized pinch geometry with hysteresis/three entry samples, and held fist/Thumb Up with release/cooldown.
- Semantic events, pure application mapper/reducer, selected-workout state and camera permission mode. Pinch selects in MENU; Thumb Up confirms to CALIBRATION. Fist supports back and verifies tutorial steps.
- Five-step interactive tutorial with stable hand detection, cursor target, pinch, fist and Thumb Up. Returning to tutorial works with an already tracked hand.
- Registered accessible targets, cursor overlay, hand canvas (mirroring/letterboxing/DPR/resize), HUD/progress/recovery instructions and optional local Web Audio.
- Development-only FakeSource with the same VisionEvent pipeline; production strips fake controls.
- Source tests for bounded inference, disposal during model startup, camera errors, visibility pause/resume and one scheduled loop. Frame positions/raw landmarks do not update App state.

Verification:

| Command/check | Result |
|---|---|
| `cd frontend && npm ci` | Passed; exact lockfile installs |
| `npm run lint` | Passed, no warnings/errors |
| `npm run type-check` | Passed; checks both project references with existing strict/erasable syntax settings |
| `npm run test` | 53 tests passed in 9 files |
| `npm run test:coverage` | 53 passed; statements/lines 87.07%, branches 89.65%, functions 83.63% over runtime src; pure vision core/gestures lines 100% |
| `npm run build` | Passed; verified model SHA-256 and WASM byte parity in production output |
| `npx --no-install vite build --base=/dungeon-master/ --outDir=/private/tmp/dungeon-master-sprint1-build` | Passed; model/WASM/bundle URLs use the subdirectory base and files exist |
| Production bundle inspection | Fake controls removed; model/WASM use local paths |
| `python3 scripts/verify_architecture.py` | Passed; this existing checker verifies scaffold structure only |
| Pure core source inspection | No React, DOM target queries/clicks, backend/provider calls or video upload |
| `cd backend && make check` | Passed: Ruff format/check |
| `cd backend && make test` | 95 passed; 96.39% coverage, above the existing 90% gate |
| `git diff --check` | Passed |

Tests were first added before camera/gesture modules as required by the vision instructions, then made green. Tests found cross-environment DOMException handling, hold cooldown/release interaction and tutorial restart tracking issues; fixes retain the original TypeScript constraints. The previous solution-level type-check script did not check application references; it now runs `tsc -b`. Coverage is scoped to runtime `src/`, excluding generated vendor loaders, tests and type-only contracts; existing later-screen scaffold remains included.

Real camera verification: **not performed**. No browser/webcam tool is available in this environment. Camera/model tests are mocks, and real inference latency, tracking stability, GPU/browser compatibility and thresholds on different people are unverified. See `SPRINT_1_MANUAL_CHECKLIST.md` (24 steps plus device/lighting matrix). Code and automated acceptance are implemented; real-camera reliability acceptance remains pending.

A separate edit appeared in `AGENT_PROMPT.md` during work (leading `/` in the first heading). It was reported, preserved and excluded from Sprint 1 commits. Backend code, protected architecture contracts and later-Sprint capabilities were not changed.

Privacy: no microphone, video recording, image retention, raw frame upload or backend/provider request in the frame loop. Only model/WASM assets are loaded. Generated assets, build output, coverage and dependencies are excluded from git.

Next safe task: execute the Sprint 1 manual camera checklist and tune configuration only if observations require it. Sprint 2 remains planned: pose calibration, squat state machine, repetition counting and concrete technique-error feedback.

## 2026-09-30 — Sprint 2: Pose Calibration and Squat Coaching

Branch: `sprint/pose-squat-coaching`. Starting commit: `6c31b4343c23a66daa6f50d111d7dfa9ef253e09`, the final local and origin `sprint/gesture-navigation` commit after `git pull`. An existing uncommitted leading `/` in `AGENT_PROMPT.md` was inspected, reported, preserved and excluded from all Sprint 2 commits. No history rewrite or main-branch work occurred. Backend files are unchanged.

Implemented the sole `bodyweight_squat_side_v1` profile: pinned official MediaPipe Pose Landmarker Lite; provider-neutral samples; named indices; aspect-correct finite geometry; raw visibility/margins/body scale; normalized median-window side-view heuristic and stable active-side selection; sequential body/angle/median standing calibration; EMA and outlier rejection; complete-cycle squat state machine with hysteresis, direction holds, partial cancellation and timeout; rep metrics and three rejecting errors; prioritized, expiring semantic feedback; countdown readiness cancellation; pose-only hold/release pause/resume; high-DPI mirrored skeleton; local speech/tone with cooldown; five-total-cycle results; development-only synthetic pose replay through the real semantic mapper.

The shared `RealVisionSource` owns one camera/video and serializes close/initialization/scheduling. Pose modes reuse one pose recognizer; RESULTS restores hand navigation without camera reacquisition. A generation plus scheduled callback token guards late initialization/stale callbacks. Visibility changes cancel the partial rep and schedule one loop on return. Raw samples remain in a mutable presentation object, outside React global state; stored results contain only five reps' metrics. Fake hand and pose controls share one monotonic replay clock.

Technique semantics: depth minimum knee >112°, observed descent <450 ms or total <1000 ms, or confirmed descent after an incomplete ascent. Each code is counted once per completed rep; all three reject. An incomplete-extension reversal closes one rejected previous cycle, then requires standing synchronization. Target is five total, including rejected cycles. Readiness errors never inflate rep/error counts. All defaults and exact corrections are documented in `VISION_PIPELINE.md`; none were tuned on real people in this environment.

Verification on the final code:

| Command/check | Result |
|---|---|
| `cd frontend && npm ci` | Passed; 198 installed packages. Existing transitive deprecation notices; no dependency/lockfile changes |
| `npm run lint` | Passed; zero warnings/errors, unchanged zero-warning baseline |
| `npm run type-check` | Passed with existing strict TypeScript settings |
| `npm run test` | 93 passed in 17 files; existing gesture tests retained |
| `npm run test:coverage` | 93 passed; statements/lines 97.76%, branches 90.57%, functions 92.82% |
| `npm run build` | Passed; both verified models and installed WASM included |
| `npm run build -- --base=/dungeon-master/` | Passed; local model/WASM paths include the base |
| `npm run preview -- --host 127.0.0.1 --port 4174 --base=/dungeon-master/` | HTTP index/models/all 6 installed WASM files served; both model SHA-256 and WASM byte parity verified |
| Production bundle inspection | Fake hand/pose controls absent; model/WASM BASE_URL strings correct |
| Cached asset preparation with fetch forbidden | Passed; correct task files reused without fetch or rewriting |
| Simulated bad official pose download | Script failed on checksum mismatch; no invalid pose task/temp file installed |
| Separate local `git clone --no-local --branch sprint/pose-squat-coaching ... /private/tmp/dungeon-master-sprint2-clean` | Clean tracked source at final code commit `e58bc34`; no models/WASM/node_modules were copied |
| Clean clone `npm ci`, `npm run build`, non-root build | Passed; both official models downloaded automatically and WASM prepared from installed package |
| Clean clone preview on port 4175 with matching base | Index/both models/WASM HTTP 200; model checksums, WASM parity and production paths verified |
| `python3 scripts/verify_architecture.py` | Passed; existing checker verifies scaffold structure only |
| Pure-core inspection | No React, routes, AppMode, DOM queries/clicks, backend/provider request or raw-frame upload |
| `cd backend && make check` | Passed: 48 formatted files, Ruff checks passed |
| `cd backend && make test` | 95 passed; coverage 96.39%, existing 90% gate retained |
| `git diff --check` | Passed |

Focused tests were added before implementing pure calibration primitives, then expanded with JSON replay, lifecycle, audio and rendered UI integration. Checks exposed asynchronous model startup ordering, an ascending hold being reset before completion, an abrupt synthetic resynchronization outlier, and different fake clocks; these were corrected without weakening tests or TypeScript. The first preview probe failed content checksum despite HTTP 200: preview had the default root base and served SPA HTML for subdirectory asset requests. Matching preview's `--base` to the build resolved this; README now makes that requirement explicit. Sandbox network/listen restrictions were handled with approved tool execution, not code workarounds.

Manual camera verification: **not performed**. Browser/device: not tested; testers: 0. Real counting, corrections, recovery, pause/resume, GPU compatibility and inference FPS remain unverified with live hardware. `SPRINT_2_MANUAL_CHECKLIST.md` contains all 35 requested steps, an observation table and two-person/device/lighting guidance. No photographs, videos, personal movement traces or raw landmarks were recorded. A real-camera acceptance pass and observations-based tuning remain the next verification work; Sprint 3 implementation has not started.

Privacy: one video-only stream, no microphone, camera recording, retained still images, raw-pose persistence, video/landmark upload, remote vision, GPT or backend calls in the loop. Calibration and results are session-local. Speech/tone failures leave visual feedback complete. The UI states local processing and the general fitness scope, with no diagnosis or injury-safety claims.


## Sprint 3 — Core Backend Domains, Persistence and Progress (2026-09-30)

Starting basis: `ddb8640db47e8b52b71ce0b98adbf5a803f4144f`, verified descendant
of `9971f8e31924a68937053ecb8415934782035658`. Existing branch is
`sprint/core-backend-domains`; the old remote main was not used as a base.
Working tree began clean; AGENT_PROMPT.md has no changes and was excluded from
all sprint commits.

### Delivered behavior

The separate carry-over commit adds WorkoutFeedbackBanner: top-centred, width
min(92vw, 960px), clamp-sized text, dense contrast, stable height, separate states,
aria-live, reduced motion and held transient corrections. Short Russian corrections
remain visual even when speech is muted. Actual distance readability is pending.

Backend now owns persisted guest users, null-email JWTs/permissions, full profile
replacement and confirmed constraint transaction, strict allowlisted squat catalog,
reused eligibility, deterministic weekly plans and atomic archive/create/items,
idempotent aggregate session/set/completion and completed-only progress/history.
Eight SQLAlchemy Core tables and five generated native-enum migrations preserve
existing layering. No providers, password auth or additional analyzed exercises.

Frontend typed client and singleton store run bootstrap beside the camera flow.
Profile/Plan/Progress reuse existing gesture targets and semantic events. Default
profile is created on 404; existing eligible active plan is reused. The separate
local demo action is not presented as a personal plan. Session IDs are captured
locally, Results opens before requests, then an aggregate-only queue syncs start,
set and completion and refreshes progress. Failure preserves result/queue;
startup/online/bootstrap/manual retry is bounded. Cache labels and status explain
degraded operation. No network call is added to an inference loop.

### Commit sequence before documentation

- `4bd3103` fix(ui): make workout corrections readable at camera distance
- `9b0116c` feat(auth): add persisted guest identity and JWT bootstrap
- `18ac598` feat(profile): add fitness profile and confirmed constraints
- `50c9d54` feat(catalog): add allowlisted exercise catalog and eligibility rules
- `75e36a1` feat(plans): add deterministic active training plans
- `ab3a1be` feat(sessions): persist idempotent aggregate workout results
- `a8395a3` feat(progress): add user progress summary
- `d803015` feat(frontend): integrate guest profile plans sync and progress
- `607ea20` test: cover Sprint 3 domains isolation and offline sync

### Automated verification

| Command/check | Result |
|---|---|
| Backend `make install` | Passed with approved network execution; no dependency changes |
| Backend `make check` | Ruff passed; 84 files formatted |
| Backend `make test` with confirmed TEST_DATABASE_URL | 161 passed; 99.19% coverage; original 90% gate retained |
| Fresh local `make migrate` | Complete chain to e2dc2dbe10a5; eight tables, exactly one supported squat seed |
| Fresh DB `.venv/bin/alembic check` | No new upgrade operations; no metadata drift |
| `npm ci` | Passed; 198 packages; three existing moderate audit advisories, no lockfile/dependency changes |
| `npm run lint` | Passed; zero warnings/errors |
| `npm run type-check` | Passed with unchanged strict TypeScript |
| `npm run test` | 116 passed in 20 files; existing gesture/pose tests retained |
| `npm run test:coverage` | 116 passed; statements/lines 98.11%, branches 89.96%, functions 93.14%; unchanged gates |
| `npm run build` | Passed; pinned model/WASM assets prepared |
| `npm run build -- --base=/dungeon-master/` | Passed |
| Matching preview at 127.0.0.1:4176/dungeon-master/ | Index, both model SHA-256 and all six installed WASM bytes verified; fake controls absent |
| `npm run check:instructions` / `npm run test:instructions` | 43 authored folders verified; two instruction-check tests passed |
| `python3 scripts/verify_architecture.py` | Passed; structural checker only |
| `git diff --check` | Passed |

Backend fixtures create/drop only a new UUID-named database on an owned temporary
PostgreSQL 17.7 server under /private/tmp:55433. A separately fresh local test DB
checks migration/seed/drift. No production data or existing DB was touched.
Frontend HTTP/storage tests need neither real DB nor camera; full-App cases show
immediate Results during a blocked POST and during failure of all API operations.
Security tests cover missing permissions, token expiry, cross-user access,
extra/raw-field rejection, sanitized errors and immutable/idempotent completion.

### Manual boundary and limitations

**Manual verification: not performed.** Real camera recognition, new-page gesture
operation, 2–4 metre readability, actual browser reload/reconnection and separate
browser-profile isolation require `SPRINT_3_MANUAL_CHECKLIST.md` (35 steps plus
feedback/boundary checks). Only automated synthetic/mocked/API/database checks
are claimed; no personal recordings or health observations were collected.

Queue capacity is 20 unsynced entries; a 21st result remains visible but cannot be
persisted until space exists. Blocked/quota-full browser storage falls back to
memory with a visible reload-persistence limitation. Guest JWT expiry defaults to
60 minutes and there is no refresh credential: controlled 401 recovery creates a
new guest. Earlier history/pending entries stay with their former identity and
are never reassigned. No AI, Calendar, ElevenLabs or medical-document flow exists.
Live acceptance is still required before claiming full Sprint 3 Definition of Done.
