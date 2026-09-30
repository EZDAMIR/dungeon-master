# Test Strategy

## 1. Test pyramid

### Pure visual unit tests

Highest priority and fastest feedback.

Test:

- geometry and angle helpers;
- cursor mapping;
- smoothing;
- pinch hysteresis;
- hold, release and cooldown;
- application mode transitions;
- squat state transitions;
- repetition completion;
- error activation and recovery;
- feedback priority and rate limiting.

Use normalized JSON landmark fixtures and a fake monotonic clock.

### Frontend component tests

Use a fake visual event source. Verify that semantic events change focus, route,
count, feedback and result state without a real camera.

### Browser smoke test

One end-to-end flow with fake visual events:

```text
tutorial -> menu -> calibration -> workout -> error -> correction -> results
```

A separate manual checklist covers a real webcam.

### Backend tests

Preserve the current coverage gate. Each domain needs:

- schema tests;
- database model tests;
- controller tests;
- endpoint and permission tests;
- provider adapter tests with mocked HTTP.

## 2. Visual fixture format

Keep fixtures small and provider-neutral:

```json
{
  "version": 1,
  "fps": 20,
  "frames": [
    {
      "at_ms": 0,
      "landmarks": [
        {"x": 0.5, "y": 0.4, "z": 0.0, "visibility": 0.99}
      ]
    }
  ]
}
```

Do not commit identifiable webcam recordings or personal health data.

## 3. Manual camera matrix

Test at minimum:

- bright and dim indoor light;
- plain and moderately busy background;
- laptop webcam;
- phone camera layout;
- left and right hand;
- user near and far;
- temporary occlusion;
- low-performance device where available.

Record observations as thresholds are tuned.

## 4. Failure tests

- camera permission denied;
- camera removed after startup;
- recognizer model fails to load;
- hand disappears during hold;
- body disappears during repetition;
- backend offline;
- plan provider timeout;
- calendar authorization cancelled;
- voice provider unavailable.

The local workout and result must survive all optional-provider failures.


## Sprint 2 automated coverage and manual boundary

All algorithm tests use provider-neutral synthetic poses and a monotonic clock; no camera or real model is needed. Versioned JSON files cover side standing, front view, cropped body, correct/shallow/fast cycles, incomplete extension, mid-rep tracking loss, raised hands and standing jitter. `tests/fixtures/pose/builder.ts` generates readable motions and `generate.ts` regenerates the stored JSON. No personal biometric sequences, photos or video are fixtures.

Checks include finite geometry/degenerate vectors, normalized side score, stable side choice, visibility and margins, EMA/outliers/reset, all sequential calibration gates, full-cycle transitions, duplicates/jitter/partials/timeouts, three error rules/multiple errors and deterministic result aggregation. Session tests pass JSON through smoothing, readiness, calibration and analyzer. Pose pause checks hold/release/cooldown and ignored movement. Feedback priority, readiness stabilization and expiry are pure tests; browser speech is mocked to check cooldown, critical interruption and failure isolation.

Shared-source integration tests replay MENU → selection/confirmation → CALIBRATION → COUNTDOWN → WORKOUT → five total cycles → RESULTS. They cover readiness/countdown cancellation, rejected counts, recovery, pause/resume preservation, repeat reset and menu reset. A rendered App test verifies the same UI/corrections/results. Existing gesture fixtures/tests remain. Camera/model lifecycle tests verify one stream, serial close/initialize, switching back to hand mode, bounded inference, stale callbacks, disposal during startup and tab visibility. Canvas tests check mirror/letterboxing/DPR/cleanup without retaining camera images.

Production checks must include both normal and `/dungeon-master/` builds, preview HTTP responses/checksums for both models and installed WASM, absence of fake controls from the production bundle, and a clean clone with `npm ci` and automatic asset preparation. Check that cached valid assets need no download and a downloaded checksum mismatch fails without installing a file. Backend regression uses existing `make check` / `make test`; product backend code is unchanged.

Real-camera verification is **not performed** here. [Sprint 2 manual acceptance](SPRINT_2_MANUAL_CHECKLIST.md) remains mandatory before accepting real counting reliability or tuning defaults. Mocked model performance does not establish inference speed.


## Sprint 3 domain and integration verification

Backend `make test` retains the 90% coverage gate. Tests cover schema bounds and
native enum parity, guest token/null email/expiry, full profile replacement,
confirmed-only eligibility, seed uniqueness/idempotency, exact day schedules,
atomic plan rollback/one active plan, primitive model results, session ownership,
conflicting/identical retries, guarded completion and progress totals/sorting.
A route matrix verifies all seven permissions, missing/invalid/expired JWTs,
superuser bypass and documented response/security metadata. Extra fields are
rejected at outer/set/summary/metrics/error levels; tests submit landmarks, frames,
video, image and screenshot and assert sanitized validation errors do not echo
submitted values. Logging/SQL parameter privacy and architectural AST boundaries
are checked. No external providers are called.

Database setup: install PostgreSQL client tools (`createdb`, `dropdb` on PATH),
configure TEST_DATABASE_URL in backend `.env` or process environment to a distinct
local database name ending `_test`, and grant its user CREATE DATABASE rights.
Allowed test hosts are localhost, 127.0.0.1 or the local Compose `postgres` service;
production APP_ENV and matching application/test URLs are rejected. The session
fixture creates its own UUID-named database, applies **all** Alembic revisions,
runs `alembic check`, and drops that database in teardown. It never truncates or
migrates the configured database. Missing/unconfirmed configuration fails tests
instead of silently skipping database coverage. Domain tests share the `domains`
xdist group; current suite runs sequentially against this disposable database.
Never point tests or migration verification at production.

An additional explicitly fresh local DB verifies complete migration application,
squat seed and metadata drift. Every newly generated migration has `downgrade():
pass`; metadata is declared before each migration and no raw SQL, triggers,
procedures or explicit locks are introduced.

Frontend tests mock fetch/storage rather than camera or real DB. They cover:

- Single bootstrap across StrictMode, restored/missing/invalid token, controlled
  401 recovery, default profile only on 404 and plan reuse on reload.
- Full profile save/local draft reconnection and no-eligible messaging.
- Three-step session sync, failures after start/set, safe retry with stable IDs,
  queue reload/capacity/removal, raw-data-free storage and guest identity isolation.
- External abort, timeout, malformed/empty responses and typed request IDs.
- Profile controls, plan schedules, empty/cached Progress, CSS bars and semantic
  navigation/Back without restarting pose or camera permission.
- Immediate Results while a POST is unresolved, and a full local workout despite
  all API calls failing. Backend state never clears the workout result.
- Banner live region/style classes and retention after a short semantic error.

Initial Sprint 3 results: 161 backend tests, 99.19% coverage; 116 frontend tests, statements/
lines 98.11%, branches 89.96%, functions 93.14%. Coverage configuration and strict
TypeScript were not weakened. Root and /dungeon-master/ production builds, matching
preview, both model checksums and all six installed WASM byte comparisons are
required. Architecture/folder-guidance verification supplements domain tests;
its scaffold checks alone do not prove runtime correctness.

Manual boundary: [Sprint 3 checklist](SPRINT_3_MANUAL_CHECKLIST.md) remains **not
performed**. Automated synthetic/mocked scenarios do not prove camera accuracy,
distance readability, real gesture UI operation or live reconnection. Record only
aggregate observations, never tokens, camera recordings or personal health notes.

## Sprint 3 backend convention refactor verification

The backend suite now contains 222 tests and retains the 90% coverage gate.
Regression checks cover request/response base separation, persistence-only
controller dumps, strict response counters, finite size-bounded generic JSON and
typed OpenAPI errors. Shared health/error responses, caller claim fields and
pagination counters also reject coercion. All eleven TEXT limits accept a multibyte string at the
boundary, reject an extra character through the named database check and retain
nullable values and rollback behavior.

Disposable databases use `template0` with explicit UTF8 encoding so these tests
exercise character limits independently of the local cluster's default encoding.
The populated migration test creates a separate owned database, applies the prior
head, saves a profile/plan/completed session, then upgrades to the new head and
runs `alembic check`. It compares all table contents and API responses and retries
session start, set submission and completion after the upgrade. Both database
fixtures drop only the UUID databases they created.

Final refactor results: 222 passed, 99.22% backend coverage. Ruff formatting/lint,
architecture verification and instruction-source hash checks also pass. All
thirteen API operations retain their request contracts and response fields;
response validation bounds and custom error schemas are more explicit.

## GitHub Actions and local Make targets

`.github/workflows/ci.yml` runs separate **CI (Back)** and **CI (Front)** jobs,
calling `ci-backend` (Python 3.12/PostgreSQL 17) and `ci-frontend-checks` (Node 24).
After both pass, **Smoke tests** verifies frontend production builds and an
isolated Compose stack. **Verify release** and **Build release** then prepare
the exact tested SHA for **CD**. Failed/cancelled prerequisites skip CD.
Pushes, pull requests and manual runs trigger the pipeline; PRs cannot deploy.
Actions are pinned; CI/smoke permissions remain read-only and credentials are
disposable. Deployment secrets and package access are scoped to main CD.

Use `make fix` to apply backend/script Ruff formatting and frontend lint fixes,
then `make check`. `make ci` adds database-backed coverage, frontend coverage,
both production builds and Docker checks. It never formats source. The backend
fixture verifies a fresh migration chain and metadata drift, and Docker verifies
the shipped runtime reaches the same schema without drift.

### Smoke tests

`make smoke-tests` runs the existing frontend and Docker checks together.
`make smoke-tests-frontend` and `make smoke-tests-docker` select either suite.
The separate **Smoke tests** job calls `make smoke-tests` after CI succeeds.
The full local `ci-frontend` target still includes frontend smoke verification.

The frontend build checker starts a bounded temporary preview for each base,
compares served JS/CSS/model/WASM bytes and rejects development fake controls.
Five HTTP regression tests exercise successful root/subdirectory delivery,
HTML model fallbacks, stale WASM, incorrect base paths and fake controls.

Docker checks use a unique Compose project, publish no host ports, verify both
healthchecks/non-root runtime and exercise health/readiness/docs/OpenAPI/request
IDs/unauthorized responses. Stopping only that project's database must preserve
health while readiness returns a flat 503. Cleanup removes only the test project's
containers/network/volume on success or failure; existing development data is
never reset by these targets.

## Sprint 4A verification

Mock all provider calls; no real key is required. Backend tests cover upload errors/limits, facts and owned sources, chunking/ranking, embeddings persistence and isolation, structured SDK output, persona profiles/plans, regenerated volume, one repair/manual fallback, aggregate generic results and deterministic fallback. The populated Sprint 3 migration regression reflects the deployed previous revision before upgrading; it checks original data/API/idempotency plus drift. The unchanged backend coverage gate is 90%.

Frontend tests cover jury visibility, source review/upload, why/source chips/details/manual states, message bounds, held conditions, landmark repetitions/corrections, tracking loss, average reset and full shared-pose replay. Existing gesture/squat/sync tests remain. Production Chrome screenshots cover desktop, 390×844 and 834×1112; synthetic live correction screenshots are labelled development evidence. Functional test success does not imply visual parity. [Visual QA](FIGMA_VISUAL_QA.md) and [manual checklist](SPRINT_4A_MANUAL_CHECKLIST.md) record hardware/provider checks still outstanding.
