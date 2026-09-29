# ADR 0002: Preserve the existing FastAPI layer architecture

Status: accepted.

## Decision

Extend the existing schema -> controller -> model pattern and its provider adapter
boundaries. Do not introduce repositories, a unit of work, command bus, generic
application services or ORM entities.

## Reasons

- The repository already documents and tests this architecture.
- Consistency is more valuable than a mid-hackathon rewrite.
- The current structure is sufficient for the required domains.
- Existing agent instructions define precise database and migration rules.

## Consequences

- New domains use flat modules in each existing layer.
- Controllers orchestrate provider and persistence calls.
- Models own transactions.
- Optional provider calls never occur inside a transaction.
