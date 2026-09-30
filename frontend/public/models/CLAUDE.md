# Verified vision models

Scope: `frontend/public/models/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Document and deliver the pinned official hand and pose models used by the local runtime.

## Code rules

- README.md records source, SHA-256, purpose and license limits for both task files.
- Change a model version only together with the preparation script, adapter compatibility checks and README.
- Do not commit generated .task/.tmp files or replace a checksum merely to accept an unexpected download.

## Dependencies

scripts/prepare-vision-assets.mjs prepares assets; vision adapters load local BASE_URL paths.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run prepare:vision` and `npm run build`; verify both model checksums and test corrupt-download rejection when preparation changes.

## Code example — pin model provenance and checksums

The preparation script uses these exact official sources and SHA-256 values. A model update must change its documented provenance and adapter checks together; unexpected bytes must fail preparation.

From [prepare-vision-assets.mjs](../../scripts/prepare-vision-assets.mjs). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```js
export const modelAssets = [
    { name: 'gesture_recognizer.task', source: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task', checksum: '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482' },
    { name: 'pose_landmarker_lite.task', source: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', checksum: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a' },
];
```
