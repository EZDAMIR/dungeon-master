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
