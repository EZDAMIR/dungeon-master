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

## Code example — provider-neutral hand builder

Create normalized synthetic landmarks and explicit timing instead of requiring a camera. Ratio and category parameters make trigger, jitter and loss tests reproducible.

From [gestures.test.ts](../src/vision/gestures/__tests__/gestures.test.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
export function sample(at: number, ratio = .6, name = 'Open_Palm', confidence = .9): HandRecognitionSample {
    const landmarks = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }));
    landmarks[5] = { x: .4, y: .5, z: 0 };
    landmarks[17] = { x: .6, y: .5, z: 0 };
    landmarks[4] = { x: .5 + ratio * .2, y: .5, z: 0 };
    return { at, landmarks, gesture: { name, confidence }, handedness: 'Right' };
}
```
