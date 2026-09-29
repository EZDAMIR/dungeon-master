# Dungeon Master

Dungeon Master is a browser-based fitness assistant controlled through a webcam. It
uses local hand and pose recognition to navigate the interface, count
repetitions, identify selected movement errors, and provide concrete visual and
audio feedback.

> Repository name: `dungeon-master`  
> Working product name: `Dungeon Master`

## Core demo

1. Grant camera permission.
2. Complete the gesture tutorial.
3. Select a squat workout using only gestures.
4. Calibrate a side-view camera position.
5. Perform repetitions.
6. Receive specific correction for selected errors.
7. Review the workout result.

## Architecture

- `frontend/`: React, TypeScript, browser camera, MediaPipe, local visual logic.
- `backend/`: existing FastAPI scaffold; product domains/persistence are planned
  for Sprint 3.
- `docs/`: architecture, visual pipeline, API contract and implementation plan.

Raw camera frames and landmarks are processed locally; no frames are uploaded or recorded.

## Local development

### Backend

```bash
cd backend
cp .env.example .env
docker compose up -d db
make install
make migrate
make run
```

Confirm the exact available Make targets in `backend/Makefile`.

### Frontend

Sprint 2 extends gesture navigation into side-view pose calibration, countdown,
five total squat cycles, pause/resume and local results. Use Node.js 22.12+ and a webcam on localhost or HTTPS.

```bash
cd frontend
npm ci
npm run dev
```

The first dev/build command automatically prepares the official model and pinned
MediaPipe WASM; the build host needs Internet access for the initial download.
Click «Включить камеру», grant permission, then learn pointer/pinch/fist/Thumb Up
controls. Frames remain local and are not uploaded or recorded.

Checks: `npm run lint`, `npm run type-check`, `npm run test`,
`npm run test:coverage`, `npm run build`. Development fake mode is available at
`?fakeVision=1` and is hidden in production. See [frontend instructions](frontend/README.md)
for assets and troubleshooting. Real-camera acceptance is **not performed**; use
[the Sprint 2 checklist](docs/SPRINT_2_MANUAL_CHECKLIST.md).


## Sprint 2 demo behavior

Во время приседаний приложение анализирует полный цикл движения и отдельные метрики повторения. Если пользователь не достигает заданной глубины, двигается слишком быстро или не возвращается в исходное положение, приложение показывает конкретную визуальную и локальную звуковую подсказку. При потере тела из кадра или неподходящем ракурсе подсчёт приостанавливается, незавершённый цикл отменяется.

The demo finishes after five total cycles, including repetitions rejected by the three implemented rules. Results report accepted/rejected counts, per-error breakdown and mean repetition duration. The single exercise profile is `bodyweight_squat_side_v1`; there is no backend persistence, multiple-exercise support, remote vision or GPT personalization. Side-view readiness and thresholds are heuristics; real-camera tuning is pending.

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

Do not claim work was created during the event unless the commit history supports
that claim.

## Safety notice

Dungeon Master provides general fitness feedback. It does not diagnose conditions,
provide treatment, or replace a medical professional or qualified trainer.
