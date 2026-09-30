# Sprint 4B voice feature

Extends [feature instructions](../CLAUDE.md). Browser UI renders authenticated backend data and semantic state, never inference thresholds or provider secrets.

[VoiceSelection.tsx](VoiceSelection.tsx) owns accessible controls and cancellation. API calls use existing ReleaseClient/BackendStore; the sole AudioCoordinator owns playback. Retain visible fallback, errors and real status. Clean up effects on route exit; do not generate raw-frame requests.

```tsx
<VoiceSelection client={client} audio={audio} onComplete={onComplete} />
```

Run `npm run type-check`, `npm run test` and `npm run lint` from frontend. Test rendered failures, cancellation and confirmed actions with mocked transport, without paid APIs.
