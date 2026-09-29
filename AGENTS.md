# Repository Agent Guide

Scope: the entire repository.

## Mission

Extend the existing FastAPI scaffold into Dungeon Master, a gesture-controlled
browser fitness application. Preserve the repository's current backend
architecture and build the camera-control system on the frontend.

## Mandatory reading before edits

1. `CLAUDE.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PROJECT_STRUCTURE.md`
4. `docs/VISION_PIPELINE.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. The closest nested `AGENTS.md` and `CLAUDE.md`

For backend work, also read the existing:

- `backend/src/CLAUDE.md`
- `backend/src/api/CLAUDE.md`
- `backend/src/migrations/postgres/CLAUDE.md`

## Agent protocol

For every task:

1. Inspect the current tree, relevant files, tests, and `git status`.
2. State the exact phase and acceptance criterion being implemented.
3. Make the smallest coherent change.
4. Add or update automated tests.
5. Run focused checks, then the broader relevant suite.
6. Summarize changed files, commands run, results, and remaining risks.

Do not silently expand the task into later phases.

## Architecture constraints

- Browser owns camera access, MediaPipe inference, gesture recognition, pose
  analysis, exercise state machines, feedback timing, and local session metrics.
- Backend owns durable data, authenticated APIs, exercise catalog, plan
  generation, session persistence, calendar integration, and optional voice-asset
  generation.
- Raw camera frames do not cross the network.
- React components do not contain gesture thresholds or exercise rules.
- Backend endpoints do not contain business logic or SQL.
- Backend controllers do not open database sessions.
- Backend models do not call external providers.
- External providers do not determine safety policy.

## Protected files

Treat these as existing architecture contracts, not templates:

- `backend/src/CLAUDE.md`
- `backend/src/api/CLAUDE.md`
- `backend/src/migrations/postgres/CLAUDE.md`
- `backend/pyproject.toml`
- `backend/src/main.py`

Modify them only when a task explicitly requires it and the change preserves
their current design.

## Scaffold policy

Empty folders may use `.gitkeep`. Do not create dozens of empty Python or
TypeScript modules. Create a code file when its capability is being implemented
and tested.

## Completion report format

```text
Phase:
Acceptance criteria completed:
Files changed:
Tests/checks run:
Result:
Known limitations:
Next safe task:
```
