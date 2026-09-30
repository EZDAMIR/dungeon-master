# Sprint 4B input-settings

Extends [feature instructions](../CLAUDE.md). Own scoped UI and typed contracts.
No second camera, audio coordinator, providers or route ownership.
Use semantic events, validated preferences and monotonic clocks.

```ts
inputPreferences.set({ sensitivity: 1.5 })
```

Verify `npm run test -- src/features/input-settings` and `npm run type-check`.
