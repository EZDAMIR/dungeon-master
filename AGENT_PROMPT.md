# Coding Agent Task: Sprint 0 Architecture Bootstrap

You are working in the repository `EZDAMIR/dungeon-master`.

## Objective

Prepare the project structure and runnable application shells for Dungeon Master
without implementing real visual recognition, exercise analysis, database domains,
AI generation, Google Calendar, or ElevenLabs yet.

## Mandatory reading

Read these files in order before editing:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/PROJECT_STRUCTURE.md`
5. `docs/VISION_PIPELINE.md`
6. `docs/IMPLEMENTATION_PLAN.md`
7. `backend/CLAUDE.md`
8. `backend/AGENTS.md`
9. `backend/src/CLAUDE.md`
10. `backend/src/api/CLAUDE.md`
11. `frontend/CLAUDE.md`
12. `frontend/AGENTS.md`
13. `frontend/src/vision/CLAUDE.md`

Inspect `git status` and the current tree. Do not assume files are absent.

## Protected existing files

Do not overwrite or replace:

- `backend/src/CLAUDE.md`
- `backend/src/api/CLAUDE.md`
- `backend/src/migrations/postgres/CLAUDE.md`
- `backend/pyproject.toml`
- `backend/src/main.py`

Do not reorganize existing backend code.

## Tasks

### 1. Verify architecture overlay

- Confirm all required documentation and instruction files exist.
- Create only missing directories from `docs/PROJECT_STRUCTURE.md`.
- Remove no existing file.
- Keep `.gitkeep` only in otherwise empty directories.

### 2. Initialize the frontend

Create a React + TypeScript + Vite application inside `frontend/`.

Requirements:

- strict TypeScript;
- lint command;
- type-check command;
- unit-test command;
- production-build command;
- no secret values;
- no unnecessary UI framework;
- no camera or MediaPipe implementation yet.

Preserve `frontend/CLAUDE.md`, `frontend/AGENTS.md`, and
`frontend/src/vision/CLAUDE.md`.

### 3. Build the fake-event application shell

Implement only enough code to demonstrate application states with a fake event
source:

```text
TUTORIAL -> MENU -> CALIBRATION -> COUNTDOWN -> WORKOUT -> RESULTS
```

Requirements:

- one top-level discriminated union for application mode;
- one provider-neutral `VisionEvent` discriminated union;
- fake buttons or development controls may emit events;
- route/page composition follows the documented structure;
- workout page can receive fake repetition and error events;
- result page displays fake totals;
- no landmark math in React components;
- no network dependency.

The fake source is intentionally temporary and must be replaceable by the real
vision runtime without rewriting pages.

### 4. Add tests

Add tests for:

- allowed application-mode transitions;
- fake event to application action mapping;
- one complete fake-event flow ending at results.

### 5. Keep the backend unchanged

Run the existing backend checks. Fix only regressions caused by Sprint 0. Do not
create backend domain tables or endpoints in this sprint.

### 6. Update documentation

- Update root README launch instructions with commands that actually work.
- Fill only verified facts.
- Keep the pre-existing scaffold disclosure template and mark unknown commit/time
  values as TODO rather than inventing them.
- Add a dated Sprint 0 entry to the development log.

## Verification

Run and report:

- frontend install;
- frontend lint;
- frontend type check;
- frontend unit tests;
- frontend production build;
- existing backend formatting/lint/test commands from `backend/Makefile`;
- `python scripts/verify_architecture.py`.

## Constraints

- No OpenAI, Calendar or ElevenLabs integration.
- No database-domain implementation.
- No MediaPipe model download.
- No remote vision.
- No raw camera data handling.
- No architecture rewrite.
- No claims that unimplemented features work.

## Completion response

Use this exact format:

```text
Sprint: 0 — Architecture and runnable shells

Acceptance criteria completed:
- ...

Files created:
- ...

Files modified:
- ...

Commands run:
- ...

Results:
- ...

Existing files intentionally preserved:
- ...

Known limitations:
- Real visual recognition is Sprint 1.
- Pose workout analysis is Sprint 2.
- Backend domains are Sprint 3.
- External integrations are Sprint 4.

Next safe task:
- Sprint 1 gesture navigation.
```
