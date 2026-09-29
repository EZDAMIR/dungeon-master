# Domain Model

This document describes the target data model. Implement only the tables required
by the current sprint.

## 1. MVP entities

### `users`

Purpose: stable identity for guest or future registered users.

Suggested fields:

- `id`: UUID primary key.
- `email`: nullable, unique when present.
- `display_name`: nullable.
- `is_guest`: boolean.
- `created_at`, `updated_at`.

### `profiles`

Purpose: non-clinical fitness preferences used for plan selection.

Suggested fields:

- `user_id`: primary key and foreign key to `users`.
- `goal`: general fitness, strength foundation, mobility, or another controlled
  enum.
- `experience_level`: beginner, intermediate, advanced.
- `days_per_week`.
- `session_minutes`.
- `equipment`: JSON array of controlled equipment codes.
- `locale`.
- `timezone`.
- `updated_at`.

### `health_constraints`

Purpose: user-confirmed exercise restrictions, not diagnoses.

Suggested fields:

- `id`: UUID.
- `user_id`.
- `code`: controlled restriction code.
- `source`: `self_reported` or future `document_extracted`.
- `status`: `pending_confirmation`, `confirmed`, `rejected`.
- `note`: optional short user text.
- `created_at`, `confirmed_at`.

Only `confirmed` rows may influence plan eligibility.

### `exercises`

Purpose: allowlisted exercise catalog.

Suggested fields:

- `id`: UUID.
- `key`: stable unique string such as `bodyweight_squat`.
- `name`.
- `difficulty`.
- `equipment_codes`: JSON array.
- `impact_level`.
- `camera_angle`: for example `side`.
- `contraindication_tags`: JSON array of controlled constraint codes.
- `analysis_profile`: versioned JSON configuration.
- `is_active`.
- timestamps.

The catalog is the security and safety boundary for AI plan generation.

### `training_plans`

Suggested fields:

- `id`: UUID.
- `user_id`.
- `status`: draft, active, completed, archived.
- `source`: deterministic, AI-assisted.
- `starts_on`.
- `rationale`: short non-medical explanation.
- `generator_version`.
- timestamps.

### `training_plan_items`

Suggested fields:

- `id`: UUID.
- `plan_id`.
- `exercise_id`.
- `day_index`.
- `position`.
- `sets`.
- `target_reps`.
- `rest_seconds`.
- `tempo_hint`.
- optional `scheduled_at`.

### `workout_sessions`

Suggested fields:

- `id`: UUID.
- `user_id`.
- `plan_id`: nullable.
- `status`: started, completed, abandoned.
- `started_at`, `completed_at`.
- `client_engine_version`.
- `summary`: bounded JSON object containing aggregates only.

### `workout_set_results`

Suggested fields:

- `id`: UUID.
- `session_id`.
- `exercise_id`.
- `set_index`.
- `total_reps`.
- `accepted_reps`.
- `duration_ms`.
- `error_counts`: bounded JSON map by controlled error code.
- `metrics`: bounded JSON of aggregate values.
- timestamps.

## 2. Integration entities

Implement only after the core demo.

### `oauth_connections`

- `id`, `user_id`.
- `provider`.
- encrypted access and refresh token material.
- expiration time.
- granted scopes.
- timestamps.

Use a dedicated encryption key and never return token material through the API.

### `calendar_event_links`

- `id`, `user_id`.
- `plan_item_id`.
- `provider`.
- external calendar and event identifiers.
- sync status and last error code.
- timestamps.

### `voice_assets`

- stable feedback code and locale;
- provider and voice version;
- storage path or public asset key;
- checksum and duration;
- generation timestamp.

Common real-time feedback should normally ship as cached assets.

## 3. Deferred entity

`health_documents` is intentionally deferred. The hackathon MVP should use
explicit user-confirmed constraint codes. A later document flow needs consent,
strict file limits, short retention, extraction review, deletion, auditability and
a clear statement that extracted text is not a diagnosis.

## 4. Invariants

- Plan items reference only active catalog exercises.
- AI-generated plans reference only IDs provided in the eligible set.
- A user may have at most one active plan unless the product explicitly changes.
- A completed session has `completed_at`.
- `accepted_reps <= total_reps`.
- `error_counts` keys come from a controlled set.
- Provider tokens never appear in logs or normal API responses.
- Raw images and landmark streams are not part of this model.
