# Development Log

Track progress here. Update after each commit.

---

## Initial Infrastructure

**Implemented:**
- FastAPI application with lifecycle management
- Pydantic Settings configuration
- SQLAlchemy 2.0 Core + asyncpg database layer (`@postgres.session`)
- Alembic migration setup (empty chain, ready for domain tables)
- JWT authentication foundation (token decode → UserCurrent, no DB lookup)
- Permission dependency infrastructure (PermsRequired, SuperUserRequired, NoPermsRequired)
- Limit/offset pagination (Paginator dependency)
- Structured logging + request ID middleware
- httpx async HTTP client (for external API calls)
- File storage abstraction (LocalStorage + StorageBackend interface)
- AI adapter placeholder (`src/ai/`)
- `/health` + `/ready` endpoints
- Docker + docker-compose setup
- Test foundation with 90%+ coverage

**Verification:**
- `make test` passes
- `/health` returns `{"status": "ok"}`
- `/docs` renders OpenAPI UI

---

## Sprint 0 — Architecture Scaffold (2026-09-30)

**Completed:**
- Copied all documentation and instruction files from the blueprint template:
  `README.md`, `CLAUDE.md`, `AGENTS.md`, `AGENT.md`, `AGENT_PROMPT.md`,
  `docs/ARCHITECTURE.md`, `docs/PROJECT_STRUCTURE.md`, `docs/DOMAIN_MODEL.md`,
  `docs/API_CONTRACT.md`, `docs/VISION_PIPELINE.md`, `docs/IMPLEMENTATION_PLAN.md`,
  `docs/TEST_STRATEGY.md`, `docs/HACKATHON_CHECKLIST.md`,
  `docs/decisions/0001–0003`, `scripts/verify_architecture.py`,
  and all backend/frontend `CLAUDE.md` / `AGENTS.md` / `AGENT.md` overlay files.
- Initialized `frontend/` with React 19 + TypeScript 6 + Vite 8.
- Strict TypeScript (`strict: true`) enabled in `tsconfig.app.json`.
- Added `type-check`, `test`, `lint`, `build` scripts to `frontend/package.json`.
- Implemented `AppMode` discriminated union (TUTORIAL → MENU → CALIBRATION →
  COUNTDOWN → WORKOUT → RESULTS) with pure `transition()` and `appReducer()`.
- Implemented `VisionEvent` discriminated union in `src/types/vision.ts`.
- Built fake-event application shell: page stubs for all 6 modes, `FakeSource`
  dev controls panel, `WorkoutPage` with fake rep + technique-error buttons,
  `ResultsPage` displaying session totals.
- Created all required `frontend/` directory structure with `.gitkeep` sentinels.
- Created `backend/src/ai/prompts/` and `backend/tests/fixtures/` directories.

**Verification:**
- `python3 scripts/verify_architecture.py` — scaffold complete.
- Frontend: `npm run type-check` clean, `npm run lint` clean, `npm run build` OK.
- Frontend: 13/13 unit tests pass (mode transitions, reducer, complete flow).
- Backend: `make check` — 48 files formatted, all checks passed.
- Backend: `make test` — 95/95 tests pass, coverage 96.39% (≥ 90% gate).


## Sprint 3 — Core Backend Domains, Persistence and Progress (2026-09-30)

Starting commit: `ddb8640db47e8b52b71ce0b98adbf5a803f4144f`, proven descendant
of required Sprint 2 baseline `9971f8e31924a68937053ecb8415934782035658`.
Work is isolated on `sprint/core-backend-domains`; no main rewrite or provider work.

Implemented flat schemas/models/controllers/endpoints for users/guest auth,
profiles/confirmed constraints, allowlisted catalog, deterministic plans,
idempotent aggregate sessions and progress. Models use SQLAlchemy Core and the
existing @postgres.session; controllers dump JSON primitives and never create
sessions or SQL. Profile/constraint replacement, archive/create/items and guarded
session operations own their atomic boundaries in models. Only confirmed
constraints influence the reused pure eligibility helper.

Five metadata-first Alembic revisions were generated separately, hand-reviewed
and applied: `298885d8eb24`, `6d76bd5ceb62`, `c8a350ad1383`, `f8cbfe1577f4`,
`e2dc2dbe10a5`. Eight tables, named native enums, FK cascades, check constraints,
client UUID uniqueness and the partial one-active-plan index are declared in
metadata. Catalog migration seeds squat idempotently through PostgreSQL insert
on conflict. Downgrades contain only pass. No application raw SQL, triggers,
procedures or explicit DB locks were added; earlier migrations were untouched.

Guest JWT supports null email, string UUID and seven scoped permissions;
/auth/me reads the persisted row. Existing token validation and superuser bypass
remain. Error responses/logging are sanitized, CORS exposes request ID, SQL echo
is disabled and parameters hidden. SECRET_KEY validation remains unchanged.

Verification uses an owned native PostgreSQL 17.7 cluster under /private/tmp,
127.0.0.1:55433, not any application/production server. Pytest creates its own
UUID database, applies the full migration chain, checks drift and drops only that
DB. An additional fresh `dungeon_sprint3_fresh_20260930_test` database reached
head e2dc2dbe10a5 with eight tables and exactly one supported seed; Alembic reports
“No new upgrade operations detected.” No existing database was cleared.

- `make install`: passed (network-enabled sandbox execution required for pip).
- `make check`: 84 files formatted, Ruff passed.
- `TEST_DATABASE_URL=postgresql+asyncpg://sprint3_test@127.0.0.1:55433/dungeon_sprint3_test make test`: **161 passed**, coverage **99.19%**, 90% gate retained.
- `make migrate` with the confirmed fresh local DATABASE_URL: passed.
- `.venv/bin/alembic check` on the fresh DB: no drift.
- API tests use httpx ASGITransport and the real disposable database; all seven
  permissions, ownership, enum/schema validation, rollback, retry/completion and
  completed-only progress boundaries are exercised.

A duplicate set remains retryable after completion/catalog deactivation while
new writes are still blocked. Tests explicitly reject raw vision fields at all
payload levels and ensure validation responses do not echo submitted data.
Guest identity has no refresh credential: expiry/401 recovery starts a new guest;
this demo limitation is documented without broad production-security claims.
Manual live browser/camera acceptance is not performed.

## Sprint 3 maintenance — Reference instruction adaptation (2026-09-30)

Adapted the reference controller/model/schema/endpoint/service/webhook guides to
the current backend and linked them from `backend/CLAUDE.md`. Added automated
guide/link and missing-guide checks. Current SQLAlchemy Core boundaries, atomic
model operations, guest auth, immutable sessions and deferred integrations remain
the architectural contract; no schema migrations or new providers were added.

Fixed `fields.Int` strictness and readiness's nested HTTP error/incorrect OpenAPI
status using the existing flat application error handler and a documented 503.
Readiness now returns top-level detail/database fields; its previous nested error
shape is intentionally corrected. Added schema/health/error regression coverage.

`make check` passed. Final `make test`: **176 passed, 99.10% coverage**, including
fresh migrations and Alembic drift verification on an owned temporary PostgreSQL
cluster at 127.0.0.1:55439, stopped after testing. Architecture/diff checks and
standalone Compose configuration validation passed. Docker build/container checks
remain pending because the configured Docker daemon is unavailable. Existing
Dockerfile/.dockerignore edits were preserved. Full file/command details and
limitations are in [the repository log](../../docs/development-log.md).

## Sprint 3 correction — Complete starter rules and examples (2026-09-30)

Replaced the six abbreviated folder guides with complete upstream files from
`EZDAMIR/fastapi-backend-starter` at revision
`304fc54210ccf2b59b11f88916678643e7e704f8`. All nine upstream CLAUDE.md files now
match byte for byte, including all code examples; the three shared/migration
guides already matched. Project context stays in the backend overview.

`docs/starter-instructions.json` records source hashes, checked automatically by
`tests/test_instructions.py`. Updated the overview, folder documentation and
missing-guide regression checks. No additional runtime/schema change was made.

Verification: 11 focused instruction tests; full suite **180 passed**, **99.10%
coverage**; Ruff, architecture and diff checks passed. Fresh migrations and
metadata drift passed on the owned temporary PostgreSQL server, stopped after
testing. All nine source/destination byte comparisons passed. Container checks
remain pending because the Docker daemon is unavailable.

## Sprint 3 maintenance — Refactor to copied conventions (2026-09-30)

Converted eleven bounded string columns to TEXT with named length checks and
added reviewed forward migration `d14a8a94311f`. Shared profile/set schema bases,
strict output/shared schema types, finite bounded JSON, persistence-only set dictionaries,
typed custom error documentation and public layer exports now follow the copied
guides. Single-import Ruff enforcement and source formatting preserve runtime
bootstrap and dependencies; all nine guide hashes are unchanged.

New contract tests verify multibyte storage limits and schema/OpenAPI boundaries.
The populated migration test verifies all table data, API results and retry
compatibility. Disposable databases are explicitly UTF8/template0. Verification:
77 focused checks plus 55 shared-schema/auth/permission checks, full suite
**222 passed / 99.22% coverage**, Ruff and architecture
checks passed; the 90% gate is intact. All thirteen API operations retain input
contracts and response fields. Historical migrations remain unchanged.

No existing application database was migrated; run `make migrate` against the
configured target before deployment. The owned temporary PostgreSQL server was
stopped after verification. Docker/container verification remains pending because
the daemon is unavailable. Full details: [repository log](../../docs/development-log.md).

## Sprint 3 maintenance — Development upgrade and pre-commit checks (2026-09-30)

Applied `make migrate` to the configured local development `dungeon_master`
database: `e2dc2dbe10a5` → `d14a8a94311f (head)`. All eight table row counts are
unchanged and `alembic check` reports no drift. Application lifespan/readiness,
docs/OpenAPI, request IDs and flat unauthorized errors passed against that target.

Before committing, backend check/test passed: **222 tests, 99.31% coverage**.
Frontend instruction/lint/type/coverage checks passed (116 tests), along with
both production builds and exact model/WASM delivery through matching previews.
Root architecture and diff checks passed. No hosted CI workflow exists; Docker
container checks remain unavailable while the daemon is stopped. Existing user
Docker edits stay uncommitted. Details: [repository log](../../docs/development-log.md).

## 2026-09-30 — Sprint 4A AI context, sources and declarations

Added seven owned AI/document tables, strict schemas and thin authenticated endpoints. Model-first migration `041f28173bcc` adds private exercise ownership, plan metadata and generic correction counts without rewriting historical migrations. Added official pinned OpenAI/pypdf adapters, confirmed-source top-5 RAG, structured profile/plan/spec generation, one repair/manual fallback and deterministic fallback. Source edits invalidate active AI personalization. Full regression: 239 tests pass, 96.83% coverage, populated upgrade preserved and Alembic drift clean; provider calls are mocked. Camera processing remains entirely in the browser. No Sprint 4B/provider voice/calendar integration.

## 2026-09-30 — Sprint 4B backend working release

Implemented real gpt-5.4 Responses/typed coach tools, explicit live/fixture/fallback provenance and confirmed-source cache revisions; owner-confirmed plan/schedule proposals; paginated account ElevenLabs voices/capability-checked language previews and private bounded cue/message audio; bounded transient STT; local IANA/DST schedule/ICS and encrypted owner OAuth/app-event reconciliation; rotating guest recovery; multiworker-safe leased generation jobs; immutable historical specs and real mixed/manual set persistence/progress. Metadata-first additive revisions6d9526d00d1b/ae1078bb4679 preserve historical migrations. Final disposable DB regression283passed/96.09%, unchanged90%gate, lint/format/architecture checks green. Live providers remain BLOCKED without keys, never represented as successful. Lifecycle main.py and encryption dependency pyproject changes are explicitly required by role A1. No frontend/CD/deployment/sourceenv changes or pushes. Exact contracts/report/env delta live in docs/contracts and docs/SPRINT_4B_BACKEND_REPORT.md; A2 integrates the committed handoff.


## 2026-09-30 — Corrected local provider configuration and actual live evidence

The initial canonical-name check missed existing user-authorized legacy provider variables. On the user's explicit instruction, atomically corrected only the original local backend/.env to canonical names plus live provider/model flags, preserving legacy/database/SECRET_KEY/CORS entries and mode0600. No real environment values entered this repository. Bounded real doctor with retries0: gpt-5.4 strict response VERIFIED39input/12outputtokens/3796ms; ElevenLabs models and voices returnHTTP401 invalid_api_key, preview not generated. Google/STT/full browser acceptance remain unverified. Two focused config cases cover canonical keys with legacy entries, enabled/disabled gates and masked repr;11tests pass and makecheck green. No source application code, migrations, CD or server changes in this correction. Sanitized proof and updated limitations are in backend report/contracts.


## 2026-09-30 — User-requested fresh canonical ElevenLabs retry

Current canonical ELEVENLABS_API_KEY reread into process memory only, no legacy overwrite/env edit/OpenAI repeat/sourceDB. Real /v1/models again returnsHTTP401 invalid_api_key,1597ms; no voices/language/audio success claimed. Updated sanitized proof/report only; unchanged implementation gates remain green. A valid canonical ElevenLabs key is still required.
