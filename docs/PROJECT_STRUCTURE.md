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
Run `cd frontend && npm run check:instructions` to verify coverage and guide links.

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
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── exercises.py           [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   ├── models/
│   │   │   │   ├── users.py               [sprint 3]
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── exercises.py           [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   ├── controllers/
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   ├── v1/endpoints/
│   │   │   │   ├── profiles.py            [sprint 3]
│   │   │   │   ├── exercises.py           [sprint 3]
│   │   │   │   ├── training_plans.py      [sprint 3]
│   │   │   │   ├── workout_sessions.py    [sprint 3]
│   │   │   │   └── integrations.py        [sprint 4]
│   │   │   └── webhooks/
│   │   │       └── google_calendar.py      [sprint 4]
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
