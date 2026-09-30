import { afterEach, expect, it, vi } from 'vitest';
import { AudioCoordinator } from '../audioCoordinator';
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
