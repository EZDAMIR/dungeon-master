# AI Adapter Instructions

Scope: `backend/src/ai/`.

This package contains narrow external AI and speech-provider adapters. It does not
contain business policy, database access, FastAPI routes, or exercise-safety rules.

## Allowed capabilities

- Generate a structured training-plan proposal from an already filtered list of
  exercise IDs.
- Generate a personalized session-summary sentence.
- Render or request a cacheable voice clip.
- Validate and normalize provider responses into primitive dictionaries.

## Required design

- Use the shared async HTTP client or the approved provider SDK.
- Configure keys, model identifiers, timeouts and base URLs through settings.
- Expose one focused async function per capability.
- Return primitive data or a small provider-neutral typed object.
- Raise typed adapter exceptions without leaking raw provider payloads.
- Never retry indefinitely.
- Never log prompts containing user health text.
- Keep all prompts versioned under `prompts/`.
- Include a prompt or engine version in persisted output metadata.
- Mock network calls in tests.

## Plan-generation contract

Input must contain:

- user goal and experience level;
- available equipment;
- available schedule;
- confirmed constraint codes;
- eligible exercise IDs and metadata;
- strict output schema.

Output may reference only eligible exercise IDs. The controller must reject an
unknown or ineligible ID and fall back to the deterministic plan generator.

Structured output guarantees shape, not safety. Safety filtering remains
deterministic and outside the provider adapter.

## Voice contract

Real-time technique feedback must use browser speech or cached clips. Do not call a
remote voice API for every frame, gesture, or repetition. Remote speech generation
is reserved for reusable clips or non-critical summaries.
