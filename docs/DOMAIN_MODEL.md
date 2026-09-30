# Domain Model — Sprint 3

The following eight PostgreSQL tables are implemented. SQLAlchemy Core metadata
is the source of truth; controllers return primitive model data through Pydantic
response schemas. UUID primary keys and timezone-aware timestamps are used.

## Identity, profile and confirmed constraints

| Table | Persisted fields | Database invariants |
|---|---|---|
| `users` | UUID id, nullable email/display_name, is_guest, created_at, updated_at | PK; nullable unique email; display name ≤100; no password hash |
| `profiles` | user_id, goal, experience_level, days_per_week, session_minutes, equipment JSONB, locale, timezone, timestamps | user_id PK/FK users CASCADE; days 1–7; minutes 5–120 |
| `health_constraints` | UUID id, user_id, code, source, status, nullable note, created_at, confirmed_at | FK users CASCADE; bounded note; API replacement rejects duplicate codes |

Native named enums: `profiles_goal_enum` (`general_fitness`, `strength_foundation`,
`mobility`), `profiles_experience_enum` (`beginner`, `intermediate`, `advanced`),
`health_constraints_code_enum` (`no_high_impact`, `avoid_deep_knee_flexion`, `avoid_overhead`),
`health_constraints_source_enum` (`self_reported`, `document_extracted`), `health_constraints_status_enum`
(`pending_confirmation`, `confirmed`, `rejected`). Schema/metadata parity is tested.

Equipment is a controlled, nonempty, duplicate-free array of `none`, `chair`,
`resistance_band`, `dumbbells`; `none` cannot coexist with other codes. Locale is
bounded and validated; timezone must exist in `zoneinfo`. Full PUT replaces the
profile and its constraints atomically. API writes only self-reported confirmed
codes; notes/document upload are not exposed. Pending/rejected constraints do not
influence eligibility. `document_extracted` is an enum value reserved for future
compatibility, not an implemented extraction flow.

## Catalog and deterministic plans

| Table | Persisted fields | Database invariants |
|---|---|---|
| `exercises` | UUID id, key/name, difficulty, equipment_codes JSONB, impact_level, camera_angle, contraindication_tags JSONB, analysis_profile JSONB, is_active, timestamps | unique key; bounded strings; named native enums |
| `training_plans` | UUID id, user_id, status/source, starts_on, rationale, generator_version, timestamps | FK users CASCADE; partial unique index on user_id WHERE status=active |
| `training_plan_items` | UUID id, plan_id, exercise_id, day_index, position, sets, target_reps, rest_seconds, nullable tempo_hint/scheduled_at, created_at | plan FK CASCADE; exercise FK; unique plan/day/position; day 0–6, position ≥0, sets 1–10, reps 1–100, rest 0–600 |

Additional native enums: `exercises_difficulty_enum` (`beginner`, `intermediate`, `advanced`), `exercises_impact_enum` (`low`, `medium`, `high`),
`exercises_camera_angle_enum` (`side`, `front`, `none`), `training_plans_status_enum`
(`draft`, `active`, `completed`, `archived`), `training_plans_source_enum`
(`deterministic`, `ai_assisted`). Sprint 3 creates only deterministic active plans.

The migration seeds only `bodyweight_squat`: beginner, `['none']`, low impact,
side angle and `['avoid_deep_knee_flexion']`. Its strict analysis profile is
version 1, engine key `bodyweight_squat_side_v1`, engine version `squat-v1`,
target 5, supported client `web`. Unknown/invalid catalog JSON is excluded.

One controller-level pure eligibility helper requires an active, supported
exercise, available equipment and no intersection with confirmed restrictions.
Both catalog listing and plan generation reuse it. New plan items reference only
eligible IDs. Historical items/results retain their identity if the catalog later
changes. Generation archives the previous active plan and creates all new items
in one model transaction, serializing competing writes through the user's normal
UPDATE and the partial unique index, without explicit locks.

Weekly day indices:

| days_per_week | day_index values |
|---|---|
| 1 | 0 |
| 2 | 0, 3 |
| 3 | 0, 2, 4 |
| 4 | 0, 1, 3, 5 |
| 5 | 0, 1, 2, 4, 5 |
| 6 | 0, 1, 2, 3, 4, 5 |
| 7 | 0, 1, 2, 3, 4, 5, 6 |

Week starts on Monday in the profile timezone. Each training day contains squat
1 × 5, 60 seconds rest, `controlled` tempo. Version is `deterministic-v1`.
Rationale uses goal, experience, days and equipment without clinical claims.
No eligible supported exercise produces HTTP 409 `no_eligible_exercises`.

## Aggregate sessions and progress

| Table | Persisted fields | Database invariants |
|---|---|---|
| `workout_sessions` | UUID id, client_session_id, user_id, nullable plan_id, status, started_at/completed_at, client_engine_version, summary JSONB, timestamps | FK users CASCADE; owned optional plan; unique user/client_session_id |
| `workout_set_results` | UUID id, client_set_id, session_id, exercise_id, set_index, total_reps, accepted_reps, duration_ms, error_counts/metrics JSONB, timestamps | session FK CASCADE; exercise FK; unique session/set_index and session/client_set_id; index ≥1, counts 0–500, accepted ≤total, duration 0–3,600,000 ms |

Native `workout_sessions_status_enum`: `started`, `completed`, `abandoned`. Completed sessions
require completed_at through the guarded completion operation. Summary is null
while started; final summary must match persisted sets. Controllers do not
read/merge/write or manage transactions. Model operations guard ownership/status
and serialize set/completion writes with conditional parent UPDATEs.

Identical session/set/completion retries return existing data; conflicting repeats
return 409. Completed sessions reject new sets and modified completion, while
identical previously saved set retries remain possible, including deactivated
historical exercises. Only aggregate data is accepted, never arbitrary JSON.

Error keys: `depth_insufficient`, `too_fast`, `incomplete_extension`, each
nonnegative and bounded. A rep may contribute multiple errors. Metrics are finite
`mean_rep_duration_ms` in 0–3,600,000 and `mean_min_knee_angle` in 0–180.
Rejected repetitions equal total minus accepted. Extra fields at all request
levels are forbidden; no landmarks, frames, video, image or screenshot fields.

`models/progress.py` owns aggregate queries, with no separate progress table.
Only current-user completed sessions contribute. Acceptance is accepted/total,
zero when empty. Recent entries are newest first, with deterministic error ties
ordered depth, tempo, extension; no errors means null. Raw metrics are not exposed
in progress history.

## Deferred work

AI-assisted generation, OAuth/calendar links, voice assets, account registration
and health-document processing are not implemented. Enum compatibility does not
imply these capabilities exist. No providers or integration tables are added.
