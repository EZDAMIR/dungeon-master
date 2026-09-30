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
