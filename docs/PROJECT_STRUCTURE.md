# Target Project Structure

Legend:

- `[existing]` — already present; preserve unless explicitly changing behavior.
- `[new]` — create during architecture bootstrap.
- `[phase N]` — create when that capability is implemented.
- `*` — nearest instruction file must be read before editing below it.

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
│   ├── package.json                       [phase 0]
│   ├── package-lock.json                  [phase 0, generated]
│   ├── tsconfig.json                      [phase 0]
│   ├── vite.config.ts                     [phase 0]
│   ├── index.html                         [phase 0]
│   ├── public/
│   │   ├── models/                        [model assets]
│   │   └── audio/                         [cached fallback clips]
│   ├── src/
│   │   ├── main.tsx                       [phase 0]
│   │   ├── app/
│   │   │   ├── App.tsx                    [phase 0]
│   │   │   ├── providers/
│   │   │   └── router/
│   │   ├── pages/
│   │   │   ├── TutorialPage.tsx           [phase 1]
│   │   │   ├── MenuPage.tsx               [phase 1]
│   │   │   ├── CalibrationPage.tsx        [phase 2]
│   │   │   ├── WorkoutPage.tsx            [phase 2]
│   │   │   └── ResultsPage.tsx            [phase 2]
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
│   │   │   │   ├── events.ts              [phase 1]
│   │   │   │   ├── geometry.ts            [phase 1]
│   │   │   │   ├── smoothing.ts           [phase 1]
│   │   │   │   ├── stabilizer.ts          [phase 1]
│   │   │   │   └── clock.ts               [phase 1]
│   │   │   ├── gestures/
│   │   │   │   ├── handRecognizer.ts      [phase 1]
│   │   │   │   ├── cursorMapper.ts        [phase 1]
│   │   │   │   ├── pinchDetector.ts       [phase 1]
│   │   │   │   └── gestureEngine.ts       [phase 1]
│   │   │   ├── pose/
│   │   │   │   ├── poseRecognizer.ts      [phase 2]
│   │   │   │   ├── visibility.ts          [phase 2]
│   │   │   │   └── calibration.ts         [phase 2]
│   │   │   ├── exercises/
│   │   │   │   └── squat/
│   │   │   │       ├── analyzer.ts         [phase 2]
│   │   │   │       ├── stateMachine.ts     [phase 2]
│   │   │   │       ├── rules.ts            [phase 2]
│   │   │   │       └── types.ts            [phase 2]
│   │   │   ├── feedback/
│   │   │   │   ├── errorPolicy.ts          [phase 2]
│   │   │   │   └── feedbackQueue.ts        [phase 2]
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
│   │   │   ├── openai.py                  [phase 4]
│   │   │   └── speech.py                  [phase 4]
│   │   ├── api/
│   │   │   ├── CLAUDE.md                  [existing] *
│   │   │   ├── schemas/
│   │   │   │   ├── profiles.py            [phase 3]
│   │   │   │   ├── exercises.py           [phase 3]
│   │   │   │   ├── training_plans.py      [phase 3]
│   │   │   │   ├── workout_sessions.py    [phase 3]
│   │   │   │   └── integrations.py        [phase 4]
│   │   │   ├── models/
│   │   │   │   ├── users.py               [phase 3]
│   │   │   │   ├── profiles.py            [phase 3]
│   │   │   │   ├── exercises.py           [phase 3]
│   │   │   │   ├── training_plans.py      [phase 3]
│   │   │   │   ├── workout_sessions.py    [phase 3]
│   │   │   │   └── integrations.py        [phase 4]
│   │   │   ├── controllers/
│   │   │   │   ├── profiles.py            [phase 3]
│   │   │   │   ├── training_plans.py      [phase 3]
│   │   │   │   ├── workout_sessions.py    [phase 3]
│   │   │   │   └── integrations.py        [phase 4]
│   │   │   ├── v1/endpoints/
│   │   │   │   ├── profiles.py            [phase 3]
│   │   │   │   ├── exercises.py           [phase 3]
│   │   │   │   ├── training_plans.py      [phase 3]
│   │   │   │   ├── workout_sessions.py    [phase 3]
│   │   │   │   └── integrations.py        [phase 4]
│   │   │   └── webhooks/
│   │   │       └── google_calendar.py      [phase 4]
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
