# Target Project Structure

Legend:

- `[existing]` — already present; preserve unless explicitly changing behavior.
- `[new]` — create during architecture bootstrap.
- `[sprint N]` — create when that capability is implemented.
- `*` — nearest instruction file must be read before editing below it.

Every authored folder under `frontend/` now has a `CLAUDE.md` covering its
responsibilities, code rules, dependencies and verification. This includes
colocated tests, scripts, assets, fixtures and reserved folders. The tree below
shows capability locations rather than repeating all folder guides. Generated
dependencies, model/WASM directories and build output do not receive guides.
All 43 frontend guides include concrete code examples adapted from the
`Ya-Sabyr/1wash-front` instruction style at revision
`6e0c35d9f033a8cfb5f8c8840c34c5ae0d0e5021`. The main guide explains good/bad
patterns; nested guides link excerpts to current implementation, and reserved
folders label candidate patterns as unimplemented. Existing Dungeon Master layers,
direct imports and dependencies remain authoritative.
Run `cd frontend && npm run check:instructions` to verify coverage, nonempty code
examples and guide links. The checker does not compile documentation snippets or
establish semantic compliance with the rules.

All nine backend guides are complete copies of `EZDAMIR/fastapi-backend-starter`
at revision `304fc54210ccf2b59b11f88916678643e7e704f8`, including the concrete
examples. Read the instruction map in `backend/CLAUDE.md` and the applicable guide
before editing that layer. Services and webhooks remain reserved packages.
`backend/docs/starter-instructions.json` records source hashes; `make test` checks
all nine exact copies, the map and local links. The root architecture verifier
requires the guides. Dungeon Master context stays in the backend overview.

The root `Makefile` provides `fix`/`format`, `check`, `ci` and per-job CI targets.
`.github/workflows/ci.yml` runs backend, frontend and isolated Docker checks on
pushes and pull requests. `scripts/check_frontend_build.py` validates real HTTP
asset delivery; its regression tests cover SPA fallbacks and incorrect builds.
`scripts/check-docker.sh` owns the ephemeral stack described by
`backend/docker-compose.ci.yml` and always cleans up its own project/volume.

The shared camera view is `frontend/src/features/workout/CameraStage.tsx`: it
composes gesture state and the pose overlay. `shared/components/` keeps the
callback-driven permission/error views and progress presentation.

```text
dungeon-master/
├── README.md                              [new]
├── CLAUDE.md                              [new] *
├── AGENTS.md                              [new] *
├── AGENT.md                               [new]
├── AGENT_PROMPT.md                        [new]
│
├── docs/
│   ├── ARCHITECTURE.md                    [new]
│   ├── PROJECT_STRUCTURE.md               [new]
│   ├── DOMAIN_MODEL.md                    [new]
│   ├── API_CONTRACT.md                    [new]
│   ├── VISION_PIPELINE.md                 [new]
│   ├── IMPLEMENTATION_PLAN.md             [new]
│   ├── TEST_STRATEGY.md                   [new]
│   ├── HACKATHON_CHECKLIST.md             [new]
│   └── decisions/
│       ├── 0001-local-visual-inference.md  [new]
│       ├── 0002-preserve-backend-layering.md [new]
│       └── 0003-fallback-first-demo.md     [new]
│
├── frontend/                              [new]
│   ├── CLAUDE.md                          [new] *
│   ├── AGENTS.md                          [new] *
│   ├── AGENT.md                           [new]
│   ├── package.json                       [sprint 0]
│   ├── package-lock.json                  [sprint 0, generated]
│   ├── tsconfig.json                      [sprint 0]
│   ├── vite.config.ts                     [sprint 0]
│   ├── index.html                         [sprint 0]
│   ├── public/
│   │   ├── models/                        [model assets]
│   │   └── audio/                         [cached fallback clips]
│   ├── src/
│   │   ├── main.tsx                       [sprint 0]
│   │   ├── app/
│   │   │   ├── App.tsx                    [sprint 0]
│   │   │   ├── providers/
│   │   │   └── router/
│   │   ├── pages/
│   │   │   ├── TutorialPage.tsx           [sprint 1]
│   │   │   ├── MenuPage.tsx               [sprint 1]
│   │   │   ├── CalibrationPage.tsx        [sprint 2]
│   │   │   ├── WorkoutPage.tsx            [sprint 2]
│   │   │   └── ResultsPage.tsx            [sprint 2]
│   │   ├── features/
│   │   │   ├── onboarding/
│   │   │   ├── gesture-navigation/
│   │   │   ├── workout/
│   │   │   ├── results/
│   │   │   ├── profile/
│   │   │   └── calendar/
│   │   ├── vision/
│   │   │   ├── CLAUDE.md                  [new] *
│   │   │   ├── AGENTS.md                  [new] *
│   │   │   ├── AGENT.md                   [new]
│   │   │   ├── core/
│   │   │   │   ├── events.ts              [sprint 1]
│   │   │   │   ├── geometry.ts            [sprint 1]
│   │   │   │   ├── smoothing.ts           [sprint 1]
│   │   │   │   ├── stabilizer.ts          [sprint 1]
│   │   │   │   └── clock.ts               [sprint 1]
│   │   │   ├── gestures/
│   │   │   │   ├── handRecognizer.ts      [sprint 1]
│   │   │   │   ├── cursorMapper.ts        [sprint 1]
│   │   │   │   ├── pinchDetector.ts       [sprint 1]
│   │   │   │   └── gestureEngine.ts       [sprint 1]
│   │   │   ├── pose/
│   │   │   │   ├── poseRecognizer.ts      [sprint 2]
│   │   │   │   ├── visibility.ts          [sprint 2]
│   │   │   │   └── calibration.ts         [sprint 2]
│   │   │   ├── exercises/
│   │   │   │   └── squat/
│   │   │   │       ├── analyzer.ts         [sprint 2]
│   │   │   │       ├── stateMachine.ts     [sprint 2]
│   │   │   │       ├── rules.ts            [sprint 2]
│   │   │   │       └── types.ts            [sprint 2]
│   │   │   ├── feedback/
│   │   │   │   ├── errorPolicy.ts          [sprint 2]
│   │   │   │   └── feedbackQueue.ts        [sprint 2]
│   │   │   └── workers/
│   │   ├── audio/
│   │   ├── api/
│   │   ├── store/
│   │   ├── types/
│   │   └── shared/
│   │       ├── components/
│   │       └── lib/
│   └── tests/
│       └── fixtures/
│           ├── hand/
│           └── pose/
│
├── backend/                               [existing]
│   ├── CLAUDE.md                          [new pointer/supplement] *
│   ├── AGENTS.md                          [new] *
│   ├── AGENT.md                           [new]
│   ├── pyproject.toml                     [existing]
│   ├── Makefile                           [existing]
│   ├── Dockerfile                         [existing]
│   ├── docker-compose.yml                 [existing]
│   ├── .env.example                       [existing; extend as integrations arrive]
│   ├── docs/
│   │   └── development-log.md             [existing]
│   ├── src/
│   │   ├── CLAUDE.md                      [existing] *
│   │   ├── main.py                        [existing]
│   │   ├── core/                          [existing]
│   │   ├── ai/
│   │   │   ├── __init__.py                [existing]
│   │   │   ├── CLAUDE.md                  [new] *
│   │   │   ├── AGENT.md                   [new]
│   │   │   ├── prompts/                   [new]
│   │   │   ├── openai.py                  [sprint 4]
│   │   │   └── speech.py                  [sprint 4]
│   │   ├── api/
│   │   │   ├── CLAUDE.md                  [existing] *
│   │   │   ├── schemas/
│   │   │   │   ├── CLAUDE.md              [full upstream guide] *
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── exercises.py           [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   ├── models/
│   │   │   │   ├── CLAUDE.md              [full upstream guide] *
│   │   │   │   ├── users.py               [sprint 3]
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── exercises.py           [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   ├── controllers/
│   │   │   │   ├── CLAUDE.md              [full upstream guide] *
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   ├── v1/endpoints/
│   │   │   │   ├── CLAUDE.md              [full upstream guide] *
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── exercises.py           [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   ├── services/
│   │   │   │   ├── CLAUDE.md              [full upstream guide] *
│   │   │   │   └── __init__.py            [reserved process boundary]
│   │   │   └── webhooks/
│   │   │       ├── CLAUDE.md              [full upstream guide] *
│   │   │       └── google_calendar.py     [sprint 4]
│   │   └── migrations/postgres/
│   │       ├── CLAUDE.md                  [existing] *
│   │       └── versions/                  [created by first domain migration]
│   └── tests/                             [existing]
│       └── fixtures/                      [new]
│
└── scripts/
    └── verify_architecture.py             [new]
```

## Why backend modules remain flat

The current backend defines a fixed layer architecture with flat domain modules.
The proposed structure extends that pattern instead of introducing a second
architectural style.

## Why visual code is not in the backend

Browser-local processing provides lower latency, keeps the demo operational during
backend failure, satisfies the browser-control requirement, and avoids transferring
sensitive frames.


## Sprint 3 implemented additions

The existing flat backend layers now each contain users, profiles, exercises,
training_plans, workout_sessions and progress domain modules. HTTP modules are
`v1/endpoints/auth.py`, `profile.py`, `exercises.py`, `training_plans.py`,
`workout_sessions.py`, `progress.py`; all are registered in the existing router.
Six migrations under `backend/src/migrations/postgres/versions/` create eight
tables, seed only the supported squat and convert bounded strings to TEXT with
explicit length checks. Flat `backend/tests/` files cover each domain plus the
permission/privacy/layer boundary matrix. `test_backend_contracts.py` verifies
schema boundaries, typed error documentation and all eleven database text limits;
`test_migrations.py` verifies a populated forward upgrade and retry compatibility.

Frontend additions use existing folders rather than a new state framework:

- `src/api/`: client, types and auth/profile/exercises/plans/sessions/progress helpers.
- `src/store/`: singleton backend store, safe versioned storage/queue and React subscription.
- `src/features/profile/`: gesture preference controls and day label presentation.
- `src/features/results/`: aggregate synchronization projection.
- `src/features/workout/WorkoutFeedbackBanner.tsx`: readable held visual feedback.
- `src/pages/`: ProfilePage, PlanPage, ProgressPage and existing menu/results integration.
- `src/shared/components/BackendBadge.tsx`: unobtrusive persistence status.
- `src/app/__tests__/`: HTTP/storage and new-screen/full-App integration tests.

No repository/service/ORM layer, external provider dependency, chart library,
React Query/Redux, queue service or additional vision exercise is added.
