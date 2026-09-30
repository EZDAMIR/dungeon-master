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

## Code example — isolate playback failure

This method belongs to GestureAudio. Missing or suspended audio returns early, playback errors stay isolated and ended oscillators disconnect. Visual feedback remains the primary output.

From [gestureAudio.ts](gestureAudio.ts). This is an excerpt in its existing module context; imports and surrounding declarations may be omitted.

```ts
tone(frequency = 520) {
    try {
        const ctx = this.context;
        if (!ctx || ctx.state !== 'running')
            return;
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .1);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + .1);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    catch { /* Audio failure must not interrupt navigation. */ }
}
```
