# Dungeon Master

Dungeon Master is a **hackathon prototype** for a local-camera fitness coach. Sprint 4A adds a personal AI profile, source-linked plans and an interpreter for AI-created camera-coaching declarations, while preserving the gesture-controlled legacy squat flow.

## Current capabilities — Sprint 4A

- Context, confirmed document facts and existing profile/progress personalize an editorial plan.
- Text-layer PDF/TXT/Markdown extraction, PostgreSQL text/chunks/JSONB embeddings, top-5 cosine retrieval and lexical fallback.
- Official OpenAI structured output creates an AI Profile, a plan and MovementSpec declarations. AI chooses exercise variants, volume, tempo, rest, angle and short multilingual messages; a generic pose engine executes the spec locally.
- `?juryDemo=1` reveals instant **synthetic Maya / Arman / Dana fixtures**, explicitly labelled as fixtures. It adds no parallel dashboard or chatbot. Different schedules, exercise selections, volume, coaches and routines are visible on the plan.
- Shared graphite/citron Camera Coach shell, experimental generated analyzers, manual fallback after one failed repair, local SpeechSynthesis with visual fallback.
- Legacy Bodyweight Squat (`squat-v1`), gesture navigation, results sync and progress continue to work.
- Existing [Motion Studio Figma](https://www.figma.com/design/vFIK97vQDk4xasLgDUdVdN?node-id=6-635) owns the UX, warm ivory planning system, typography and tokens. [Mapping](docs/FIGMA_SPRINT_4A_MAP.md) and [visual QA](docs/FIGMA_VISUAL_QA.md) record implementation evidence and deviations.

Use only synthetic demo profiles/documents. This prototype does not diagnose, recommend medicine or change treatment; it does not claim medical accuracy, real-patient suitability or production readiness. Custom camera coaching is experimental. No OCR, microphone capture, ElevenLabs or Calendar is implemented in Sprint 4A.

## Architecture and privacy

`frontend/` owns camera access, MediaPipe, gesture recognition, pose analysis,
exercise rules and immediate results. `backend/` owns guest identity, durable
profile/catalog/plan/session data and progress queries using the existing
FastAPI → schemas → controllers → SQLAlchemy Core models architecture.

Video, images and raw landmarks remain local and are neither recorded nor sent
to the API. Only identifiers, timestamps, aggregate repetitions/error counts and compact exercise metrics are synced. Context and confirmed text sources may be sent to the configured LLM; AI does not analyze video.
There is no microphone, analytics provider or external inference service.

## Backend setup

Requirements: Python 3.12+, Docker Compose and PostgreSQL client tools
(`createdb` / `dropdb` on PATH). First create the local environment:

```bash
cd backend
python3 -m venv .venv
cp .env.example .env
```

Set a random `SECRET_KEY` of at least 32 characters in `.env`; do not commit it.
Review `DATABASE_URL`, separate local `TEST_DATABASE_URL` and `CORS_ORIGINS`.
Then use the existing commands:

```bash
make install
make up
make migrate
make test
```

`make up` starts PostgreSQL and the backend. The API runs on port 8000, with
OpenAPI at `/docs`. `make dev` is available for a host development server; stop
its Docker backend counterpart first if they would share a port.

Tests require a confirmed local `*_test` URL and CREATE DATABASE permission.
They create a separate UUID-named database, apply the complete Alembic chain,
check metadata drift and drop only that disposable database. They do not erase
or migrate the configured application database. Production configuration and
unsafe/nonlocal test URLs are rejected. See [test strategy](docs/TEST_STRATEGY.md).

## Frontend setup

Use Node.js 22.12+ and a webcam on localhost or HTTPS:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

`VITE_API_BASE_URL` defaults to `http://localhost:8000/api/v1`. The first dev/build
prepares pinned official models and installed MediaPipe WASM automatically; the
build host needs Internet access on the first preparation. Visitors receive
these assets from the deployed frontend.

Click «Включить камеру», then use pointer/pinch, Fist for Back and Thumb Up to
confirm. Profile setup needs no typing. Menu distinguishes the saved plan from
«Демонстрационный присед», which remains available when the backend is offline
or the profile has no eligible exercise.

## Persistence and offline behavior

Startup restores the stored token through `/auth/me`, creates a guest only when
missing/401, creates the default profile only on 404, and retrieves the existing
active plan before generating one. Guest tokens expire after the configured
60 minutes by default. There is no refresh/recovery credential in this sprint:
a 401 creates a new guest. Earlier history remains attached to its original
identity; pending entries belonging to that guest are never reassigned. Clearing
localStorage also starts a new identity.

Camera permission, tutorial, calibration, workout feedback and Results work
without a backend. Results appear before requests complete. Up to **20** aggregate
sessions persist under `dungeon-master.pending-sessions.v1`; retry runs at startup,
browser `online`, guest bootstrap or explicit user action, never per frame or
on a repeating timer. Identical retries use the same UUIDs and are idempotent.
Successfully synced entries are removed. If all 20 entries remain pending, the
next result stays visible but cannot be added until capacity is available.

Profile edits can remain a local draft and sync after reconnection. Progress
shows only saved data, with cached data clearly marked. If browser storage is
blocked or full, the app falls back to memory and reports that reload persistence
is unavailable. Guest JWTs are stored in localStorage; this is guest demo auth,
not a claim of production account security.

## Environment

| Variable | Location | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Frontend `.env` | API prefix; no secrets |
| `CORS_ORIGINS` | Backend `.env` | Allowed frontend origins, comma separated |
| `DATABASE_URL` | Backend `.env` | Development PostgreSQL |
| `TEST_DATABASE_URL` | Backend `.env` or process env | Separate local test configuration |
| `SECRET_KEY` | Backend `.env` | JWT signing secret, at least 32 characters |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend `.env` | Guest token lifetime, default 60 |

Never commit `.env`, JWTs, database dumps, recordings or personal health data.

## Verification

From the repository root, `make fix` formats Python in the backend and automation
scripts and applies available frontend lint fixes. `make format` is an alias;
these commands do not install a separate frontend formatter. Run `make check`
afterward for architecture, script syntax/style, Python format/lint, frontend
instruction checks, lint and type checking.

`make ci` runs all automated gates. It requires installed backend/frontend
dependencies, PostgreSQL client tools, configured local `TEST_DATABASE_URL` with
CREATE DATABASE rights, and a running Docker daemon. The individual targets are:

- `make ci-backend`: checks plus the full backend coverage suite; its fixtures
  create, migrate, check and drop only owned disposable databases.
- `make ci-frontend`: instruction checks, lint, types, coverage tests, automation
  regression tests, root/subdirectory builds and matching production previews.
  Preview checks verify actual model/WASM bytes and stop their temporary servers.
- `make ci-docker`: builds a separate stack using `backend/docker-compose.ci.yml`,
  verifies healthchecks, non-root runtime, migrations, readiness, docs and HTTP
  metadata, then verifies readiness during a database outage. It publishes no
  host ports and removes only its unique Compose project and test volume.

Run the smoke tests directly with `make smoke-tests`, or select
`make smoke-tests-frontend` / `make smoke-tests-docker`. These targets reuse the
same production-asset and container checks included in CI. GitHub Actions labels
the separate pre-deployment job **Smoke tests**, covering frontend and Docker checks.

[GitHub Actions](.github/workflows/ci.yml) runs **CI → Smoke tests → CD** on pushes
and manual dispatch; pull requests run only CI and smoke tests. CI uses Python
3.12, Node 24 and PostgreSQL 17 with pinned actions, read-only permissions and
test-only credentials. CI/smoke failures skip CD. Only the main deployment job
receives the VPS secrets and package permissions. `make ci-frontend-checks`
runs frontend checks/unit tests separately; `make ci-frontend` keeps its full
local checks-and-builds behavior.

Backend: `make check`, `make test`, `make migrate`, `.venv/bin/alembic check`.
Frontend: `npm run lint`, `npm run type-check`, `npm run test`,
`npm run test:coverage`, `npm run build` and
`npm run build -- --base=/dungeon-master/`. Preview must use the matching base:
`npm run preview -- --base=/dungeon-master/`.
Root: `python3 scripts/verify_architecture.py`.

See [frontend instructions](frontend/README.md), [API contract](docs/API_CONTRACT.md)
and [Sprint 3 manual checklist](docs/SPRINT_3_MANUAL_CHECKLIST.md).
Automated tests use synthetic motion and mocked HTTP. Live camera acceptance and
feedback readability at 2–4 metres are **not performed** in this environment.
The [Sprint 2 camera checklist](docs/SPRINT_2_MANUAL_CHECKLIST.md) remains relevant.

## Pre-existing scaffold disclosure

Complete this section truthfully before submission.

```text
The general-purpose FastAPI infrastructure under backend/ existed before the
official hackathon start. It includes application startup, configuration,
database infrastructure, authentication foundations, permissions, logging,
storage abstractions, health endpoints, Docker setup and baseline tests.

Dungeon Master-specific frontend visual recognition, exercise logic, domain models,
APIs, integrations and user experience were implemented after:
<OFFICIAL START TIME>.

Relevant first project-specific commit:
<COMMIT SHA AND TIMESTAMP>
```

Do not claim work was created during the event unless commit history supports it.
Dungeon Master provides general fitness feedback, not diagnosis, treatment,
rehabilitation or a replacement for a qualified trainer or medical professional.

## Sprint 4A demo and optional AI setup

Apply migrations with `cd backend && make migrate`. The model-first Sprint 4A revision is `041f28173bcc`, following `d14a8a94311f`. Copy the example environment locally; the AI feature defaults off. Enable a supplied key/model only when testing live generation:

```dotenv
AI_FEATURE_ENABLED=true
OPENAI_API_KEY=<local key, never commit>
OPENAI_MODEL=<structured-output compatible model>
OPENAI_EMBEDDING_MODEL=<embedding model>
```

Keep `APP_ENV=development` or explicitly set `ENABLE_DEMO_PERSONAS=true` for synthetic jury endpoints. Start backend/frontend with their existing commands and open `/?juryDemo=1`. Select a persona, continue to documents, confirm/reject facts and build the plan. Open why/details, start coaching, finish and open progress. Select another persona through context. No account or medical input is required.

Without a provider the deterministic Sprint 3 plan and stable squat analyzer remain available. Invalid generated declarations get one repair and then manual execution. Raw uploaded files are discarded after text extraction. Camera frames remain local, and no AI call runs during a workout.

[Personalization contract](docs/AI_PERSONALIZATION.md), [MovementSpec](docs/MOVEMENT_SPEC_V1.md), [manual checklist](docs/SPRINT_4A_MANUAL_CHECKLIST.md) and [verification report](docs/SPRINT_4A_REPORT.md) explain the demo and known limits. Swap is unavailable; extra routines use manual timers; one demo set is completed per session. Sprint 4B integrations are intentionally left for later.

For VPS setup and continuous delivery, agents should follow the
[Sprint 4A VPS/CD guide](docs/VPS_CD_AGENT_GUIDE.md): same-origin API, HTTPS,
SPA routes, model/WASM delivery, migrations, release artifacts and rollback.

GitHub Actions now deploys successful `main` CI releases to
[Dungeon Master](https://dungeon-master.helpmake-id.live), using the existing
`SERVER_IP` and `SERVER_KEY` secrets. [Deployment operations](deploy/README.md)
documents setup, manual reruns, failure handling and configuration.
Use `make check-deploy`, `make vps-status` and `make vps-logs` to maintain it.
