# Local audio assets

Scope: `frontend/public/audio/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Reserve a location for reusable local feedback clips; browser speech and tones currently provide audio.

## Code rules

- This folder is a placeholder; add a clip only when an authorized audio capability uses it.
- Document clip provenance and usage rights, and keep visual feedback complete when playback fails.
- Do not store microphone recordings or generate provider speech for individual frames or repetitions.

## Dependencies

Audio adapters in src/audio consume clips; assets contain no recognition or technique policy.

## Verification

Commands run from `frontend/` unless specified otherwise.
When clips are added, test playback failure in src/audio/__tests__ and run `npm run build`.

## Code example — candidate clip URL (reserved)

Illustrative URL pattern only; this clip does not exist and must not be referenced by production code until an authorized asset is added with provenance. Audio adapters own loading, playback failure and fallback; visual correction remains complete.

```ts
const completionClipUrl = new URL(
  'audio/workout-complete.ogg',
  new URL(import.meta.env.BASE_URL, window.location.origin),
).href
```
