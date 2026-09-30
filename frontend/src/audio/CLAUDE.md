# Browser audio adapters

Scope: `frontend/src/audio/`. Extends [parent instructions](../CLAUDE.md).
Read ancestor guides and the repository architecture documents before edits.

## Purpose

Translate semantic gesture/workout events into local tones and browser speech.

## Code rules

- GestureAudio owns Web Audio activation, tones and cleanup; WorkoutAudio adds mute, speech phrases and cooldown handling.
- Enable audio from a user action. Missing voices, disabled audio or playback exceptions must leave navigation and visual feedback usable.
- Use event timestamps for feedback timing; consume errors produced by vision instead of deciding whether a rep is correct.
- Never request microphone permission or call a voice provider per frame or repetition.

## Dependencies

Audio may consume VisionEvent and named audio timing configuration. It must not import pages, app runtime or React.

## Verification

Commands run from `frontend/` unless specified otherwise.
Run `npm run test -- src/audio`; cover mute, cooldown, critical interruption, missing voice and failure isolation.
