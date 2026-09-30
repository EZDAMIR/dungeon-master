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
