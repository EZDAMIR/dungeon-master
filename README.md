# Dungeon Master

Dungeon Master is a browser fitness application controlled through a webcam. Local
hand and pose recognition navigate the UI, count five squat cycles and show
technique corrections. Sprint 3 adds guest identity, saved preferences,
deterministic plans and aggregate progress without putting the backend on the
workout's critical path.

## Current capabilities

- One supported exercise: **Bodyweight Squat**, side view, `squat-v1`.
- Explicit camera permission, gesture tutorial, calibration, countdown,
  workout, pause/resume and immediate results.
- Persisted guest JWT, full-replacement fitness profile and explicitly confirmed
  constraint codes. Restrictions are user preferences, not medical diagnoses.
- Allowlisted server catalog and `deterministic-v1` weekly plan: one set of five
  repetitions on each selected training day.
- Gesture-accessible Profile, Plan and Progress screens with semantic buttons.
- Background aggregate-only session synchronization and completed-session history.
- Dense, high-contrast workout banner; browser speech is additional feedback.

No AI plan generation, Calendar integration, ElevenLabs, document processing or
additional analyzed exercises are implemented.

## Architecture and privacy

`frontend/` owns camera access, MediaPipe, gesture recognition, pose analysis,
exercise rules and immediate results. `backend/` owns guest identity, durable
profile/catalog/plan/session data and progress queries using the existing
FastAPI → schemas → controllers → SQLAlchemy Core models architecture.

Video, images and raw landmarks remain local and are neither recorded nor sent
to the API. Only identifiers, timestamps, aggregate repetitions, three controlled
error counts, mean repetition duration and mean minimum knee angle are synced.
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

[GitHub Actions CI](.github/workflows/ci.yml) runs these three targets on pushes,
pull requests and manual dispatch. It uses Python 3.12, Node 24 and PostgreSQL 17,
with pinned action commits, read-only repository permission and test-only
credentials. It needs no repository secrets and does not deploy the application.

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
