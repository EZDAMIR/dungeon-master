import { localized, type MovementSpec } from "../vision/exercises/generic/types";
import { cueText } from "./cues";
import { GestureAudio } from './gestureAudio';
import type { VisionEvent } from '../types/vision';

export type AudioPriority = 'recovery' | 'technique' | 'countdown' | 'guide' | 'chat' | 'motivation';
const priority: Record<AudioPriority, number> = { recovery: 6, technique: 5, countdown: 4, guide: 3, chat: 2, motivation: 1 };
export type AudioIntent = { id: string; text: string; priority: AudioPriority; expiresAt?: number; load?: (signal: AbortSignal) => Promise<Blob>; systemFallback?: boolean };
export type AudioSnapshot = { status: 'muted' | 'idle' | 'loading' | 'playing' | 'blocked' | 'unavailable'; subtitle: string; provider: 'elevenlabs' | 'system' | null; activeId: string | null };
type Player = Pick<HTMLAudioElement, 'src' | 'play' | 'pause' | 'onended' | 'onerror'>;
export class AudioCoordinator extends GestureAudio {
  private snapshot: AudioSnapshot = { status: 'muted', subtitle: '', provider: null, activeId: null };
  private listeners = new Set<() => void>();
  private queue: AudioIntent[] = [];
  private active: { intent: AudioIntent; controller: AbortController; generation: number } | null = null;
  private generation = 0;
  private recording = false;
  private lastGenericPrimary = "";
  private exerciseSpec: MovementSpec | null = null;
  setExerciseSpec(spec: MovementSpec | null) {this.exerciseSpec=spec;this.lastGenericPrimary="";}
  private prepared = new Map<string, Blob>();
  private prepareController: AbortController | null = null;
  private muted = true;
  private unlocked = false;
  private blocked: AudioIntent | null = null;
  private scope = '';
  private url: string | null = null;
  private player: Player | null = null;
  private seen = new Map<string, number>();
  private loader: ((cue: string, signal: AbortSignal) => Promise<Blob>) | null = null;
  private language = 'ru';
  private makePlayer: () => Player;
  private now: () => number;
  constructor(makePlayer: () => Player = () => new Audio(), now: () => number = () => Date.now()) { super(); this.makePlayer = makePlayer; this.now = now; }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<AudioSnapshot>) { this.snapshot = { ...this.snapshot, ...patch }; for (const listener of this.listeners) listener(); }
  configure(loader: ((cue: string, signal: AbortSignal) => Promise<Blob>) | null, language = 'ru') { this.stop(); this.loader = loader; this.language = language; this.prepared.clear(); this.lastGenericPrimary = ""; this.seen.clear(); }
  setScope(scope: string) { if (scope !== this.scope) { this.scope = scope; this.stop(); this.prepared.clear(); this.seen.clear(); this.lastGenericPrimary=""; } }
  setRecording(value: boolean) { this.recording = value; if (value) this.stop(); }
  async prepare(cues: readonly string[]) {
    if (!this.loader || this.muted || this.recording) return;
    this.prepareController?.abort(); const controller = new AbortController(); this.prepareController = controller;
    const load = this.loader, pending = cues.slice(0, 8).filter(cue => !this.prepared.has(cue));
    const worker = async () => {
      while (pending.length && !controller.signal.aborted) {
        const cue = pending.shift()!;
        try { const blob = await load(cue, controller.signal); if (!controller.signal.aborted && blob.type.startsWith('audio/') && blob.size <= 1024 * 1024) { this.prepared.set(cue, blob); while (this.prepared.size > 8) this.prepared.delete(this.prepared.keys().next().value!); } } catch { /* Preview and visual coaching remain available. */ }
      }
    };
    await Promise.all([worker(), worker()]);
  }
  private loadCue(cue: string, signal: AbortSignal) { const cached = this.prepared.get(cue); return cached ? Promise.resolve(cached) : this.loader!(cue, signal); }
  isMuted() { return this.muted; }
  status() { return this.snapshot.status === 'muted' ? 'Voice muted' : this.snapshot.provider === 'system' ? 'Системный голос' : this.snapshot.status === 'blocked' ? 'Включить звук' : this.snapshot.status === 'unavailable' ? 'Звук недоступен · субтитры' : 'Voice on'; }
  setMuted(muted: boolean) { this.muted = muted; if (muted) this.stop(); this.publish({ status: muted ? 'muted' : 'idle' }); }
  unlock() { this.unlocked = true; void super.enable(); if (this.blocked) { const intent = this.blocked; this.blocked = null; this.seen.delete(intent.id); this.enqueue(intent); } }
  override async enable() { this.unlock(); }
  enqueue(intent: AudioIntent) {
    if (this.muted || this.recording || !intent.text.trim()) return;
    if ((this.seen.get(intent.id) ?? -Infinity) > this.now() - 8000) return;
    this.seen.set(intent.id, this.now());
    if (this.seen.size > 100) this.seen.delete(this.seen.keys().next().value!);
    if (this.active && priority[intent.priority] > priority[this.active.intent.priority]) this.cancelActive();
    this.queue = this.queue.filter(item => item.id !== intent.id);
    this.queue.push({ ...intent, expiresAt: intent.expiresAt ?? this.now() + 30000 });
    this.queue.sort((a, b) => priority[b.priority] - priority[a.priority]);
    this.queue = this.queue.slice(0, 8);
    void this.drain();
  }
  preview(id: string, text: string, load: (signal: AbortSignal) => Promise<Blob>) {
    this.stop(); this.seen.delete(id); this.setMuted(false);
    this.enqueue({ id, text, priority: 'guide', load, systemFallback: false });
  }
  private cancelActive() {
    this.generation++; this.active?.controller.abort(); this.active = null;
    if (this.player) { this.player.onended = null; this.player.onerror = null; this.player.pause(); this.player.src = ''; this.player = null; }
    if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    try { window.speechSynthesis?.cancel(); } catch { /* Text remains visible. */ }
  }
  stop() { this.prepareController?.abort(); this.prepareController = null; this.blocked = null; this.queue = []; this.cancelActive(); this.publish({ status: this.muted ? 'muted' : 'idle', subtitle: '', activeId: null, provider: null }); }
  private async drain() {
    if (this.active || this.muted || document.hidden) return;
    const intent = this.queue.shift(); if (!intent) return;
    if (intent.expiresAt! <= this.now()) { void this.drain(); return; }
    const active = { intent, controller: new AbortController(), generation: this.generation };
    this.active = active;
    this.publish({ status: 'loading', subtitle: intent.text, activeId: intent.id, provider: null });
    const current = () => this.active === active && active.generation === this.generation && !active.controller.signal.aborted && !this.muted && !document.hidden && intent.expiresAt! > this.now();
    const finish = () => { if (this.active !== active) return; this.cancelActive(); this.publish({ status: 'idle', activeId: null, subtitle: '', provider: null }); void this.drain(); };
    try {
      if (!this.unlocked) { this.blocked = intent; this.publish({ status: 'blocked' }); this.active = null; return; }
      if (!intent.load) throw new Error('No provider');
      const blob = await intent.load(active.controller.signal);
      if (!current()) { if (this.active === active) finish(); return; }
      if (!blob.type.startsWith('audio/')) throw new Error('Invalid audio');
      this.url = URL.createObjectURL(blob); this.player = this.makePlayer(); this.player.src = this.url;
      this.player.onended = finish;
      this.player.onerror = () => { if (!current()) return; this.cancelActive(); this.publish({ status: 'unavailable', provider: null, activeId: null }); };
      await this.player.play();
      if (current()) this.publish({ status: 'playing', provider: 'elevenlabs' }); else if (this.active === active) finish();
    } catch (error) {
      if (!current()) { if (this.active === active) finish(); return; }
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.cancelActive(); this.blocked = intent; this.publish({ status: 'blocked', subtitle: intent.text, activeId: intent.id, provider: null }); return;
      }
      this.cancelActive();
      if (intent.systemFallback !== false && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(intent.text); utterance.lang = this.language;
        this.active = active; active.generation = this.generation;
        utterance.onend = finish; utterance.onerror = finish;
        this.publish({ status: 'playing', provider: 'system' });
        try { window.speechSynthesis.speak(utterance); } catch { finish(); }
      } else this.publish({ status: 'unavailable', provider: null, activeId: null });
    }
  }
  override event(event: VisionEvent) {
    if (!this.muted) super.event(event);
    let cue = '', text = '', kind: AudioPriority = 'technique';
    if (event.type === 'pose.tracking_lost') { cue = 'tracking_recovery'; text = 'Вернись в кадр'; kind = 'recovery'; }
    if (event.type === 'workout.technique_error') { cue = event.code; text = { depth_insufficient: 'Опустись немного ниже', too_fast: 'Медленнее вниз', incomplete_extension: 'Заверши подъём' }[event.code]; }
    if (event.type === 'workout.countdown') { cue = event.count > 0 ? `countdown_${event.count}` : 'start'; text = event.count > 0 ? String(event.count) : 'Начали'; kind = 'countdown'; }
    if (event.type === 'workout.completed') { cue = 'workout_complete'; text = 'Тренировка завершена'; kind = 'guide'; }
    if ((event.type === 'workout.rep_completed'||event.type === 'workout.generic_rep_completed') && event.accepted) { cue = 'good_rep'; text = 'Хорошее повторение'; kind = 'motivation'; }
    if (event.type === 'workout.generic_updated') {
      if (event.view.primary === this.lastGenericPrimary) return;
      this.lastGenericPrimary = event.view.primary;
      text = event.view.primary; cue = event.view.tracking ? '' : 'tracking_recovery'; kind = event.view.tracking ? 'technique' : 'recovery';
      if(event.view.tracking && this.exerciseSpec){
        const language=this.language as 'ru'|'kk'|'en', rule=this.exerciseSpec.error_rules.find(rule=>localized(rule.messages,language)===text), phase=this.exerciseSpec.phases.find(phase=>localized(phase.messages,language)===text);
        cue=rule?`error:${rule.code}`:phase?`phase:${phase.id}`:localized(this.exerciseSpec.calibration.messages,language)===text?'calibration':'';
      }
    }
    if (text) this.enqueue({ id: `${cue}:${text}`, text: cueText(cue, this.language, text), priority: kind, load: cue && this.loader ? signal => this.loadCue(cue, signal) : undefined });
  }
  override close() { this.stop(); this.unlocked = false; super.close(); }
}
