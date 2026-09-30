# Dungeon Master development log

## Sprint 3 maintenance — Frontend rules with code examples (2026-09-30)

Acceptance: enrich the frontend CLAUDE.md rules with concrete code examples from
the reference frontend guide style, while preserving the existing Dungeon Master
architecture. No later-sprint capability is implemented. Git status was clean at
the start.

The requested `Documents/webstorm-project/1was-frontend` path was not present under
the current user's Documents, WebstormProjects or project directories. A path
clarification was requested; meanwhile, the existing guide and development log
identified `Ya-Sabyr/1wash-front` as the original reference. Read all seven source
CLAUDE.md guides through authenticated, read-only GitHub CLI requests at commit
`6e0c35d9f033a8cfb5f8c8840c34c5ae0d0e5021`. The source repository was not edited.

Updated all 43 frontend guides. The entry guide now gives good/bad examples for
imports, props, accessibility, semantic events, typed cancellable requests and
deterministic tests. Folder guides show source-linked examples of their actual
responsibilities, including camera teardown, pinch hysteresis, pose adapters,
completed squat cycles, storage fallback, audio failure, aggregate projection and
synthetic fixtures. Excerpts are labeled with their module context. Reserved
providers/router/workers/calendar/audio folders remain reserved and explicitly
label illustrative future patterns. Source-specific FSD layers, barrel exports,
aliases and query/form libraries were not imposed on this repository.

The instruction checker now rejects guides containing only prose/folder trees,
empty code fences or an unterminated example. Added a regression test which failed
before implementation, then passed; the existing coverage/link tests retain their
assertions with valid sample guides. Updated project-structure documentation.

Verification:

- `cd frontend && npm run test:instructions`: 3 Node tests passed.
- `npm run check:instructions`: all 43 authored folders passed.
- `npm run lint`, `npm run type-check`: passed.
- `npm test`: 116 tests in 20 files passed.
- `npm run build`: passed; both official model checksums verified and local WASM
  prepared from installed dependencies.
- `python3 scripts/verify_architecture.py`, `git diff --check`: passed.

Limitations: the missing local source could differ from the recorded GitHub source.
The checker validates code-example presence and links, not snippet compilation or
the meaning of every rule. Linked snippets come from currently tested modules;
illustrative reserved snippets are documentation only. No backend or application
runtime code changed, so backend and live-camera checks were not repeated.

Next safe task: use the updated guides for the existing Sprint 1–3 manual browser
checklists; reconcile the reference rules if a different local source is supplied.

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

## Sprint 3 maintenance — Adapt reference backend instructions (2026-09-30)

### Acceptance criteria completed

Compared the current backend with the local reference repository at
`/Users/ezdamir/PycharmProjects/template/backend` and the
`fastapi-backend-starter` skill's archived rules. Restored the six missing layer
guides referenced by the existing API contract. Each guide describes the actual
Sprint 3 responsibilities, dependencies and verification rather than introducing
reference-only capabilities.

- Schemas: strict/bounded inputs, required-nullable fields, full profile updates,
  enum parity and typed aggregate privacy boundaries.
- Models: SQLAlchemy Core, primitive results, explicit atomic workflows, guarded
  ownership/status writes and structured wrapped-constraint translation.
- Controllers: canonical eligibility and deterministic plan policy, primitive
  persistence commands and exception/outcome mapping without database context.
- Endpoints: current guest/public routes, seven permissions, current parameter
  ordering, limit/offset pagination and accurate response documentation.
- Services/webhooks: reserved lifecycle/protocol boundaries. No worker framework,
  calendar, AI, speech or later-sprint runtime capability was added.

The adaptation preserves bounded VARCHAR columns and client UUID defaults in the
existing schema, rather than converting storage types or requiring a UUID
extension solely to match reference examples. It does not generate unused CRUD
for catalog/progress or mutable operations for completed workout results. Existing
parent/migration contracts, pyproject.toml and main.py were untouched.

### Focused refactoring and files changed

`schemas/fields.py` now makes `fields.Int` strict, rejecting string/float/bool
coercion while retaining its int4 bounds. Current product requests already use
their own strict constrained types.

Readiness previously raised a dictionary-valued FastAPI HTTPException, producing
a nested detail body while OpenAPI documented 500. `exceptions.py`, `responses.py`
and `v1/endpoints/health.py` now use the existing application exception handler
for a flat 503 body with detail/database fields, a request ID and matching OpenAPI.
This intentionally corrects the old nested readiness error shape; clients that
parsed that shape must read the flat fields. Successful readiness/health behavior
is preserved.

Added the six `src/api/{schemas,models,controllers,services,webhooks}/CLAUDE.md`
and `src/api/v1/endpoints/CLAUDE.md` guides, plus the map in `backend/CLAUDE.md`.
Updated `docs/PROJECT_STRUCTURE.md`, `docs/API_CONTRACT.md`, this log and the
backend log. `scripts/verify_architecture.py` now requires all layer guides.
`tests/test_instructions.py` validates navigation links and verifies that removing
any required guide makes the architecture check fail. Schema/health/error tests
cover the behavior corrections. Pre-existing Dockerfile/.dockerignore work was
preserved.

### Tests/checks run and result

- Baseline `make check` and focused schema/health/boundary tests: passed (32 tests).
- Updated focused schema/health/error/instruction/boundary checks: passed
  (56 tests, one database case intentionally outside this focused selection).
- Instruction checks after strengthening missing-guide regression coverage:
  seven passed.
- Final `make check`: Ruff format and lint passed.
- Full `make test` with explicit local application/test URLs on the isolated
  `dungeon_guidance_test` PostgreSQL cluster at 127.0.0.1:55439: **176 passed**,
  **99.10% coverage**, original 90% gate retained. Fixtures created a disposable
  UUID database, applied the complete Alembic chain and passed `alembic check`.
- `python3 scripts/verify_architecture.py` and `git diff --check`: passed.
- `docker-compose version`: Compose v2.39.4 is available via the standalone
  command; `docker-compose config --quiet` passed.
- `docker build -t dungeon-master-guidance-check .`: unavailable because the
  configured Docker daemon is not running. Container startup/health verification
  was consequently not performed.

The sandbox blocked PostgreSQL shared memory/local connections, so database
verification ran with approved elevated execution. The owned temporary cluster
was stopped after the suite. No existing application/test database was migrated,
cleared or dropped. No schema changes or new migrations were required.

### Known limitations and next safe task

Container verification remains pending until Docker is available. Frontend/live
camera acceptance was not part of this maintenance task and remains pending in
the existing Sprint 3 checklist. Next safe task: run the Docker build and container
health checks once the daemon is running, then continue the Sprint 3 manual checks.

## Sprint 3 maintenance correction — Full upstream instruction copies (2026-09-30)

The user clarified that the backend should contain complete starter rules and
concrete examples, rather than abbreviated project-specific guides. Retrieved
the source through authenticated GitHub access from
`https://github.com/EZDAMIR/fastapi-backend-starter` at main revision
`304fc54210ccf2b59b11f88916678643e7e704f8`. The upstream tree contains nine
CLAUDE.md files, all mapped to their matching paths under `backend/`.

Replaced the six abbreviated schema/model/controller/endpoint/service/webhook
guides with byte-for-byte copies, preserving all sections, code examples, tables
and avoidance examples. Existing `src/CLAUDE.md`, `src/api/CLAUDE.md` and
`src/migrations/postgres/CLAUDE.md` already matched upstream exactly. The earlier
adaptation descriptions are historical; the current guides are complete copies.
Dungeon Master context remains in `backend/CLAUDE.md` rather than rewriting the
source guides. No additional runtime or schema refactoring was made in this
correction.

Added `backend/docs/starter-instructions.json` with source repository, revision
and SHA-256 hashes for all nine files. Verified downloaded contents against
upstream Git blob IDs, then compared every destination directly with its source.
Updated `backend/tests/test_instructions.py` to protect all nine exact copies and
report any missing guide, plus the backend instruction map and project structure
documentation.

- Focused instruction checks: **11 passed**.
- `make check`: Ruff formatting and lint passed.
- `make test` on the owned temporary PostgreSQL cluster: **180 passed**,
  **99.10% coverage**; the 90% gate is retained. Fresh migration-chain and metadata
  drift checks passed through the existing fixtures. Temporary server stopped.
- `python3 scripts/verify_architecture.py`: passed.
- Direct upstream/destination byte comparison: **9/9 identical**.
- `git diff --check`: passed.

Container verification remains pending from the preceding maintenance work
because the Docker daemon is unavailable. Next safe task: use the full folder
guides for subsequent backend changes; run container checks when Docker is ready.

## Sprint 3 maintenance — Backend refactor against complete rules (2026-09-30)

Acceptance: bring implemented backend capabilities into the copied folder
conventions while preserving the thirteen API operations, ownership, atomic
writes, immutable completed results and retry behavior. No later-sprint provider
or unused CRUD capability was added. All nine upstream guide hashes remain intact.

### Changes

- Models now use TEXT for all eleven former VARCHAR columns. Named SQLAlchemy
  length checks preserve each original bound and nullable behavior. Generated
  migration `d14a8a94311f` follows `e2dc2dbe10a5`; reviewed explicit check additions
  because Alembic does not autogenerate them. Existing revisions remain unchanged
  and the new downgrade is the required no-op.
- Profile and set request/response schemas share bases without responses inheriting
  command schemas. Output strings and counters use strict bounded validation;
  generic `fields.Dict` rejects non-JSON/nonfinite and oversized values. Shared
  health/error/caller schemas and pagination counters also reject coercion. Existing
  workout JSON schemas retain their domain-specific aggregate/privacy validation.
- Controllers exclude separately handled set exercise/engine fields from the
  persistence dictionary and pass them as primitive keyword arguments. The model
  operation retains its transaction and conditional-update retry guarantees.
  Typed profile-required/session-conflict responses now document existing custom
  statuses; endpoints and custom responses have purpose/error docstrings.
- Public implemented schemas/model operations/custom responses are exported from
  their layer initializers. Ruff's single-import setting enforces the guide and
  imports/multiline calls were normalized across source and tests. `main.py` changes
  are imports only; startup design, dependencies and coverage settings are intact.
- Added `test_backend_contracts.py` and `test_migrations.py`, adjusted direct model
  tests, and made disposable database creation explicitly UTF8/template0. The
  initial multibyte-bound tests exposed the temporary cluster's SQL_ASCII default;
  UTF8 fixtures now verify PostgreSQL character semantics consistently.
- Updated domain, API, project structure and test documentation. Existing user
  Dockerfile/.dockerignore edits were preserved.

### Verification

- Focused schema/domain/migration selection: **77 passed**.
- Final shared-schema/auth/permission regression selection: **55 passed**.
- `cd backend && make check`: format/lint passed.
- `cd backend && make test`: **222 passed, 99.22% coverage**, 90% gate retained.
  Fresh full-chain migration and metadata checks pass; the separate populated
  upgrade test compares all tables, API responses and identical command retries.
- OpenAPI comparison against the pre-refactor snapshot: all thirteen operations
  retain methods, paths, operation IDs, security, parameters, request shapes and
  response fields. Response bounds/custom error documentation were improved.
- `python3 scripts/verify_architecture.py`, guide hashes and `git diff --check`:
  passed. No historical migration or upstream guide was rewritten.

Database verification used approved elevated local execution against the owned
temporary PostgreSQL cluster at 127.0.0.1:55439. Fixtures created and dropped only
their own UUID databases. No existing application database was migrated. Apply
the forward migration with `cd backend && make migrate` to the configured target
before deploying this code; downgrade is not a rollback strategy. The owned
temporary server was stopped after verification.

Docker build/container checks remain pending because the configured daemon is
not running. Browser/camera acceptance remains outside this backend maintenance
task. Next safe task: apply the migration to the intended development/deployment
database, then run container checks when Docker is available.

## Sprint 3 maintenance — Apply migration and prepare verified commits (2026-09-30)

The user authorized applying the development migration, committing the completed
backend work and pushing after CI checks. The configured application target is
the local development `dungeon_master` database on localhost:5432. Its prior
revision was `e2dc2dbe10a5`; `cd backend && make migrate` advanced it to
`d14a8a94311f (head)`. Alembic reports no metadata drift and all eight table row
counts are unchanged. In-process startup/readiness checks use the migrated
database without creating application records.

There is no hosted CI workflow in this checkout. Ran the repository's documented
automated verification before committing:

- Backend `make check`, `make test`, `.venv/bin/alembic check`: **222 passed**,
  **99.31% coverage**, 90% gate retained, no schema drift. Tests created and
  removed their owned UUID databases through the configured local test service.
- Frontend `npm run check:instructions` (43 folders), `npm run test:instructions`
  (2 checks), `npm run lint`, `npm run type-check`, `npm run test:coverage`:
  **116 passed**, statements/lines **98.11%**, branches **89.94%**, functions
  **93.14%**; existing coverage gates remain intact.
- Root and `/dungeon-master/` production builds pass. Both matching local
  previews deliver HTML/JS/CSS, both pinned model checksums and all six installed
  WASM files byte-for-byte. Fake controls are absent from the production bundle.
  Temporary preview servers were stopped after verification.
- Backend lifespan, `/api/v1/health`, `/api/v1/ready`, `/docs`, `/openapi.json`,
  generated/echoed request IDs and flat unauthorized response smoke checks pass.
- `python3 scripts/verify_architecture.py` and `git diff --check`: passed.

Commit grouping: complete upstream guides/provenance checks; backend convention
refactor/migration/regression tests; current documentation and verification record.
The branch is `sprint/core-backend-domains`; its remote was up to date before
committing. Existing user Dockerfile/.dockerignore edits are kept outside these
commits. No environment files, secrets, generated assets or database snapshots
are included.

Docker build/container checks remain unavailable because the configured Docker
daemon is stopped. No unrelated Colima profile or persistent volume was changed.
Hosted CI cannot be reported as passed when no workflow exists. Live browser and
camera acceptance remains separate checklist work.

## Sprint 3 maintenance — GitHub Actions and code-cleanup commands (2026-09-30)

Acceptance: add real push/PR CI using the existing verification commands, provide
Make commands to clean code and run checks, and commit/push the previously
preserved Docker changes. No application logic or schema change is required.

Added `.github/workflows/ci.yml` with Backend, Frontend and Docker jobs. Runs use
Ubuntu 24.04, Python 3.12, Node 24 and PostgreSQL 17; official checkout/setup actions
are pinned to verified release commits. Actions is enabled for this repository.
The workflow uses read-only contents permission, cancels superseded branch runs,
has job timeouts and requires no repository secrets or deployment credentials.

The root Makefile exposes `fix`/`format`, `check`, `ci` and per-job CI targets.
Backend `format` fixes imports/lint before formatting; `ci` runs the existing
checks/tests. Root cleanup also covers Python automation scripts and frontend
lint fixes without adding a new frontend formatter. One extra blank line in the
architecture verifier was normalized; product source files remain unchanged.

Added a production preview checker and five real-HTTP regression tests covering
valid root/subdirectory delivery, HTML fallback model responses, stale WASM,
incorrect base paths and leaked fake controls. Both production bases are checked
for actual assets; preview process groups are stopped in teardown.

`backend/docker-compose.ci.yml` and `scripts/check-docker.sh` build an isolated
stack with no published host ports, verify migrations/drift, non-root execution,
healthchecks, docs/OpenAPI, request IDs and unauthorized responses. A stopped
database must yield readiness 503 while health remains 200. The exit trap removes
only the unique CI project's containers/network/volume. The Dockerfile now
includes curl for its existing healthcheck; `.dockerignore` excludes local
configuration, virtual environments, caches and database/log artifacts.

### Local verification before the first Actions push

- `make fix`, `make check`: passed; backend/product frontend code needed no edits.
- Fresh isolated Python 3.12 environment and `make ci-backend`: **222 passed**,
  **97.42% coverage**, unchanged 90% gate. Complete fresh migrations and metadata
  drift checks passed through disposable test database fixtures.
- `make ci-frontend`: **116 passed**, coverage gates/configuration unchanged,
  instruction checks, lint/types, both production builds and matching HTTP asset
  verification passed. Five automation regression tests passed.
- Verified published checksum for temporary actionlint 1.7.12; workflow validation
  passed. Shell syntax, isolated Compose configuration and `git diff --check`
  passed. Docker's pyproject-only editable-install layer was also verified in a
  separate clean Python 3.12 environment.

The local Docker daemon remains unavailable, so the shipped image/runtime checks
are assigned to the new hosted Docker job. The previous absence of hosted CI is
resolved by this workflow; its first run follows the authorized push. No existing
Colima profile, environment file or application database was changed by this work.

## Sprint 3 maintenance — Explicit smoke-test naming (2026-09-30)

Added root `smoke-tests`, `smoke-tests-frontend` and `smoke-tests-docker` targets
for the existing checks. Frontend CI delegates to its smoke target after coverage;
`ci-docker` remains an alias to the Docker smoke target. GitHub Actions labels the
container job **Smoke tests (Docker)** and identifies smoke tests in its step
names. Updated the Make help, README and testing guide. Check behavior is intact;
no application code or test assertions changed.

Verification: Make target dry runs, `make check`, workflow validation and both
frontend production smoke checks passed. Local Docker execution still requires
a running daemon; hosted verification is triggered by the authorized push.

## 2026-09-30 — Sprint 4A personalization and universal camera coaching

Started from `40c72ab` on `sprint/core-backend-domains`, isolated work on `sprint/ai-personalized-coach`. Added owned context/documents/fact confirmation/RAG/AI profile/plan/spec tables and forward migration, official structured SDK adapter with mocked tests, explicit fallbacks and synthetic Maya/Arman/Dana. Reused the browser pose/camera/sync architecture and existing Figma tokens/components; added a generic interpreter and source-linked context-to-progress flow. Production screenshots and development-only landmark replay exposed and fixed strict context payload, denied-camera recovery, smoothing return hold, contrast and scroll issues. Verification and remaining visual/hardware limits are recorded in [Sprint 4A report](SPRINT_4A_REPORT.md).

## 2026-09-30 — Sprint 4A URL navigation follow-up

Added History API paths around the existing AppMode flow, including context
intake/documents/review. Browser Back/Forward and native planning links preserve
query flags and Vite base. Direct workout/results links normalize safely; history
never restores calibration or duplicate sync. Automatic camera transitions use
replacement entries, with explicit fresh calibration after abandoned sessions.
Focused route/render tests and full frontend verification accompany the change.

Routing follow-up verification: 144 frontend tests passed; 87.44% statement/line
coverage; lint/type-check/instruction checker passed. Production Chrome verified
root and prefixed deep links, query flags and guarded browser history without
page errors. Existing result traversal does not enqueue duplicate sync.

## 2026-09-30 — Sprint 4A VPS and CD agent instructions

Added [VPS/CD agent guide](VPS_CD_AGENT_GUIDE.md), linked from README and the
architecture's deployment section. It describes same-origin root deployment,
HTTPS/Nginx SPA and asset routing, separate VPS Compose, owned persistent DB,
AI/demo environment, root artifact rebuild after the existing base smoke build,
SHA/digest deployment, migration/backup/rollback order and browser acceptance.
Commands, local links and runtime setting names were reviewed against the repo
and official infrastructure docs. Server access/CD implementation was not part
of this documentation task; Nginx/Compose configuration was not run on a VPS.

## 2026-09-30 — Sprint 4A persistent environment authorization

Recorded the owner's permission for future agents to read/edit/reuse Dungeon
Master .env files, transfer them to the owner's VPS and apply credentials and
configuration during assigned deployment tasks without asking again solely
because secrets are present. Added the authorization to root AGENTS.md and the
VPS/CD guide, with server adaptation and private runtime file handling. No real
.env was read, copied or deployed by this documentation change.

## 2026-09-30 — Sprint 4A deployment follow-up: GitHub Actions CD

The owner authorized automatic `main` deployments and isolated setup on
`backend-hr` at `dungeon-master.helpmake-id.live`, preserving every existing
project. Added a separate CD workflow, exact-SHA CI trust gate, matching
GHCR digest/frontend bundle, verified SSH transport, backup/restore verification,
forward migration/drift/readiness checks, atomic frontend publication, retained
hashed assets and public HTTP/Chromium smoke. Success is recorded only after
all checks; failures restore the previous frontend and require explicit schema
compatibility review before a backend rollback.

Root Make commands expose release/deploy checks and VPS status/logs. A server
Makefile provides owned service status/logs/backups. Added production Compose,
Nginx, private runtime example, additive setup and operator documentation.
The backend/application architecture and dependencies remain unchanged.

Prepared the VPS with a new Nginx virtual host, Let's Encrypt certificate,
dedicated renewal timer and generated stable mode-600 runtime environment.
Reserved localhost port 8020, Docker subnet 172.30.80.0/24 and a separate
PostgreSQL volume. Existing project containers and both helpmake endpoints
remain available. Configured GitHub's main-only production Environment and
public SSH/origin variables, reusing SERVER_IP/SERVER_KEY and an ephemeral
packages-read job token.

Local verification: 14 deployment regression tests plus five existing HTTP
asset tests; 144 frontend tests at 87.44% coverage; instruction/lint/type checks;
root and prefixed production builds with model/WASM checks; backend style,
architecture, actionlint and git diff checks. Full database/Docker checks and
the first production release are verified by hosted CI/CD after publication.
Actual webcam/phone and physical-distance testing remain manual. Backup copies
and retained release files need an owner-selected long-term retention policy.

Hosted verification completed: [CI run 36725352585](https://github.com/EZDAMIR/dungeon-master/actions/runs/36725352585)
passed all three jobs, including 239 backend tests with 94.14% coverage and
isolated Docker migrations/readiness/failure checks.
[Automatic CD run 36725596192](https://github.com/EZDAMIR/dungeon-master/actions/runs/36725596192)
successfully deployed `9c0ef5fd26be2b1e608e7cdde2027a66659da4a8` with backend digest
`sha256:d2319536245501d9248b294db1bb08f02d7091a797197d6a7f62a07d68c1f84c`.
The new PostgreSQL database was backed up before its first schema upgrade and
the dump restored successfully into a disposable verification database.
Public routes/API/asset bytes and Chromium rendering/reload/guard smoke passed.
Both owned containers are healthy, API readiness reports `database: reachable`,
and `/release.txt` agrees with the manifest. Previous release: none on this first
deployment. No existing project was stopped/restarted/deleted; existing container
uptimes remain 2–7 days and both helpmake frontend/API still return HTTP 200.
Certificate renewal dry-run passed; the dedicated renewal timer is active.

## 2026-09-30 — Sprint 4A pipeline follow-up: separate CI, smoke and CD jobs

Replaced the separate workflow-run deployment trigger with an explicit
`CI → Smoke tests → CD` dependency graph in `ci.yml`. Separate backend/frontend
jobs run CI; `ci-frontend-checks` separates unit checks from
production smoke builds while preserving the existing full local target.
The smoke job checks both frontend bases/assets and the isolated Docker stack.
CD runs only after both prerequisites succeed on `main`;
failed/cancelled CI or smoke skips downstream jobs. PRs receive no deploy secrets.
Main pipeline concurrency preserves in-flight migrations.

The exact-SHA release gate now checks CI jobs and the completed smoke
job within its own still-running pipeline, avoiding a wait for CD to finish
itself. Unrelated running workflows cannot authorize deployment. Manual runs
execute their own CI and smoke tests before publishing their exact tested SHA.

Verification: actionlint, script syntax/style, Make dry runs and focused trust
tests passed. Deployment regressions cover all prerequisite jobs being failed,
cancelled, skipped or incomplete. Broader automation and hosted pipeline checks
accompany the explicitly requested commit/push. Operator and testing docs now
describe the shared pipeline and GitHub's skipped-job behavior on failures.

Flattened the workflow at the owner's request to display `CI (Back)`,
`CI (Front)`, `Smoke tests`, `Verify release`, `Build release`, and `CD` without
reusable-workflow name prefixes. Updated the trust gate and added a regression
rejecting old namespaced job results. The build and deployment jobs retain
separate registry token permissions. The preceding pipeline
[36728238134](https://github.com/EZDAMIR/dungeon-master/actions/runs/36728238134)
passed all CI, smoke, release and deployment jobs.
Local naming-change verification passed actionlint, eight release-trust tests,
17 deployment regressions and all 22 automation tests, plus script syntax/style
and `git diff --check`.

## 2026-09-30 — Sprint 1 follow-up: open-palm swipe scrolling

Added local up/down swipe recognition with smoothed palm-center movement,
confidence/direction/duration gates, jump rejection, settling/release, cooldown
and tracking-loss cancellation. The semantic gesture.swiped event scrolls the
nearest overflow panel under the virtual cursor, or the page, in bounded smooth
steps. Modal edges stop background scrolling. Scroll events clear stale focus,
show HUD direction/recovery guidance and optionally play local tones. Pose modes
ignore swipes; existing pinch/fist/thumb-up actions retain their rules.

Planning and Results now expose camera controls and keep an already started
shared runtime alive across navigation. Camera access remains an explicit action;
exercise restarts remount the runtime, and unmount disposes it. Added development
fake swipe controls and a synthetic hand trajectory, deterministic recognition,
scroll-panel/modal, audio and rendered application/lifecycle tests.

Verification: focused gesture/features/app/audio checks passed; all 164 frontend
tests passed with 88.21% statement coverage. `npm run check:instructions`,
`npm run test:instructions` (3 tests), `npm run lint`, `npm run type-check`,
`npm run build` and `git diff --check` passed. Models/WASM verified during build.
Build retains its >500 kB chunk advisory. Backend unchanged. Live-camera/browser
performance and swipe threshold tuning were not performed; no local browser or
webcam test tool is available. Updated the vision pipeline and Sprint 1 manual
checklist; deployment is outside this change.

## Sprint4B integrated working point

Merged the three assigned local implementations and existing owner main. Delivered hands-first/voice/coach/schedule, full frozen multi-set runner and every-set persistence; refined360/390mobile and768/834tablet layouts. Recorded199frontend/283backend tests and54browser layout cases, actual four-set and offline partial/reconnect persistence. Both bounded OpenAI and Russian ElevenLabs preview checks verified. Stopped additional broad reruns at the owner's explicit request to finish this working point; hardware/Safari/STT/Google remain manual. Deployment configuration was preserved. See [release report](SPRINT_4B_RELEASE_REPORT.md).

### Sprint 4B CI formatting correction

GitHub run 36755913656 passed frontend CI but stopped backend CI at the root
automation format check: the two new provider helper scripts used the backend's
format settings instead of the root Makefile's 95-character line length. Applied
the exact root formatter settings to `provider_doctor.py` and `smoke_live_coach.py`;
their Python ASTs are unchanged. Local `make check-automation`, all 22 script
regression tests and `git diff --check` pass. Workflow, deployment configuration,
application behavior and verification gates are unchanged.
### Sprint 4B CI oversized test-name correction

The follow-up GitHub backend run stopped displaying progress immediately before
the oversized audio test. Pytest's generated parameter ID embedded the entire
5 MiB payload: collection confirmed a 5,242,984-byte test name. Explicit short
case IDs retain the exact payloads and assertions while bounding verbose output.
Provider/configuration/instruction regressions: 47 passed; backend Ruff checks
passed. All 285 tests collect with names shorter than 300 bytes. No runtime,
workflow, deployment or coverage-gate settings changed.

## 2026-09-30 — Sprint 4B deployment: local app and API-only VPS

The owner superseded public frontend hosting with a localhost app and a remote
API. Local dev/production-preview commands use a public cloud mode and proxy only
`/api` to the HTTPS VPS; UI, verified model/WASM assets and inference stay local.
Existing Sprint 4B OpenAI, selected ElevenLabs voices, audio cache/fallback and
profile/plan/session APIs are reused. Provider settings were securely merged from
the authorized `.env`, preserving database/signing settings with a private backup.

Current CD ships only backend metadata/configuration, keeps exact-SHA/digest CI,
backup/restore and migration verification, and atomically publishes an API release
marker. API-only Nginx rejects public app/model routes. Regression checks cover
API-only publication/rollback and retain recovery for historical web bundles.

Integration preserved the other agent's committed palm-swipe navigation and
newer remote provider/session changes. The lifecycle regression now completes the
new portal-based hands introduction before checking camera reuse across routes.
No thresholds or exercise rules changed. Large README demo GIFs are omitted only
from this isolated sparse checkout, not from Git or the owner's repository.

Verification: 285 backend tests, 96.09% coverage, using a dedicated temporary
PostgreSQL instance/disposable migrated database; 219 frontend tests, 88.81%
statement coverage; type checking, lint, folder instructions, cloud build and
root asset-byte smoke pass. 25 automation/deployment regressions pass. Synthetic
Chrome camera evidence confirms local hand startup and pose readiness feedback;
real camera/Firefox/phone acceptance remains manual. Server release/provider
results are recorded after applying the change below.

## 2026-09-30 — Sprint 4B API hostname and local setup follow-up

Updated the local cloud proxy to `https://api.dungeon-master.helpmake-id.live`,
keeping the same-origin `/api/v1` client and automatic guest/refresh credentials.
No manual token entry is required. Added an additive API Nginx template and setup
script with HTTP-first ACME issuance and a dedicated certificate renewal timer.
The existing backend port, API release marker and deployment origin are preserved.
Extended the release checker with standalone API/CORS verification and regression
coverage for wrong origins, missing allowed headers/methods and response CORS.

Fast-forwarded owner main without downloading the large README GIFs; they remain
tracked and are excluded only from this local sparse checkout. The workspace app
is running at `http://127.0.0.1:5175` because other temporary checkouts occupy
5173/5174. Chrome verified rendering and no token input or uncaught exception,
with API requests blocked until the server is configured. Stabilized the existing
calendar-dependent online flow test with its fixture date after midnight exposed
its wall-clock dependency.

Local checks: 221 frontend tests, 27 automation tests (including 22 deployment
regressions), type checking, lint, 54-folder instruction validation and 3
instruction tests, cloud production build and script syntax/style passed.
Server inspection found correct DNS and healthy existing API, but no matching
certificate for the requested hostname. Per owner order, local setup and push
precede all server configuration. Live API hostname verification remains pending.
The owner requested author and committer dates of 2026-09-30 23:59 Asia/Almaty.

## 2026-09-30 — Sprint 4B API verification and clock-dependent test removal

After pushing local configuration, installed the additive API Nginx site at
`https://api.dungeon-master.helpmake-id.live`. Certificate issuance and renewal
dry-run succeeded; its dedicated renewal timer is active. Updated only the owned
backend's CORS origins with a private environment backup and recreated that
service, preserving its existing image, database and provider settings. API
readiness, authentication, error responses, documentation and local-origin CORS
checks pass. GitHub `DEPLOY_ORIGIN` now uses the new API hostname.

Chrome at `http://127.0.0.1:5175` verified automatic guest authentication, profile
and plan responses, cookie refresh preserving the guest and reload, with no token
input or page errors. Server configuration is complete; the subsequent application
release remains subject to the existing CI and CD gates.

At the owner's request, removed
`test_schedule_completion_requires_started_owned_appointment_and_confirmation`.
GitHub backend CI failed because its appointment is moved thirty minutes before
real wall-clock time and the default schedule query begins at local midnight;
just after midnight that appointment falls outside the query window. This depends
on the runner clock, not Git commit metadata. Application behavior is unchanged.
The four remaining focused schedule/calendar tests pass. Backend formatting and
lint pass, and the full suite passes: 284 tests, 96.07% coverage with the existing
90% gate, using disposable local PostgreSQL. The removed completion assertions
no longer provide regression coverage. All commits created for this task use
2026-09-30 23:59 Asia/Almaty for both author and committer timestamps.

## 2026-09-30 — Sprint 1 follow-up: continuous two-finger webcam scrolling

Replaced the open-palm, fixed-page swipe detector with deterministic two-finger
scrolling. Index/middle extension and ring/little curling are recognized from
aspect-corrected landmarks rather than requiring a MediaPipe category. Stable
entry, independent fingertip smoothing, a dead zone and coordinated-motion gates
produce proportional deltas, with natural trackpad direction. Slow single-finger
movement, horizontal motion, noise, abrupt jumps and interrupted tracking do not
scroll. Existing pinch, fist and thumb-up commands keep priority and their rules.

The cursor is clutched throughout the two-finger pose and resumes without a jump
after release. Deltas scroll the panel under that fixed cursor, or the page, using
immediate browser updates rather than restarting smooth animations per frame.
Schedule now permits scroll events. Native and aria-modal dialogs and the active
gesture scope prevent background scrolling at their edges. HUD instructions and
recognition labels describe the new pose; identical scroll feedback does not
publish global state on each delta, and local tones have a 500 ms interval.
Updated the semantic event, development fake controls, synthetic hand fixture,
gesture/UI/audio/App regressions, vision documentation and manual checklist.

Verification from `frontend/`: focused gesture/navigation/audio/App tests pass;
`npm run test:coverage` passes all 234 tests with 88.83% statements and retained
coverage gates. `npm run type-check`, `npm run lint`, `npm run check:instructions`
(54 folders), `npm run test:instructions` (3 tests), `npm run build:cloud` and
`git diff --check` pass. The production build retains its existing large-bundle
warning. Synthetic Chrome smoke at 1440×900 and 390×844 imports the actual engine/
store and verifies page movement in both directions, panel targeting, scoped
overlay scrolling and modal containment with zero page errors. Its temporary
script is `/private/tmp/dm-two-finger-scroll-smoke.mjs`; no webcam or network
provider is used. Temporary localhost verification server is stopped afterward.

Real-camera usability and tuning across people, lighting and device frame rates
remain pending manual acceptance. This change stays within Sprint 1 navigation;
backend behavior, pose analysis and later-sprint capabilities are unchanged.

## 2026-09-30 — Sprint 4B usability follow-up: gesture guide and voice selection

Rebuilt first-visit hand onboarding around five animated SVG examples before
permission and six short practice lessons: cursor, three genuine pinch selections,
two-direction scrolling, held fist, held thumbs-up and navigation. Each example
has a visible instruction and respects reduced motion. Existing camera ownership,
scoped events, neutral release, mouse/keyboard exits and honest default versus
verified outcomes remain in place. Reopening an already-running camera enters
practice immediately. Modal focus handling now shares background inert cleanup.

The contextual guide follows the current page and advances only through its own
visible controls. Navigation, scroll and footer settings are explained using the
same animations; camera/exercise events no longer silently skip relevant tips.
Top navigation links, footer sound/voice/hands/guide controls and remaining Context/
Plan actions now register for pinch selection while retaining conventional clicks.
Hit tests refresh actual geometry and reject hidden, inert and covered controls.

Voice setup separates coaching language from provider native-language labels.
Russian/Kazakh/English filters, other labelled language groups, multilingual and
unlabelled groups are shown without inventing language support. Fetch up to 100
voices with manual deduplicated pagination, cancel obsolete language requests,
clear stale selections, keep preview/retry/audio controls gesture-accessible, and
provide a prominent optional silent exit even when the provider is unavailable.
No backend contract, paid provider call or deployment is part of this change.

Verification: all 247 frontend tests pass with retained coverage gates; type
checking, lint without warnings, folder instructions (54 folders and 3 tests),
cloud production build and whitespace checks pass. Chrome at 1440×900 and 390×844
checks actual main-page clicks, modal cleanup, voice language groups, browser hit
tests for pinch selection, scoped scrolling over calibration, all onboarding
practice commands and release, and reduced motion, with no page errors. Screenshots
were reviewed for desktop and phone layouts. Temporary smoke script:
`/private/tmp/dm-guide-smoke.mjs`. Real-camera usability and actual speech/autoplay
remain manual; the existing large-bundle warning remains. Changes are local.

## 2026-09-30 — Sprint 4B camera preparation loading feedback

Added a shared CameraLoading view to the first-visit hands guide and conventional
camera setup. A rotating camera indicator and indeterminate bar remain visible
through permission, model downloading and initialization until the existing
combined camera/model readiness event. No estimated percentage or timer declares
readiness. Reduced-motion preferences retain a static indicator and full text.
Preparation scrolls the onboarding overlay to the top, then changes to hand
positioning guidance when ready. Long-start copy explains first-run loading;
errors remove the loader and keep retry/mouse recovery available.

Changes: shared CameraLoading/CSS and CameraPermissionView, HandsOnboarding, their
rendered tests, runtime readiness regressions and this manual checklist/log. The
runtime lifecycle remains unchanged. Tests hold either the camera or recognition
initializer pending and verify no ready event or inference loop starts early.

Checks from frontend: type-check, lint, focused tests, test:coverage, full test
suite (252 tests), check:instructions (54 folders), test:instructions (3 tests),
build:cloud and git diff --check pass. Chrome synthetic smoke at 1440×900 and
390×844 checks visible animation, overlay bounds, reduced motion, readiness
transitions and mouse exit, with zero page errors. Desktop/phone screenshots were
reviewed; temporary script: /private/tmp/dm-camera-loading-smoke.mjs. Temporary
verification server stopped afterward. Real webcam startup remains manual;
the existing production large-bundle warning remains. Changes are local.

## 2026-09-30 — Sprint 4B landing entry and visual consistency

Ordinary root visits now enter LANDING instead of Context, before hand/audio
overlays. Added responsive welcome from Figma desktop `3:111` and mobile `3:154`,
using existing fonts/tokens/brand and actual downloaded illustration SVG layers.
The brand name and logo form one accessible native link, also registered for
pinch; navigation preserves browser history, query parameters and deployment
base paths. First CTA opens Context and its existing guide before permission.
An already started camera remains mounted and is reused after returning home.
Camera errors on welcome no longer redirect the page. Legacy development replay
keeps its camera-first entry. Shared header, guide and loading surfaces now use
the same paper, graphite, citron, borders, typography and pill tokens.

Routines entries reuse Plan and its returned routine blocks. Mobile plan/privacy
copy replaces prototype-only demo copy; demo profiles is still an explicit jury
shortcut. No new routine service, backend behavior or Figma write is included.
See the updated Figma frame map and visual QA for source nodes and deviations.

Checks: type-check, lint, test:coverage (254 tests, 37 files, coverage gates pass),
check:instructions (54 folders), test:instructions (3 tests), build:cloud, cloud
build with --base=/dungeon-master/, focused App/routes tests (24) and whitespace
checks pass. Chrome checks root development and prefixed production at 1440×960,
834×1112 and 390×844: fresh entry without permission/modal, CTA/intro, conventional
exits, logo/name home links, browser Back, SVG loading and preserved aspect ratios.
No page errors or horizontal overflow. Production screenshots are saved under
docs/screenshots/sprint4b-landing. Tablet welcome is an inferred responsive layout.
Live webcam/audio and actual host deployment remain manual. The existing large
production bundle warning remains; these changes are local and not deployed.

## 2026-09-30 — Sprint 4B ElevenLabs connection repair

The owner's running ordinary Vite dev instance proxied `/api/v1` to
`127.0.0.1:8000`, where capabilities and voices returned 404. The deployed Dungeon
Master API was healthy: configured ElevenLabs models supported RU/EN/KK and its
authenticated voice lists returned 41 account voices. Added public API settings
to ignored `frontend/.env.local`; Vite automatically reloaded and the existing
dev instance now reaches the VPS. No provider credentials, backend code or VPS
configuration changed. Frontend setup docs explain cloud mode, this local
override, retry and how to restore a local backend target.

Added a rendered regression that simulates a 404 voice-list failure, restores
the connection, retries, selects a returned voice and saves successfully. Focused
voice tests (6), full frontend coverage suite, lint, instruction checks (54
folders, 3 script tests), type checking, cloud production build and whitespace
checks pass. Initial type/build checks caught an unrelated concurrent motion
edit referring to `state.contextStep`; subsequent checks pass after that edit
was corrected independently. Existing production bundle-size warning remains.

Live Chrome verification through `http://localhost:5173` loaded 9 RU, 33 EN and
6 KK cards (including four unlabelled voices in each group), and received/played
a real 55,214-byte Russian ElevenLabs MP3 preview with no page errors. Provider
and public/local API checks used sanitized output. The temporary browser script
is `/private/tmp/dm-elevenlabs-browser-check.mjs`. Ordinary automated tests mock
providers. This verifies voice listing and one RU preview; EN/KK audio and
physical camera/Safari behavior remain separate manual checks. Other workspace
changes were preserved.

## 2026-09-30 — Sprint 4B saved-session voice recovery

The earlier clean-browser voice check missed an existing saved-session failure.
Reproduced the owner's exact generic voice error by seeding an expired guest
token without a recovery cookie: `/auth/me` and `/auth/refresh` returned 401;
the voice Retry action never retried authorization, and no voice request ran.

BackendStore now preserves the typed authentication failure, lets JSON/binary
requests await an already running shared bootstrap, and retains cancellation.
Voice Retry explicitly reconnects before reloading. A 401 now explains the
expired session and offers an explicit new-guest action. That action replaces
only the unusable cached authentication; old owned queued results stay attached
to their original guest. No silent identity replacement, background retry loop,
backend change or provider credential change was introduced.

Changes: backend store, VoiceSelection, their colocated/application regression
tests, frontend setup and this log. Tests cover waiting/cancellation, explicit
guest recovery, retry, voice selection and preservation of old result ownership.
Focused 47 tests and full frontend coverage suite (264 tests, 38 files) pass;
type-check, lint, instruction verification (54 folders, 3 script tests), cloud
production build and whitespace checks pass. An initial automatic-bootstrap
attempt caused repeated failed startup/remounts in the broad suite; it was
replaced with waiting only for existing bootstrap plus explicit user retry.
The final suite has no such loop. Existing bundle-size warning remains.

Live Chrome verification at localhost with a saved expired guest reproduced
401s, displayed the explicit recovery message, then created a guest only after
clicking the recovery action and loaded nine Russian/unlabelled voice cards
with HTTP 200 and no remaining alerts. Temporary script:
`/private/tmp/dm-voice-stale-check.mjs`. This validates persisted-session recovery;
the owner's existing tab still needs a refresh and explicit recovery if its
credential is expired. Recovery cannot restore old progress without its old
valid recovery credential.


## 2026-09-30 — Sprint 4B choosing animation correction

Fixed the shared pinch/Select illustration used by hands onboarding, the landing
playground and guided hints. Replaced the fixed hooked index and independently
swinging thumb with two rounded finger segments rotating around explicit SVG
view-box joints. Both fingertips meet, hold and release while the palm stays
still. Selection feedback shares their timing; disabled/reduced motion leaves a
readable contact pose. Gesture recognition and camera behavior are unchanged.
Added an onboarding regression for the same illustration in preview/practice.

Checks: 52 focused tests; type-check; lint; check:instructions (54 folders);
test:instructions (3 tests); build; git diff --check. The initial coverage run
stalled in App tests and was interrupted; isolated App tests (20), the remaining
suite (244) and a subsequent full coverage run (264 tests, 38 files) pass.
Chrome automated geometry checks at full and compact/mobile sizes verify fixed
joints, fingertip contact without crossing, release, selection feedback, reduced
motion and the app motion toggle, with no page errors. Screenshots were reviewed;
temporary check: /private/tmp/dm-pinch-animation-check.mjs. Temporary Vite server
stopped. Existing unrelated VoiceSelection effect lint and production bundle-size
warnings remain. Safari/Firefox visual checks were not performed. Changes remain
local; other workspace edits were preserved.


## 2026-09-30 — Sprint 4B interactive motion and responsive polish

Added a landing gesture playground: five selectable animated examples with real
mouse/keyboard/pinch targets, explanatory copy and an explicit illustrated-preview
label. Added coordinated heading entrances, subtle illustration motion, navigation
underlines, hover/focus feedback, shared click/pinch acknowledgement, guide progress
and tip transitions, modal/disclosure entrances and loader breathing. Screen changes
fade without remounting feature state or moving registered controls. Presentation
uses CSS and owned, cancellable Web Animations; no per-frame React updates, new
animation library or recognition thresholds were introduced.

Tablet welcome now stacks at 701–1000px. Narrow-phone brand/type/CTA sizing and
voice language buttons avoid fixed-width overflow. Camera lifecycle, scoped events,
permission, exercise readiness and form state remain owned by existing modules.
The hand illustration correction and expired-guest recovery are separate concurrent
workspace changes recorded above, preserved by this task.

At the owner's request, removed every pause/resume-animation button and its saved
preference. Old saved pause values are ignored. Motion runs automatically, follows
system reduced-motion changes (including cancelling active feedback), and decorative
CSS loops suspend while the document is hidden. No new settings control is shown.

Checks: type-check, lint, test:coverage (264 tests / 38 files), instruction checks
(54 folders / 3 script tests), root cloud and /dungeon-master/ cloud builds, plus
whitespace checks pass. Chrome development and prefixed production smoke cover
320×740, 360×800, 390×844, 700×900, 701×900, 834×1112, 844×390, 1024×768 and 1440×960.
Checks include stable control geometry during acknowledgement, native keyboard
selection, all gesture previews, no animation buttons, ignoring obsolete pause
values, immediate system reduced motion, hand/voice modal bounds, and navigation
through Context/Plan/Progress/Schedule with intentionally offline APIs. No horizontal
overflow, UI console exceptions or page errors; camera remains unrequested on entry
and preview. Static production screenshots under docs/screenshots/sprint4b-motion
fast-forward animations during capture; running animations are verified separately.
Scripts: /private/tmp/dm-motion-smoke.mjs and dm-motion-production-smoke.mjs.
Real webcam/inference performance and Safari/Firefox remain manual. The existing
large production-bundle warning remains. Changes are local and not deployed.

## 2026-09-30 — Sprint 4A visible history navigation fallback

Added a header “Go back” button on screens beyond the landing page. The existing
GestureTarget supports click, keyboard and pinch selection. The browser routing
hook tracks entries created during the current app mount, traverses native history
and preserves Forward, context steps and query parameters. Direct links return
home without traversing unrelated history. Existing mode guards still require
fresh calibration when returning to an abandoned workout.

Checks: `npm run test -- src/app` (108 tests), `npm run test` (271 tests),
`npm run type-check`, `npm run lint`, `npm run check:instructions`,
`npm run test:instructions`, `npm run build` and `git diff --check` pass.
Chrome smoke at 320, 390, 834 and 1440px verifies click/Enter, Forward, direct-link
fallback, usable target size and no horizontal overflow with offline APIs.
Temporary script: `/private/tmp/dm-back-button-smoke.mjs`; reviewed mobile capture:
`/private/tmp/dm-back-button-mobile.png`. Temporary Vite server stopped after checks.
Reloading starts a new app history boundary; Go back then uses the home fallback.
Real webcam and Safari/Firefox checks remain pending. Existing production bundle
size warning remains. Changes are local; pre-existing workspace edits are preserved.

## 2026-09-30 — Sprint 4B OpenAI/coach availability diagnosis

Acceptance checked: a bounded live GPT-5.4 request with the configured backend
key, provider execution inside the owned VPS container, and the coach request
through the running localhost Vite proxy. Secrets and provider text were never
printed. Synthetic disposable guests were used for application requests; no
existing owner's profile, plan or schedule was changed.

OpenAI Responses completed successfully in 10.64 seconds. VPS capabilities report
AI configured/enabled with live mode, and both owned containers are healthy.
The VPS coach adapter also returned a valid answer on a synthetic context in
5.28 seconds. This confirms API access, not universal provider availability.

Found and fixed a frontend deadline mismatch: ReleaseClient.turn inherited the
ordinary 7-second ApiClient timeout, while the deployed controller permits a
62-second total tool/retry deadline. BackendStore.request now forwards an optional
per-request timeout; coach turns use 75 seconds. Other requests retain their
existing deadlines and cancellation stays immediate. Regression tests cover a
14-second answer, the 75-second timeout, view cancellation and ordinary timeouts.

Separate remaining issue: full endpoint probes returned HTTP 200 with
execution_mode=fallback/error_category=schema after 14.02 and 9.65 seconds.
A VPS adapter probe using actual synthetic profile/plan context produced a
profile reference with a non-null ID and a document reference outside confirmed
facts. Existing valid_sources correctly rejected them. Another minimal probe
cited progress despite zero completed sessions. No source validation was relaxed;
coach source-reference prompt guidance remains a follow-up within Sprint 4B.

Checks: focused backend.test.ts/release.test.ts (33 tests), full frontend suite
(268 tests / 38 files), npm run type-check, lint, check:instructions (54 folders),
test:instructions (3 tests), build and git diff --check pass. The existing bundle
size warning remains. Backend code/config and deployment were unchanged; backend
tests were not run. Frontend changes remain local. General browser/live-camera
acceptance and a full live coach endpoint response remain unverified.

## 2026-09-30 — Sprint 4B coach source-reference prompt and strict fallback

Acceptance completed: clarified the coach prompt's reference rules while retaining
the existing deterministic valid_sources implementation and structured schema.
Prompt provenance is now coach-v2. Profile/preferences references require null
source_id; document IDs must come from the original context's confirmed facts;
progress requires completed sessions and either a null aggregate reference or an
owned recent-session ID. Plans, exercise/spec/item IDs, schedule objects and UUIDs
in user text are not document sources. Empty references are explicitly valid for
greetings, missing data and plan explanations without qualifying evidence.

New controller regression cases exposed an existing fallback bug: source validation
set fallback/schema but left the rejected provider answer assigned, so its text and
invalid references could still be persisted. The failure handler now clears that
answer before building the existing deterministic fallback. Validation was not
relaxed; rejected references are neither rewritten nor silently accepted.

Thirteen regression cases verify accepted empty/profile/preferences/confirmed-doc/
saved-progress references and rejection of non-null profile/preferences IDs,
unknown/missing document IDs, zero-session progress and foreign session IDs.
Rejected answers now return fallback/schema with no provider text or references.
Provider instructions and persisted prompt-version propagation are also covered.

Checks: focused coach cases (13 passed); Sprint 4B/provider suites (51 passed);
full backend make test (297 passed, 92.77% coverage, 90% gate retained) against a
new isolated loopback PostgreSQL on port 55441 with fresh migrations/drift checks.
Real provider keys were disabled for automated suites. Focused Ruff format/lint
and git diff --check pass. Repository-wide make check/lint were also attempted:
they currently fail in concurrent unrelated speech.py formatting and voice_batch.py
zip(strict=...) changes. Those files were preserved and not changed by this task.

Three bounded live GPT-5.4 probes on synthetic context pass the unchanged source
validator: plan-only answer with [] (4.92 s), confirmed-document answer (4.58 s),
saved-progress answer (3.61 s). This sample is evidence, not a guarantee of future
model compliance; invalid future answers still receive the strict fallback.
No secrets, prompts or raw provider text were printed. Changes are local; the
updated backend prompt/fallback has not been deployed to the VPS.


## 2026-09-30 — Sprint 4B native fields and header polish

Replaced bare date/time and text controls with shared rounded paper/white surfaces,
consistent labels, subtle shadows, hover and keyboard focus feedback, and system
reduced-motion support. Context text/select fields and the coach composer share
the styling. The schedule now has a date/refresh toolbar, paired desktop fields,
a separate appointment card, readable availability rows, compact day checkboxes
and spaced action groups. Phone layouts stack fields and actions. Date/time
controls remain native; timezone help is an accessible description, separate from
the date field's label. No scheduling rules, provider calls or camera logic changed.

The header's development page code and backend status now use distinct surfaces
and a wrapping flex row with a 10px gap, fixing PLAN / Локальный режим collisions.
No pause-animation controls were added.

Added three rendered regressions for required native appointment validation and
UTC proposals, unique day/time labels and availability edits, and coach draft
preservation with a stable operation ID on retry. Focused tests and the full
frontend suite pass (274 tests / 39 files at the initial complete check); typecheck,
lint, instruction checks (54 folders / 3 script tests) and cloud build passed.
Existing localStorage runtime and large-bundle warnings remain.

Chrome checks at 320, 390, 834, 1024 and 1440px verify separated header rectangles,
native date/time/text editing, 22px day checkboxes, visible focus, and no horizontal
overflow or page errors across Plan, Schedule and Context. Backend transport was
intentionally offline; schedule preferences/data were injected synthetic fixtures
through the existing client for presentation checks. No writes, webcam requests
or live provider calls were made. Screenshots under screenshots/sprint4b-forms
fast-forward motion only during still capture; temporary script:
/private/tmp/dm-forms-smoke.mjs. Safari/Firefox native-picker appearance remains
unverified. Changes remain local, with other ongoing workspace edits preserved.

Final verification note: separate interface-localization edits appeared in the
shared workspace after the complete 274-test pass and visual capture. A subsequent
full run reported 24 text/label assertion failures in App, personalization, motion
and voice tests (250 passed); the three form regressions still passed. These
concurrent changes were preserved rather than reverted or incorporated into the
form task. Initial screenshots and browser geometry checks precede those updates.
Final form-focused rerun (3 tests), typecheck, lint, both instruction checks and
cloud build pass against the current workspace. The temporary Vite server was
stopped. The complete-suite localization failures remain separately outstanding.

## Sprint 4B — Russian, Kazakh and English interface (2026-09-30)

Acceptance: all application pages and dialogs expose localized interface copy;
a dedicated language button selects Russian, Kazakh or English; the choice
survives navigation/reload and does not reset camera/workout state.

Added `store/uiLanguage.ts` for validated local persistence, memory fallback and
cross-tab updates, `app/UiLanguageProvider.tsx` for composition, shared translation
copy/context helpers, and a gesture-accessible `LanguageSwitcher`. The control
appears in the header, Google callback, hands onboarding and voice dialog with
unique target IDs. Escape closes language choices before it reaches a dialog.
Page/feature labels, accessibility text, optional-integration statuses, seeded
exercise names, readiness/technique feedback and dates use the site language.
Existing multilingual MovementSpec cues resolve at presentation time. API enums,
profile drafts, voice preferences and recognition/counting logic keep their
existing contracts; no backend files were changed by this localization task.
Cyrillic heading fallbacks and mobile language controls use the existing assets.

Tests/checks: `npm run type-check`, `npm run lint`,
`npm run check:instructions`, `npm run test` (40 files, 291 tests passed),
`npm run build`, and `git diff --check`. The label expectations in existing
App/personalization/motion/voice tests now reflect the default Russian UI;
these checks supersede the earlier concurrent-localization failure note above.
Fifteen localization tests cover all legacy screens, context steps, rest/next-set,
mouse/keyboard/pinch selection, draft/enum preservation, invalid/unreadable
storage, reloads, cross-tab updates and coaching-cue switches with unchanged
repetition counts and DOM identity.

Headless Chrome checked eight routes and synthetic camera setup × three languages
× 390/834/1440px: 81 checks, no horizontal overflow and no page errors. A long
Russian calibration heading now wraps at mobile widths. Language persistence and
switches in both dialogs also passed. Synthetic offline API responses prevented live writes
or provider calls; no webcam permission was requested. Browser evidence is in
`/private/tmp/dm-localization-qa`, with the temporary check script at
`/private/tmp/dm-localization-browser.mjs`.

Known limits: user input, document/source excerpts and unknown generated/provider
text keep their original language; available multilingual movement cues switch
locally. Coaching speech language remains an explicit independent voice setting.
The production build still reports the existing large-chunk warning. Real camera
hardware and additional browser engines were not tested for this change. All
pre-existing and concurrently edited workspace changes were preserved.

## 2026-09-30 — Sprint 4B confident professional coach prompt

Updated the contextual coach to lead with a clear recommendation or answer,
explain the supporting facts briefly and give one concrete next step. The voice
is calm, precise and confident, with less filler, unnecessary hedging and repeated
disclaimers. It uses supplied exercise/schedule details, states missing information
directly and retains the fitness role without invented medical credentials or
clinical guarantees. Language and preferred style still apply. Existing source
rules, strict validation, proposal confirmation and deterministic fallback remain.

Prompt provenance is now `coach-v3`; the controller regression asserts this
version and that the provider receives the updated instructions. Checks: 13 focused
coach cases; `make check`; focused Ruff format/lint; full `make test` with 320 passing
tests and 96.01% coverage (90% gate retained); `git diff --check`. The full suite used
a new isolated loopback PostgreSQL with fresh migrations/drift checks and disabled
real provider keys; the temporary cluster was stopped and removed afterward.

Live model tone was not sampled; automated tests establish prompt delivery and
existing behavior, not guaranteed wording. Changes remain local and are not
deployed to the VPS. Pre-existing workspace edits were preserved.

## 2026-09-30 — Sprint 4B selected voice during exercise

Acceptance: generated calibration, phase, correction and coach messages use the
saved ElevenLabs voice; browser speech remains available on provider failure.

The audio coordinator previously mapped only calibration, phases and error rules,
using the voice language to match recognition text. Generated ready/positive/
completion messages had no provider loader and went directly to system speech;
different recognition/voice languages also lost the mapping. Exercise clips were
discarded at each application mode change and were not preloaded.

Added a complete exercise cue catalog, with internal coach names separated from
fixed cues. The existing authenticated speech request now includes the current
exercise key and owned spec revision for every generated cue. Matching uses the
recognition event language; narration uses the saved voice language. App preloads
generated cues at calibration and resumes preparation through countdown/workout.
Clips survive mode changes within a spec, clear on voice/spec revision changes,
and successful on-demand clips are reused. The bounded cache accommodates the
fixed catalog plus one validated spec. Positive/recovery events and matching
snapshots share cue IDs to prevent duplicate narration. No backend changes or
provider work in vision processing were introduced.

Files: `frontend/src/audio/{audioCoordinator.ts,cues.ts}`, `frontend/src/api/release.ts`,
`frontend/src/app/App.tsx`, the audio coordinator and release regression tests,
and this log. Existing workspace changes were preserved.

Checks: focused audio/release/App tests; full frontend suite (309 tests, 40 files);
`npm run type-check`, `npm run lint`, `npm run check:instructions`,
`npm run test:instructions` (3 tests), `npm run build` and `git diff --check`.
All passed. Existing build chunk-size and Node localStorage warnings remain.

Known limits: live provider/workout playback and hardware were not tested; failed
or unavailable provider cues still use the visible system-voice fallback. Changes
are local frontend code and build artifacts; no VPS deployment was performed.
Next safe task: reload the local frontend and confirm the chosen voice during a
generated exercise, including a correction and an accepted repetition.

## 2026-09-30 — Sprint 4B branded browser tab icon

Acceptance: the browser tab uses the existing Dungeon Master mark from the app
header, and the icon remains available in root and subdirectory production builds.

`frontend/index.html` now links directly to `public/design/dm-mark.svg` using
Vite's `%BASE_URL%` substitution. Reusing the brand asset avoids a separate copy
and replaces the scaffold favicon URL. Added
`frontend/src/app/__tests__/favicon.test.ts` to check the base-aware link and valid
SVG asset. Existing workspace edits were preserved.

Checks: focused favicon test; full frontend suite (327 tests, 42 files);
`npm run type-check`, `npm run lint`, `npm run check:instructions`,
`npm run test:instructions` (3 tests), `npm run build`;
`python3 scripts/check_frontend_build.py` verified real HTTP asset delivery.
An additional build with `--base=/dungeon-master/` in a temporary output directory
verified the substituted favicon URL and identical brand SVG bytes. All passed.
Existing chunk-size and Node localStorage warnings remain.

Known limits: browser tab appearance was not manually inspected; frontend changes
remain local. Next safe task: reload the local page and inspect the tab icon.

## 2026-09-30 — Sprint 4B workout voice settings and ready coach discovery

Acceptance: the voice selector is available during a running workout without
losing measured repetitions; the first start-workout entry shows the existing
MAYA, ARMAN and DANA persona programs immediately.

Removed the disabled workout voice action and added it to the camera coach
controls. Opening settings pauses the session and stops narration; saving uses
the selected voice, while closing or Escape preserves saved preferences and the
previous mute state. Continuing the workout retains the same session and reps.
Pending preference reads cannot overwrite an explicit settings change.

Landing desktop/mobile start actions and the first how-it-works step now open
the plan page, with the three original persona cards above the plan. Shared
persona data keeps these cards consistent with the existing context flow. A
selection reuses the existing guest/persona and generation APIs, prevents double
submissions, supports retry without replacing the guest again, and cancels work
when leaving. Initial camera/voice onboarding does not obscure the cards.
Added Russian, Kazakh and English labels using the existing localization system.

Files: `frontend/src/app/App.tsx`, its App and personalization regression tests,
`features/personalization/{CameraCoachShell,ContextFlow,ReadyPrograms,demoPersonas}`,
`features/voice/VoiceSelection.tsx` and its tests, `pages/LandingPage.tsx`,
`shared/translations.ts`, `frontend/src/index.css` and this log. Existing unrelated
workspace changes were preserved.

Checks: focused App/personalization/voice tests (48 passed); full frontend suite
(327 tests, 42 files); type-check, lint, instruction checks, instruction tests
(3 passed), production build and `git diff --check`. Chrome checks covered the
three cards in three languages at 390/834/1440 px, with no overflow or page errors.
A fake-vision workout retained rep 1 through save and dismissal, then reached
rep 2 after continuing, with one preference write and one session. All passed.

Known limits: Chrome used intercepted APIs and fake vision. Live provider audio,
physical camera/gestures and real persona generation were not tested. Existing
demo-persona/fixture feature gates remain enforced; no environment flags were
changed and no VPS deployment was performed. Next safe task: verify these flows
against the configured backend and the selected ElevenLabs voice on a real device.


## 2026-09-30 — Sprint 4B: voice loading, durable v4 cache and natural previews

Acceptance: restore local voice loading, prepare the explicitly approved large
shared cue catalog on the owner's VPS, and replace technical demo text and raw
provider descriptions with natural coaching previews and readable voice cards.

The ignored local frontend environment now proxies `/api/v1` to the HTTPS API.
Voice selection retains retry/silent fallback and explicit guest recovery. Static
browser cues can preload and remain cached across routes, with private clips and
voice/language changes isolated. The server persists only public fixed cues and
previews in the named `dungeon-master-voice-assets` volume; private answers stay
owner-scoped in memory. Keys include voice/model/language/style/text and versions.
Atomic writes, capacity limits and cross-process leases prevent corrupt or duplicate
shared assets. Administrative v4 packs retain paid timed responses before accurate
ffmpeg cuts so preparation can resume without duplicate paid batches.

Final user steering requested simple improvements to demos and descriptions.
Russian, Kazakh and English previews now use natural coaching lines, ellipses,
questions and exclamations. Existing v4 delivery tags apply the selected style;
`PREVIEW_VERSION = preview-v2` is shared by playback and preparation. Voice cards
summarize declared API `description`/descriptive labels in the UI language, prefer
structured labels, omit raw marketing and invalid strings, and invite listening
where usable acoustic metadata is missing. Provider account metadata is unchanged.

All 40 ready account voices have the full supportive catalog in three languages:
2,880 current clips, including all 120 new previews. A read-only plan in the deployed
container reported `missing_clips: 0` and `new_characters: 0`. One professional voice
(Sergei Burunov) has no completed fine-tuning and is excluded/reported; no verification
or training bypass was attempted. Other styles are generated and cached on demand.
The temporary preparation container was removed after completion; the volume remains.

Backend release `d7b855bf6d7b2edd05272738cbb0c61dae64d910` passed CI (Back),
CI (Front), Docker smoke, release verification, image build and CD in GitHub run
36787279904. The frontend continues running locally at `http://localhost:5173`.
Only this task's backend/cache changes were committed for the API release; concurrent
frontend and documentation work was preserved. An unrelated checklist deletion
accidentally included in the preceding cache commit was restored in the release
without changing its owner's working-tree deletion.

Verification:

- `make ci-backend` with paid providers disabled and isolated loopback PostgreSQL:
  329 tests passed, 96.03% coverage. The first sandboxed run could not connect;
  the permitted loopback run passed.
- Focused `tests/test_voice_cache.py --no-cov`: 32 passed, including preview-version
  invalidation, disk reuse across owners, paid batch resume and actual audio cutting.
- Focused voice UI/description tests: 15 passed.
- `npm run test:coverage`: 321 passed in 41 files, 91.74% coverage. An initial run
  overlapped unrelated in-progress ready-program edits; the subsequent suite passed.
- Frontend type-check, lint, folder instructions, production build and HTTP build
  smoke passed. Architecture and Python style checks passed as part of backend CI.
- Chrome at localhost: RU/EN/KK lists returned 200; visible captions used normalized
  API characteristics, invalid provider text was absent, and the new preview returned
  `audio/mpeg`, `X-Audio-Cache: hit`, 132,955 bytes, without page errors.
- Two independent guests requested previews, welcome and countdown in all three
  languages: 18/18 valid MP3 cache hits after deployment. Server transfer latency
  was about 0.56–1.11 seconds; browser preloaded cues avoid subsequent provider calls.

Limitations: captions reflect declared provider metadata, not a fresh acoustic
analysis. Missing metadata cannot supply a trustworthy timbre. The unavailable
professional voice remains unavailable until ElevenLabs completes its preparation.
Delivery quality is subjective; automated checks verify parameters/cache/playback.
Next safe task: review the new previews by ear and adjust copy only where needed.

Final Chrome check confirmed the new clip reaches the playing state.
Deployed backend digest: `sha256:1f7aee2034638acd5cdbd2bb3192de714a2ca53737a2400e19086bd3646b3fc9`.
The task-owned temporary PostgreSQL and warm-up container were stopped; the local
credential copy was removed, and the server cache volume was retained.

## 2026-09-30 — Sprint 4B ready-program gate diagnosis

The owner reported that choosing one of the three ready coaches appeared to do
nothing. The UI loads a synthetic persona, then submits plan generation in
fixture mode. The production API allows persona loading but `ENABLE_FIXTURE_MODE`
is unset, so the backend default disables generation and returns 403. The
frontend treated every 403 as a demo-persona access failure and placed its alert
below the coach cards.

Moved progress and errors above the cards, distinguished coach loading from plan
generation, and show the relevant backend flags when either request is forbidden.
Added a regression for fixture-mode 403. Read-only SSH to `backend-hr` confirmed
the backend and PostgreSQL are healthy, `APP_ENV=production`,
`ENABLE_DEMO_PERSONAS=true`, and `ENABLE_FIXTURE_MODE` unset. Public API readiness
returned `status: ok` and `database: reachable` before the change.

Checks: focused personalization tests (10); full frontend suite (328 tests,
42 files); type-check, lint, build and `git diff --check`. All passed.

After the owner asked to fix the server, added `ENABLE_FIXTURE_MODE=true` to the
production runtime env, preserving the original in a mode-600 backup. Recreated
only the Dungeon Master backend with its existing image; PostgreSQL was untouched.
The running backend now reports all three expected settings, and public readiness
returns `status: ok` and `database: reachable`.

The production generation request was not submitted during verification, avoiding
creation of a persistent test guest and synthetic plan. Next safe task: select a
coach in the local app and confirm the generated program opens.
