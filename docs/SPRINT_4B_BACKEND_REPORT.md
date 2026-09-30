# Sprint 4B backend completion

Sprint: 4B working release, role A1. Base commit: `9c0ef5fd26be2b1e608e7cdde2027a66659da4a8`. Branch: `work/4b-backend`. Final committed SHA is published after the commit in `_handoff/A1/FINAL.json`; A2 integrates that exact SHA locally. This report describes backend acceptance, not browser/camera/live-provider acceptance.

## Acceptance criteria completed

- Official async OpenAI 3.22.1 Responses adapter uses gpt-5.4 by default for profile, plan, declarations and coach. Structured outputs and typed tools, store=false, reasoning/output/deadline/retry/concurrency budgets, reusable client shutdown and sanitized error categories are implemented. Transcription/embeddings use separate configurable models.
- Maya/Arman/Dana are input fixtures. Live input invokes the actual provider adapter; fixture output needs explicit authorization, fallback and cached results retain honest provenance. Profile cache depends on context/profile/confirmed-source revision. Confirmed RAG excerpts enter model input; source IDs are ownership checked. Pending/rejected/deleted sources never supply trusted instructions. Model output cannot execute code or change safety rules.
- Durable owner/operation-bound generation jobs expose actual stages and spec counts. Conditional database claims and UUID leases work across existing workers. Cancelled jobs cannot activate a plan; expired claims become interrupted and require explicit retry. No provider I/O holds a database transaction.
- Coach messages persist separate display/speech text, provenance, references and allowlisted navigation actions. The bounded tool loop reads real profile/plan/exercise/progress/schedule data. Plan volume, exercise replacement and schedule changes require owner-bound expiring hashed proposals and confirmation; revisions are rechecked atomically. Visible plan metadata matches confirmed durable edits. Source changes expire pending proposals.
- ElevenLabs account voices use real paginated IDs and optional allowlisting. Model languages are checked against account capabilities; KK never assumes Flash support. Short previews, saved-message/cue TTS and current-exercise prewarm validate HTTP status, audio MIME, signature, size and nonempty content. Provider JSON cannot become successful audio. Private owner-scoped memory cache includes voice/model/language/style/text/version, has TTL/bytes limits and bounded concurrency. Daily user/peer budgets persist in Postgres. No public arbitrary-text TTS proxy or token-bearing audio URLs exist.
- Voice preferences persist voice_id/language/style/audio_enabled independently from device hand sensitivity. Authenticated multipart STT allows supported audio types, caps upload at 4 MiB and declared recording duration at 30 seconds, closes transient UploadFile in every path and never sends audio to gpt-5.4. Browser recording duration enforcement belongs to A2; the backend does not decode codecs to independently measure clip duration.
- Local availability, IANA timezone, deterministic seven-day slots, owner-bound appointments, revision conflicts, exact date/time proposals, future/conflict checks, DST ambiguity/gap rejection and RFC 5545 ICS export work without Google. Appointment status schema supports planned/completed/skipped/cancelled; mutation actions create/move/cancel/skip/complete; completion requires a started owned appointment and confirmation.
- Real optional Google OAuth uses hashed one-time owner state, ten-minute TTL/replay checks, exact configured redirect and minimal freebusy/events scopes. Access/refresh tokens are Fernet encrypted at rest. Expired tokens refresh; revoked refresh persists reconnect status. App-created event IDs/mapping/ETags constrain writes, deterministic insert lookup reconciles retries, freebusy is rechecked before external sync, stale local mutations remain pending/error. Calendar sync performs no writes without owner authentication and configured connection.
- Guest access-token expiry preserves ownership via opaque hashed rotating HttpOnly cookie, origin CSRF checks, revocation, seven-day recovery expiry and parallel-refresh grace. Legacy guests bootstrap while their access token is valid. Failed recovery returns a recovery_required error rather than creating or migrating an owner.
- Every workout set retains stable client UUID/global index, actual engine version, exercise/spec revision, frozen target and completion/assessment mode. Historical declarations remain readable for owner audio/session references. Mixed sessions use parent engine workout-session-v1; legacy validation remains. Missing camera metrics stay null and manual completion has zero accepted/rejected camera reps. Session summaries are checked against all sets; progress uses the actual camera denominator and all durable set rows.
- OAuth callback query strings are stripped from application server access logs. SQL parameter dumps stay disabled even with application DEBUG, so private document/audio/credential contents do not enter routine logs.

## Files and contracts

Implementation follows the existing flat schemas → endpoints → controllers → models architecture. New coach/speech/schedule/calendar/job/guest domains, official provider adapters and focused regression modules are under `backend/`. Lifecycle additions in protected `backend/src/main.py` are required to run/stop durable job consumers and the reusable provider client. The protected `backend/pyproject.toml` adds only pinned cryptography for encrypted OAuth tokens; architectural guides are unchanged.

Exact exported API: [release-api.openapi.json](contracts/release-api.openapi.json), SHA256 `d3e9f8e287220aaa5d18bdab5b1f48f78bd3a6c23ab3cba3621f62ff25d24f8e`, 47 paths. See [contract/examples](contracts/release-api-contract.md), [prepared cue translations](contracts/release-cues.json), [environment delta](SPRINT_4B_ENV_DELTA.md), and `backend/.env.example`. Handoff contains byte-identical OpenAPI/cues and the contract changelog; explicit nulls and required fields come from the exported application schema.

Additive metadata-first migration chain:

`041f28173bcc` → `6d9526d00d1b` → `ae1078bb4679` (head).

The first adds release domains, profile provenance and nullable/manual workout alternatives, while archiving existing declarations. The second backfills actual per-set engine identity from legacy parents, then enforces non-null engine identity. Historical migrations were not edited. Fresh chain and populated upgrade preserve existing data and pass Alembic drift checks. No production/shared database was accessed.

## Verification

On the owned disposable PostgreSQL 17 instance at 127.0.0.1:55431, user dm_a1, databases dm_a1_dev/dm_a1_test:

```sh
make -C backend check
SECRET_KEY=local-test-secret-key-32chars-for-qa \
DATABASE_URL=postgresql+asyncpg://dm_a1@127.0.0.1:55431/dm_a1_dev \
TEST_DATABASE_URL=postgresql+asyncpg://dm_a1@127.0.0.1:55431/dm_a1_test \
make -C backend test
backend/.venv/bin/python scripts/verify_architecture.py
backend/.venv/bin/ruff check scripts/provider_doctor.py scripts/smoke_live_coach.py
backend/.venv/bin/python scripts/provider_doctor.py
backend/.venv/bin/python scripts/smoke_live_coach.py
git diff --check
```

Final full regression: **283 passed, 96.09% coverage**; unchanged 90% coverage gate passes. Ruff lint/format, architecture presence and diff checks pass. The suite covers real disposable database claims/leases/cancellation and migrations, owner/operation/revision/recovery races, schedule/DST/ICS, archived specs/multi-set/manual progress, strict SDK/provider error fixtures, honest live/fixture/fallback/RAG, account language/audio/cache boundaries, OAuth state/token encryption/refresh/revocation and app-event reconciliation. It does not claim a real provider or hardware check.

`provider_doctor.py` uses environment variables only and no network by default. Explicit `--live` makes one short structured GPT probe and one account-voice preview, with sanitized model/status/latency/token/character counts. `smoke_live_coach.py --live` accepts a disposable localhost backend only, caps application requests at 30 by default, validates live profile/context-change plan/spec/coach schedule proposal/confirmation and saved-voice audio. It never touches Google Calendar. Browser runtime and camera evidence remain A2/A3 acceptance.

The initial canonical-name scan incorrectly classified existing legacy-name provider keys as absent. Following the user's correction and explicit local environment authorization, the original backend/.env was atomically updated (mode0600) with canonical OPENAI_API_KEY/ELEVENLABS_API_KEY from its existing API_TOKEN/ELEVENLABS_TOKEN, enabled provider flags and live gpt-5.4/text-embedding-3-small defaults. Legacy entries, database, SECRET_KEY, CORS and other configuration were preserved. No environment file was copied into this clone or committed.

A bounded real provider_doctor run used only selected provider keys in process memory, no source database/secret, and zero SDK retries. **OpenAI gpt-5.4 VERIFIED**: one strict structured response, 39 input tokens, 12 output tokens, 3796ms. **ElevenLabs LIVE BLOCKED / invalid_api_key**: model metadata HTTP401; a separate bounded diagnostic confirmed detail.status=invalid_api_key on both /v1/models and /v2/voices. No preview was generated or claimed. A valid replacement ElevenLabs key is required; environment/model changes cannot repair provider-rejected credentials. STT, full live profile/plan/browser acceptance and real Google OAuth remain unverified. Presence/configured status is never treated as verification; application capabilities.last_check remains null. Sanitized evidence is in docs/contracts/provider-live-verification.json.

Focused configuration regression after the local fix: 11 passed, no database connection, including canonical credential precedence, feature gates and SecretStr masking. make check remains green. The earlier full database suite is283passed/96.09%; no application behavior changed in this follow-up.

## Safe local integration setup

Use A2's own disposable instance on port 55432, never A1's busy test database or an unknown DATABASE_URL. With PostgreSQL 17 binaries on PATH and an unused port:

```sh
initdb -D /private/tmp/dm-a2-postgres -A trust -U dm_a2 --encoding=UTF8
pg_ctl -D /private/tmp/dm-a2-postgres -l /private/tmp/dm-a2-postgres.log \
  -o '-p 55432 -h 127.0.0.1 -k /private/tmp' start
createdb -h 127.0.0.1 -p 55432 -U dm_a2 dm_a2_dev
createdb -h 127.0.0.1 -p 55432 -U dm_a2 dm_a2_test
```

A2 already owns that instance; do not reinitialize an existing directory. Install isolated backend dependencies from pyproject, export the local dev/test URLs and local SECRET_KEY, run make migrate/check/test. Tests create and drop their own uniquely named databases on that disposable server. Start the backend when port 8001 is free:

```sh
DATABASE_URL=postgresql+asyncpg://dm_a2@127.0.0.1:55432/dm_a2_dev \
SECRET_KEY=local-test-secret-key-32chars-for-qa \
CORS_ORIGINS=http://localhost:5173 \
APP_PUBLIC_URL=http://localhost:5173 \
backend/.venv/bin/python -m uvicorn src.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

Backend address is `http://127.0.0.1:8001` when started; A1 did not start a competing server. Stop only the cluster you created, with `pg_ctl -D <your-pgdata> stop -m fast`; do not stop unknown processes. A1 owns port55431 and its pgdata/cleanup, A2 owns port55432. No workflows, server, SSH, deployment, Dockerfiles or compose files changed; no push/main merge occurred in A1. The only original-project file edited was backend/.env, subsequently and explicitly authorized by the user.

## Known limitations and next safe task

One real gpt-5.4 structured response verifies the corrected OpenAI configuration; full live personalization/browser acceptance is still separate. ElevenLabs voices/languages/audio remain blocked by invalid_api_key, and real Google OAuth needs credentials/consent. Cache is deliberately per-process, so restart/worker changes cause safe cache misses. Google/freebusy and local DB cannot form one cross-provider transaction; concurrent external calendar changes require the sync error/retry path. ICS is a reserve export, not a Google connection. Same-browser refresh cannot recover cleared cookies/storage or expired recovery credentials. STT input length uses bounded bytes plus the browser's declared 30-second recording limit, not server codec decoding. A2 must finish frontend integration and browser acceptance; the scripts cannot assert MovementSpec runtime rendering/camera quality.

Next safe task: A2 locally merge this committed backend SHA, then A3 SHA, run the isolated integrated regression/build/mobile-tablet checks, and publish its integration report. Real live acceptance may follow once keys and a consented test calendar are supplied; CD changes are outside this task.


## Fresh ElevenLabs retry after the user's “try it now”

Read the current canonical ELEVENLABS_API_KEY directly into process memory, without reading/reapplying ELEVENLABS_TOKEN or editing the environment. Bounded real metadata retry returned HTTP401 detail.status=invalid_api_key again (1597ms). Voice retrieval, language capability acceptance and audio preview were not attempted after that authentication failure. No OpenAI call or database connection was repeated. The code/tests remain unchanged; actual audio acceptance still needs a provider-valid canonical key.
