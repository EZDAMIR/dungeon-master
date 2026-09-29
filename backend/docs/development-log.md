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

## Phase 0 — Architecture Scaffold (2026-09-30)

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
