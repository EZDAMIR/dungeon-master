# ADR 0003: Keep optional providers off the critical demo path

Status: accepted.

## Decision

OpenAI, Google Calendar, ElevenLabs and backend synchronization are optional
enrichments. The complete local workout scenario uses a seeded exercise and local
feedback when those services are unavailable.

## Reasons

- Judging requires a complete runnable scenario.
- Provider latency and credentials are common demo failure points.
- Real-time correction should not depend on the network.

## Consequences

- A deterministic fallback plan is mandatory.
- Browser speech or cached audio is mandatory.
- Failed synchronization is shown as retryable rather than blocking.
- Integration sprints begin only after the local scenario is stable.
