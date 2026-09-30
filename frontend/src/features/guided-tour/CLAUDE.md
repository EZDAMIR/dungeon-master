# Sprint 4B guided-tour feature

Extends [feature instructions](../CLAUDE.md). Browser UI renders authenticated backend data and semantic state, never inference thresholds or provider secrets.

[GuidedTour.tsx](GuidedTour.tsx) owns accessible controls and cancellation. API calls use existing ReleaseClient/BackendStore; the sole AudioCoordinator owns playback. Retain visible fallback, errors and real status. Clean up effects on route exit; do not generate raw-frame requests.

```tsx
<GuidedTour audio={audio} screen="PROFILE" enabled />
```

Run `npm run type-check`, `npm run test` and `npm run lint` from frontend. Test rendered failures, cancellation and confirmed actions with mocked transport, without paid APIs.
