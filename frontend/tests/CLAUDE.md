# Frontend fixtures and support

Scope: `frontend/tests/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own deterministic test support; runtime tests are colocated under src/**/__tests__.

## Code rules

- fixtures contains synthetic normalized hand and pose sequences, not webcam recordings.
- Keep test helpers explicit and reusable without camera, GPU, network or provider credentials.
- Fake development sources may reuse synthetic builders behind development guards; production must exclude them.
- Use the existing Vitest/jsdom and Node script-test setup rather than introducing another framework.

## Dependencies

Fixtures/support may use pure sample contracts. Test assertions may import consumers across layers; runtime modules must not import test cases.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test` and `npm run test:instructions`; fixture changes require the consuming rule/session tests.
