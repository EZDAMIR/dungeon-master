import { afterEach, expect, it, vi } from 'vitest';
import { AudioCoordinator } from '../audioCoordinator';
import { cueTexts } from '../cues';
import calfSpec from '../../vision/exercises/generic/tests/calfSpec.json';
import { localized, type Messages, type MovementSpec } from '../../vision/exercises/generic/types';
import type { VisionEvent } from '../../types/vision';
const spec = calfSpec as MovementSpec;
function genericCue(text: string, tracking = true): VisionEvent {
  return { type: 'workout.generic_updated', at: 1000, language: 'en', view: { stage: 'standing', label: 'Starting position', primary: text, secondary: '', tracking, reps: 0, target: 5, side: 'left', correction: false } };
}
const blob = () => new Blob(['audio'], { type: 'audio/mpeg' });
function setup() {
  const player = { src: '', play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), onended: null as (() => void) | null, onerror: null as (() => void) | null };
  vi.stubGlobal('AudioContext', class { resume = vi.fn(); close = vi.fn().mockResolvedValue(undefined); });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:private') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const audio = new AudioCoordinator(() => player); audio.setMuted(false); audio.unlock(); return { audio, player };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('plays one private blob and deduplicates repeated semantic cues', async () => {
  const { audio, player } = setup(), load = vi.fn().mockResolvedValue(blob());
  audio.configure(load); audio.enqueue({ id: 'cue', text: 'Cue', priority: 'guide', load }); audio.enqueue({ id: 'cue', text: 'Cue', priority: 'guide', load }); await vi.waitFor(() => expect(player.play).toHaveBeenCalledOnce());
  expect(player.src).toBe('blob:private'); expect(audio.getSnapshot()).toMatchObject({ subtitle: 'Cue', status: 'playing', provider: 'elevenlabs' }); audio.stop(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private'); expect(player.pause).toHaveBeenCalled();
});
it('preempts chat with recovery and ignores late cancelled response', async () => {
  const { audio, player } = setup(); let resolve!: (blob: Blob) => void;
  audio.enqueue({ id: 'chat', text: 'Old', priority: 'chat', load: () => new Promise(done => { resolve = done; }) });
  audio.enqueue({ id: 'recover', text: 'Recovery', priority: 'recovery', load: async () => blob() });
  await vi.waitFor(() => expect(audio.getSnapshot().subtitle).toBe('Recovery')); resolve(blob()); await Promise.resolve(); expect(player.play).toHaveBeenCalledOnce(); audio.close();
});
it('route exit aborts fetch and never starts stale speech', async () => {
  const { audio, player } = setup(); let signal!: AbortSignal, resolve!: (blob: Blob) => void;
  audio.enqueue({ id: 'old', text: 'Old', priority: 'guide', load: value => { signal = value; return new Promise(done => { resolve = done; }); } }); audio.setScope('new'); resolve(blob()); await Promise.resolve(); expect(signal.aborted).toBe(true); expect(player.play).not.toHaveBeenCalled(); expect(audio.getSnapshot().subtitle).toBe(''); audio.close();
});
it('autoplay rejection reports blocked and recovers on trusted unlock', async () => {
  const { audio, player } = setup(); player.play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'));
  audio.enqueue({ id: 'preview', text: 'Preview', priority: 'guide', load: async () => blob(), systemFallback: false }); await vi.waitFor(() => expect(audio.getSnapshot().status).toBe('blocked'));
  audio.unlock(); await vi.waitFor(() => expect(audio.getSnapshot().status).toBe('playing')); expect(player.play).toHaveBeenCalledTimes(2); audio.close();
});
it('preview change cancels previous card and expiry prevents delayed playback', async () => {
  let now = 1; const player = { src: '', play: vi.fn(), pause: vi.fn(), onended: null, onerror: null }; const audio = new AudioCoordinator(() => player, () => now); audio.unlock(); audio.setMuted(false);
  let resolve!: (blob: Blob) => void;
  audio.preview('first', 'First', () => new Promise(done => { resolve = done; })); audio.preview('second', 'Second', async () => blob()); resolve(blob()); await Promise.resolve();
  expect(audio.getSnapshot().activeId).not.toBe('first'); audio.stop(); now = 100;
  const load = vi.fn(); audio.enqueue({ id: 'expired', text: 'Expired', priority: 'guide', expiresAt: 99, load }); expect(load).not.toHaveBeenCalled(); audio.close();
});
it('semantic repeated errors use one request and preloaded cues reuse private audio', async () => {
  const { audio, player } = setup(), load = vi.fn().mockResolvedValue(blob()); audio.configure(load); await audio.prepare(['depth_insufficient']);
  for (let index = 0; index < 30; index++) audio.event({ type: 'workout.technique_error', at: index * 20, code: 'depth_insufficient', correction: 'Опустись немного ниже', severity: 'hint' });
  await vi.waitFor(() => expect(player.play).toHaveBeenCalledOnce()); expect(load).toHaveBeenCalledOnce(); audio.close();
});
it('recording suspends narration without changing mute preference', () => {
  const { audio, player } = setup(), load = vi.fn(); audio.setRecording(true); audio.enqueue({ id: 'chat', text: 'Chat', priority: 'chat', load }); expect(load).not.toHaveBeenCalled(); expect(audio.isMuted()).toBe(false); expect(player.play).not.toHaveBeenCalled(); audio.setRecording(false); audio.close();
});
it('prepares every static cue, keeps them across routes and clears them for a new voice', async () => {
  const { audio } = setup(), load = vi.fn().mockResolvedValue(blob());
  const cues = Object.keys(cueTexts);
  audio.configure(load); await audio.prepare(cues);
  expect(load).toHaveBeenCalledTimes(cues.length);
  audio.setScope('workout'); await audio.prepare(cues);
  expect(load).toHaveBeenCalledTimes(cues.length);
  audio.configure(load, 'kk'); await audio.prepare(['start']);
  expect(load).toHaveBeenCalledTimes(cues.length + 1);
  audio.close();
});
it('keeps exercise clips through countdown and workout, and clears them for a new spec revision', async () => {
  const { audio } = setup(), load = vi.fn().mockResolvedValue(blob());
  audio.configure(load); audio.setExerciseSpec(spec, 'revision-1');
  await audio.prepare(['error:range_too_small']);
  audio.setScope('countdown'); audio.setScope('workout');
  await audio.prepare(['error:range_too_small']);
  expect(load).toHaveBeenCalledOnce();
  audio.setExerciseSpec(spec, 'revision-2'); await audio.prepare(['error:range_too_small']);
  expect(load).toHaveBeenCalledTimes(2); audio.close();
});
it.each<[string, Messages]>([
  ['calibration', spec.calibration.messages],
  ['error:range_too_small', spec.error_rules[0].messages],
  ['phase:standing', spec.phases[0].messages],
  ...Object.entries(spec.coach_messages).map(([key, value]): [string, Messages] => [`coach:${key}`, value.messages]),
])('uses the selected provider for %s even when recognition and voice languages differ', async (cue, messages) => {
  const { audio, player } = setup(), load = vi.fn().mockResolvedValue(blob()), speak = vi.fn();
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak, cancel: vi.fn() } });
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text; } });
  audio.configure(load, 'kk'); audio.setExerciseSpec(spec, 'revision-1');
  await audio.prepare(audio.exerciseCues()); load.mockClear();
  audio.event(genericCue(localized(messages, 'en'), cue !== 'coach:tracking_recovery'));
  await vi.waitFor(() => expect(player.play).toHaveBeenCalledOnce());
  expect(audio.getSnapshot()).toMatchObject({ provider: 'elevenlabs', subtitle: localized(messages, 'kk') });
  expect(load).not.toHaveBeenCalled(); expect(speak).not.toHaveBeenCalled(); audio.close();
});
it('falls back to browser speech only when a mapped provider cue fails', async () => {
  const { audio } = setup(), load = vi.fn().mockRejectedValue(new Error('offline')), speak = vi.fn();
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak, cancel: vi.fn() } });
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text; } });
  audio.configure(load, 'kk'); audio.setExerciseSpec(spec);
  audio.event(genericCue(localized(spec.coach_messages.ready.messages, 'en')));
  await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
  expect(load).toHaveBeenCalledWith('coach:ready', expect.any(AbortSignal));
  expect(audio.getSnapshot()).toMatchObject({ provider: 'system', subtitle: localized(spec.coach_messages.ready.messages, 'kk') });
  audio.close();
});
it('does not cache a late exercise response after changing the voice or spec', async () => {
  const { audio, player } = setup(); let resolve!: (value: Blob) => void;
  const oldLoad = vi.fn(() => new Promise<Blob>(done => { resolve = done; }));
  audio.configure(oldLoad); audio.setExerciseSpec(spec, 'revision-1');
  const preparing = audio.prepare(['coach:ready']);
  const newLoad = vi.fn().mockResolvedValue(blob());
  audio.configure(newLoad, 'kk'); audio.setExerciseSpec(spec, 'revision-2'); resolve(blob()); await preparing;
  audio.event(genericCue(localized(spec.coach_messages.ready.messages, 'en')));
  await vi.waitFor(() => expect(player.play).toHaveBeenCalledOnce());
  expect(newLoad).toHaveBeenCalledWith('coach:ready', expect.any(AbortSignal)); audio.close();
});
it('speaks the spec positive cue once and reuses fetched clips on later repetitions', async () => {
  let now = 10000; vi.spyOn(Date, 'now').mockImplementation(() => now);
  const { audio, player } = setup(), load = vi.fn().mockResolvedValue(blob());
  audio.configure(load, 'kk'); audio.setExerciseSpec(spec);
  const rep: VisionEvent = { type: 'workout.generic_rep_completed', at: 1000, repIndex: 1, accepted: true, errors: [], metrics: { minKneeAngle: null, maxReturnKneeAngle: null, descentDurationMs: null, ascentDurationMs: null, totalDurationMs: 2000, depthScore: null, meanVisibility: 1, tempo: 'ok' } };
  audio.event(rep); audio.event(genericCue(localized(spec.coach_messages.good_rep.messages, 'en')));
  await vi.waitFor(() => expect(player.play).toHaveBeenCalledOnce());
  expect(load).toHaveBeenCalledWith('coach:good_rep', expect.any(AbortSignal));
  player.onended!(); now += 9000;
  audio.event(genericCue(localized(spec.phases[0].messages, 'en')));
  await vi.waitFor(() => expect(player.play).toHaveBeenCalledTimes(2)); player.onended!();
  audio.event({ ...rep, repIndex: 2 }); audio.event(genericCue(localized(spec.coach_messages.good_rep.messages, 'en')));
  await vi.waitFor(() => expect(player.play).toHaveBeenCalledTimes(3));
  expect(load.mock.calls.map(([cue]) => cue)).toEqual(['coach:good_rep', 'phase:standing']);
  expect(audio.getSnapshot()).toMatchObject({ provider: 'elevenlabs', subtitle: localized(spec.coach_messages.good_rep.messages, 'kk') }); audio.close();
});
