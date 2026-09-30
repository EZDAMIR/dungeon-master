# Application routing

Scope: `frontend/src/app/router/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Own Sprint 4A URL/history synchronization while modes.ts guards camera and workout transitions.

## Code rules

- Use the native History API and Vite BASE_URL; keep jury/demo query parameters across navigation.
- URLs describe screens; never serialize camera handles, calibration, landmarks or counting gates into history.
- Route changes must not restart the camera permission flow or permit counting before calibration/countdown.

## Dependencies

Routing may compose pages and app setup; pages/features must not import runtime routing configuration.

## Verification

Commands run from `frontend/` unless specified otherwise.
Test direct links, browser Back/Forward, context steps, base prefixes and guarded workout recovery; run the app flow tests.

## Code example — current mode guard

This directory remains reserved; modes.ts currently owns navigation. Keep guarded transitions when introducing a router for an authorized requirement. This existing test demonstrates the invariant.

```ts
import { expect, it } from 'vitest'
import { transition } from '../modes'

it('keeps an unselected menu in MENU', () => {
  expect(transition('MENU', 'CONFIRM_SELECTION')).toBe('MENU')
})
```
