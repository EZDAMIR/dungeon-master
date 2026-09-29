# Backend Repository Instructions

This file applies to `backend/` and supplements the existing, more specific
instructions under `backend/src/`.

Before backend changes, read:

- `src/CLAUDE.md`
- `src/api/CLAUDE.md`
- `src/migrations/postgres/CLAUDE.md` for schema changes
- `../docs/DOMAIN_MODEL.md`
- `../docs/API_CONTRACT.md`

The existing backend stack and layer rules are fixed. Do not replace them with a
different architecture.

## Dungeon Master backend responsibilities

The backend may own:

- Guest or registered user identity.
- User profile and user-confirmed fitness constraints.
- Exercise catalog and server-side allowlists.
- Training plans and plan items.
- Workout session summaries and progress.
- AI plan generation using only eligible exercise identifiers.
- Google Calendar OAuth and event synchronization.
- Optional generation and caching of voice assets.
- Explicit consent records where implemented.

The backend must not own:

- Live webcam capture.
- Per-frame gesture or pose inference.
- Real-time repetition counting.
- Real-time technique correction.
- Uploading raw frames or continuous landmarks.
- UI gesture state.

## Domain module convention

Add one flat module per domain to each existing layer:

```text
src/api/schemas/<domain>.py
src/api/models/<domain>.py
src/api/controllers/<domain>.py
src/api/v1/endpoints/<domain>.py
tests/test_<domain>.py
```

Planned domains:

- `users`
- `profiles`
- `exercises`
- `training_plans`
- `workout_sessions`
- `progress`
- `integrations`
- `voice_assets` only when needed

Do not create a parallel `repositories/`, `use_cases/`, or generic `services/`
hierarchy.

## Provider boundaries

- OpenAI-compatible plan generation belongs under `src/ai/`.
- ElevenLabs or other speech-generation adapters belong under `src/ai/`.
- Google Calendar protocol and HTTP mapping belongs in the existing external
  adapter boundary, following `src/api/CLAUDE.md`.
- Controllers call adapters and models in an order that never keeps a database
  transaction open during network I/O.
- Provider failures return a typed outcome; the controller selects a deterministic
  fallback.

## MVP data policy

Persist compact summaries only:

- timestamps;
- exercise identifier;
- total and accepted repetitions;
- error counts;
- aggregate angles, tempo or visibility metrics;
- local engine version.

Do not persist video, still images, or raw landmark streams in the MVP.

## Tests

Keep the existing 90% coverage gate. For each new domain, test:

- Pydantic validation;
- model statements and constraints;
- controller outcome mapping;
- endpoint status and authorization;
- provider timeout and fallback behavior where applicable.
