# Sprint 4A interpreter tests

Extends [generic guide](../CLAUDE.md). Fixtures are synthetic declarations and landmarks.
Test full cycles, invalid schemas, held conditions, interruptions and localized limits.

Example from [generic.test.ts](generic.test.ts):
```ts
expect(validateSpec({...fixture, script: 'alert(1)'}).valid).toBe(false)
```
Run `npm run test -- src/vision/exercises/generic/tests`.
