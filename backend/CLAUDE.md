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

## Layer instruction map

All nine guides from [fastapi-backend-starter](https://github.com/EZDAMIR/fastapi-backend-starter)
are copied in full, including every example, at commit
`304fc54210ccf2b59b11f88916678643e7e704f8`. They are byte-for-byte identical to
the source files, with the source `src/` paths under this project's `backend/`.
The [source manifest](docs/starter-instructions.json) records the revision and
SHA-256 of each guide; automated tests prevent accidental truncation or drift.

| Layer | Guide |
|---|---|
| Shared backend rules | [source](src/CLAUDE.md) |
| Shared API architecture | [API](src/api/CLAUDE.md) |
| Request/response validation | [schemas](src/api/schemas/CLAUDE.md) |
| Tables, SQL and atomic persistence | [models](src/api/models/CLAUDE.md) |
| Business policy and orchestration | [controllers](src/api/controllers/CLAUDE.md) |
| HTTP wiring and permissions | [endpoints](src/api/v1/endpoints/CLAUDE.md) |
| Reserved process lifecycle | [services](src/api/services/CLAUDE.md) |
| Reserved external protocols | [webhooks](src/api/webhooks/CLAUDE.md) |
| PostgreSQL migrations | [migrations](src/migrations/postgres/CLAUDE.md) |

Read the applicable guide before edits. The Dungeon Master context below extends
the complete source guides. Example entity names, permissions, upload helpers,
cursor metadata and worker/scheduler classes illustrate patterns; implement them
only when an actual capability needs them. `make test` checks the instruction map,
local links and exact source-file hashes.

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

Implemented Sprint 3 domains:

- `users`
- `profiles`
- `exercises`
- `training_plans`
- `workout_sessions`
- `progress`

`integrations` and `voice_assets` are deferred to Sprint 4. The existing `ai/`,
`webhooks/` and `services/` packages are reserved boundaries, not implemented
provider integrations or worker frameworks. Do not add unused CRUD modules.

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
