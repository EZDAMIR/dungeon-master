# Backend Agent Guide

Scope: `backend/`.

Read `CLAUDE.md`, `src/CLAUDE.md`, and the closest nested instructions before
editing.

## Preserve the existing design

- SQLAlchemy Core, not ORM.
- Async request paths.
- Models own SQL and transaction scopes.
- Controllers own business orchestration.
- Endpoints remain thin.
- Provider adapters own external HTTP details.
- Flat JSON responses remain flat.
- Updates follow the repository's full-update rule.
- Generated migrations have hand-reviewed upgrade logic and `downgrade(): pass`.

## Implementation order for a domain

1. Schema.
2. SQLAlchemy table and model functions.
3. Migration generated from metadata.
4. Controller.
5. Endpoint and router registration.
6. Tests for every layer.
7. Documentation and development log.

## Backend-specific prohibitions

- Do not receive webcam frames.
- Do not run MediaPipe on the server.
- Do not place AI calls inside database transactions.
- Do not let AI invent exercise identifiers.
- Do not store OAuth tokens in plaintext.
- Do not log health text, tokens, secrets, or uploaded document contents.
- Do not make the successful workout demo depend on an external provider.

## Before completion

Run the existing Make targets for formatting, linting and tests. Inspect
`backend/Makefile` rather than guessing target names.
