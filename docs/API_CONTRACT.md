# API Contract — Sprint 3

Prefix: `/api/v1`. Responses are flat JSON, without a data envelope. OpenAPI
(`/docs`) contains implemented Pydantic request/response schemas. Successful
operations below return **200**, including identical retries. UUIDs are strings
and timestamps are ISO 8601 with timezone. `X-Request-ID` is exposed through CORS
and available on the typed client; it contains no credentials or health data.

## Authentication and permissions

| Endpoint | Required permission | Behavior |
|---|---|---|
| POST `/auth/guest` | Public, NoPermsRequired | Create a new persisted guest, never accept client user ID |
| GET `/auth/me` | Valid Bearer JWT | Read persisted current user; missing user row →401 |
| GET `/profile` | `profile:read` | Own profile; missing →404 |
| PUT `/profile` | `profile:update` | Atomic full replacement/create |
| GET `/exercises` | `exercise:read` | Eligible supported catalog; missing profile →404 |
| POST `/training-plans/generate` | `plan:generate` | Archive previous active plan and atomically create new plan/items |
| GET `/training-plans/current` | `plan:read` | Own active plan; missing →404 |
| POST `/workout-sessions` | `session:write` | Idempotent start, owned optional plan |
| POST `/workout-sessions/{session_id}/sets` | `session:write` | Idempotent aggregate set |
| POST `/workout-sessions/{session_id}/complete` | `session:write` | Guarded, idempotent completion |
| GET `/progress/summary?recent_limit=5` | `progress:read` | Own completed-session aggregates and recent history |

Guest tokens contain all seven permissions, id as a UUID string, email=null and
is_superuser=false. Superuser bypass is preserved. Token validation remains in
the existing auth dependency; domain queries filter by current_user.id.
User IDs are never accepted in mutable request payloads.

POST `/auth/guest` accepts no body or `{}`. Its response:

```json
{
  "access_token": "<JWT>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "<uuid>", "email": null, "display_name": null,
    "is_guest": true, "created_at": "<aware timestamp>"
  }
}
```

`expires_in` reflects ACCESS_TOKEN_EXPIRE_MINUTES (default 60). GET `/auth/me`
returns the same user object, from the database. Invalid, missing or expired JWT
→401; missing permission →403. No password/refresh/account recovery endpoints
exist. A controlled frontend recovery from 401 creates a new guest; it does not
recover the previous guest's data.

## Profile

All eight mutable fields are required for PUT; extra fields are forbidden:

```json
{
  "goal": "general_fitness",
  "experience_level": "beginner",
  "days_per_week": 3,
  "session_minutes": 20,
  "equipment": ["none"],
  "locale": "ru-RU",
  "timezone": "Asia/Almaty",
  "confirmed_constraints": []
}
```

GET/PUT return these fields plus created_at and updated_at. Days are 1–7,
minutes 5–120, equipment codes are controlled and unique; `none` is exclusive.
Timezone must be valid through zoneinfo. Goals, experience and constraint codes
are listed in [domain model](DOMAIN_MODEL.md). Old constraints are removed in the
same transaction. Only self-reported confirmed constraints are written here.
Notes, document extraction, diagnoses and partial PATCH are not exposed.
Missing profile is 404 `{"detail":"Profile required", "status":"profile_required"}`; unknown PUT user is 401.

## Exercise catalog

GET `/exercises` returns an array of objects containing id, key, name,
difficulty, equipment_codes, impact_level, camera_angle, contraindication_tags
and strict analysis_profile. It omits internal timestamps and persistence flags.
Only `bodyweight_squat` is supported and seeded, with the following analysis:

```json
{
  "version": 1,
  "engine_key": "bodyweight_squat_side_v1",
  "engine_version": "squat-v1",
  "target_reps": 5,
  "supported_client": "web"
}
```

Eligibility requires active supported exercise, available equipment and no
intersection with confirmed constraints. Default profile permits squat;
`avoid_deep_knee_flexion` excludes it. Unsupported/malformed JSON is filtered.
A local demonstration action is separate from the personalized catalog/plan.

## Deterministic training plans

POST `/training-plans/generate` accepts no body or `{}`. It requires a profile and
uses the canonical eligibility helper. Empty eligible set returns **409**:

```json
{"detail":"No eligible supported exercises for this profile", "status":"no_eligible_exercises"}
```

A successful response and GET `/training-plans/current` contain id, status,
source, starts_on, rationale, generator_version, created_at, updated_at and items.
Each item contains id, exercise_id, nested exercise, day_index, position, sets,
target_reps, rest_seconds, tempo_hint and nullable scheduled_at.

`source=deterministic`, `generator_version=deterministic-v1`. The week starts
Monday in the profile timezone. The exact 1–7 day schedule is in the domain model;
each training day has squat 1×5, rest 60, tempo controlled. No GPT/provider call or
arbitrary plan editing is implemented. Generation archives the previous active
plan atomically; concurrent generation respects the one-active-plan index.

## Aggregate workout synchronization

The browser creates client IDs/timestamps locally and opens Results immediately.
It then synchronizes through three independently atomic model operations.

POST `/workout-sessions`:

```json
{
  "client_session_id": "<uuid>",
  "plan_id": null,
  "started_at": "2026-09-30T00:00:00Z",
  "client_engine_version": "squat-v1"
}
```

Same user/client UUID and identical start returns the existing session; conflicting
start →409. Different users may use the same client UUID. A foreign/absent plan
is 404. Response contains id, submitted fields, status, completed_at, summary,
created_at and updated_at. Started status has null completed_at/summary.

POST `/workout-sessions/{session_id}/sets`:

```json
{
  "client_set_id": "<uuid>",
  "exercise_key": "bodyweight_squat",
  "set_index": 1,
  "total_reps": 5,
  "accepted_reps": 3,
  "duration_ms": 27000,
  "error_counts": {
    "depth_insufficient": 1, "too_fast": 1, "incomplete_extension": 0
  },
  "metrics": {
    "mean_rep_duration_ms": 5400, "mean_min_knee_angle": 108.4
  },
  "engine_version": "squat-v1"
}
```

Set index 1–100, counts 0–500, accepted≤total, duration 0–3,600,000 ms, finite
bounded metrics, engine string 1–50 characters matching the session. Exercise is
resolved by stable key. Response adds id, session_id, created_at and updated_at.
Identical client_set_id retry returns saved data; conflicting UUID/index →409.
New sets require an active exercise and started owned session. Historical
identical retries still succeed after completion or catalog deactivation.
Foreign sessions →404; completed session/new set →409.

POST `/workout-sessions/{session_id}/complete`:

```json
{
  "completed_at": "2026-09-30T00:00:27Z",
  "summary": {
    "total_reps": 5, "accepted_reps": 3, "rejected_reps": 2,
    "duration_ms": 27000,
    "error_counts": {
      "depth_insufficient": 1, "too_fast": 1, "incomplete_extension": 0
    }
  }
}
```

Summary must equal persisted set totals; rejected=total−accepted. Error counts
may exceed rejected reps because a rep can have multiple errors. completed_at
must be aware and not precede started_at. Completion uses guarded started→completed
UPDATE; identical repeat returns the existing completed session. Different
completion or mismatched aggregates →409. Completed results are immutable.

All mutable nested payloads forbid extra fields. Unknown errors, NaN/Infinity,
negative values and raw landmarks/frames/video/image/screenshot are rejected
with 422. These APIs accept aggregate data only.

## Progress

`recent_limit` is bounded 1–20, default 5 (invalid →422). Response:

```json
{
  "completed_sessions": 1,
  "total_reps": 5, "accepted_reps": 3, "rejected_reps": 2,
  "acceptance_rate": 0.6,
  "error_counts": {
    "depth_insufficient": 1, "too_fast": 1, "incomplete_extension": 0
  },
  "recent_sessions": [{
    "id": "<uuid>", "exercise_key": "bodyweight_squat",
    "completed_at": "2026-09-30T00:00:27Z",
    "total_reps": 5, "accepted_reps": 3, "duration_ms": 27000,
    "dominant_error": "depth_insufficient"
  }]
}
```

Only owned completed sessions count. Empty history returns zeros, rate 0 and [].
Recent sessions are newest first; tied error counts prefer depth, tempo, extension.
No errors means dominant_error=null. Progress does not expose unnecessary raw metrics.

## Error and privacy conventions

HTTP errors return `detail`. Missing profiles return 404 with
`status="profile_required"`; no-eligible plans return 409 with
`status="no_eligible_exercises"`; conflicting session commands return 409 with
`status="session_conflict"`. OpenAPI documents these same controller-owned typed
status responses. The backend convention refactor preserves the existing request
contracts, response fields and status values.
Validation errors return `detail="Validation error"` and sanitized errors with
loc/msg/type, never submitted input. Unexpected errors return no internal exception
body. Request IDs support debugging without logging JWTs, Authorization, profile
notes or request bodies. SQL parameters are hidden and engine echo is disabled.
CORS stays configured through the environment. Health/readiness remain public.
GET `/ready` returns 503 when PostgreSQL is unreachable, with the flat body
`{"detail":"Database not reachable", "database":"unreachable"}` and a request ID;
OpenAPI documents that same status and schema. No integration/provider endpoints
are implemented in Sprint 3.
