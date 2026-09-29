# API Contract

Prefix: `/api/v1`.

The contract follows the backend's existing flat response style. Exact response
classes must be implemented in Pydantic and registered through the existing route
conventions.

## 1. Identity

### `POST /auth/guest`

Creates or resumes an anonymous user identity and returns an access token.

Response sketch:

```json
{
  "access_token": "<token>",
  "token_type": "bearer",
  "user": {
    "id": "<uuid>",
    "is_guest": true
  }
}
```

Implementation may be deferred if the first demo uses a documented development
identity, but production deployment must not use a hardcoded shared identity.

## 2. Profile

### `GET /profile`

Returns the current user's profile and confirmed constraint codes.

### `PUT /profile`

Full replacement of mutable profile fields, matching the repository's update rule.

Request sketch:

```json
{
  "goal": "general_fitness",
  "experience_level": "beginner",
  "days_per_week": 3,
  "session_minutes": 20,
  "equipment": ["none"],
  "locale": "ru-RU",
  "timezone": "Asia/Almaty",
  "confirmed_constraints": ["no_high_impact"]
}
```

## 3. Exercise catalog

### `GET /exercises`

Returns active, user-eligible exercises. The frontend may cache the result and has
a bundled fallback entry for the demo squat.

## 4. Plans

### `POST /training-plans/generate`

Generates and persists a plan.

Controller sequence:

1. Load profile and confirmed constraints.
2. Load active exercise catalog.
3. Filter eligible exercises deterministically.
4. Request a structured proposal when AI is enabled.
5. Validate every returned exercise ID.
6. Fall back deterministically on timeout or invalid output.
7. Persist plan and items in one model-owned transaction.

Response includes `source` so the UI can distinguish `ai_assisted` from
`deterministic`.

### `GET /training-plans/current`

Returns the current active plan.

## 5. Workout sessions

### `POST /workout-sessions`

Starts a session and returns its ID.

### `POST /workout-sessions/{session_id}/sets`

Persists one completed set summary.

Request sketch:

```json
{
  "exercise_key": "bodyweight_squat",
  "set_index": 1,
  "total_reps": 10,
  "accepted_reps": 8,
  "duration_ms": 28400,
  "error_counts": {
    "insufficient_depth": 1,
    "too_fast": 1
  },
  "metrics": {
    "minimum_knee_angle_mean": 103.2,
    "mean_rep_duration_ms": 2840
  },
  "engine_version": "squat-v1"
}
```

Keep metrics bounded and schema-controlled.

### `POST /workout-sessions/{session_id}/complete`

Marks the session completed and accepts a final aggregate summary.

### `GET /progress/summary`

Returns compact totals and recent sessions.

## 6. Google Calendar

Optional phase.

### `GET /integrations/google/authorize`

Returns or redirects to the OAuth authorization URL with state protection and
minimum required scopes.

### `GET /integrations/google/callback`

Exchanges the code, stores encrypted tokens and redirects to a safe frontend
result route.

### `POST /integrations/google/calendar-events`

Creates or updates events for a plan. The operation should be idempotent through
stored external-event links.

## 7. Voice assets

Optional phase.

### `POST /voice-assets/render`

Generates or returns a cached clip for an allowlisted feedback code. Do not accept
arbitrary long text in the hackathon MVP.

### `GET /voice-assets`

Returns available clip URLs and versions.

## 8. Error behavior

- Validation errors use the existing API error conventions.
- Provider errors map to stable application error codes.
- Raw provider bodies and internal exception text are never returned.
- Optional-integration failures do not invalidate a completed local workout.
- Every response retains the existing request-ID behavior.
