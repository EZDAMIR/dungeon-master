import { ApiError } from "./client";
import type { BackendStore } from '../store/backend';
export type Language = 'ru' | 'kk' | 'en';
export function speechCueRequest(cue: string, exerciseKey?: string, specRevision?: string | null) {
  const exerciseCue = cue === 'calibration' || /^(error|phase|coach):/.test(cue);
  return {
    cue_id: cue.startsWith('coach:') ? cue.slice('coach:'.length) : cue,
    ...(exerciseCue && exerciseKey && specRevision ? { exercise_key: exerciseKey, spec_revision: specRevision } : {}),
  };
}
export type VoicePreferences = { voice_id: string | null; language: Language; style: 'calm' | 'supportive' | 'energetic' | 'strict'; audio_enabled: boolean; revision: number };
export const defaultVoice: VoicePreferences = { voice_id: null, language: 'ru', style: 'supportive', audio_enabled: false, revision: 0 };
export type Voice = { voice_id: string; name: string; description: string | null; labels: Record<string, string> };
export type VoiceList = { voices: Voice[]; has_more: boolean; next_page_token: string | null; model_id: string; language: Language };
export type ProviderState = { configured: boolean; disabled: boolean; unavailable: boolean; last_check: string | null; model?: string };
export type Capabilities = { openai: ProviderState; elevenlabs: ProviderState; transcription: ProviderState; google: ProviderState; execution_mode: string };
export type Proposal = { id: string; kind: 'schedule' | 'plan_change' | 'exercise_swap'; payload: Record<string, unknown>; source_revision: string | number; payload_hash: string; expires_at: string; status: 'pending' | 'confirmed' | 'rejected'; result: Record<string, unknown> | null };
export type CoachTurn = { conversation_id: string; message_id: string; display_text: string; speech_text: string; source_references: { type: string; source_id?: string; label?: string }[]; proposal_ids: string[]; proposals: Proposal[]; ui_actions: string[]; provenance: { execution_mode: string; model_used: string | null; cached: boolean; input_revision: string; prompt_version: string; generated_at: string }; error_category: string | null };
export type SchedulePreferences = { timezone: string; duration_minutes: number; availability: { weekday: number; start_minute: number; end_minute: number }[]; revision: number };
export type Appointment = { id: string; title: string; starts_at: string; ends_at: string; status: string; plan_id: string | null; sync_status: string };
export type Schedule = { timezone: string; revision: number; appointments: Appointment[]; slots: { starts_at: string; ends_at: string }[] };
export type GenerationJob = { id: string; status: 'queued' | 'running' | 'completed' | 'fallback' | 'failed' | 'cancelled' | 'interrupted'; stage: string; completed_specs: number; total_specs: number; result_plan_id: string | null; error_category: string | null; input_revision: string };
export class ReleaseClient {
  readonly backend: BackendStore;
  constructor(backend: BackendStore) { this.backend = backend; }
  async capabilities(signal?: AbortSignal) { const value = await this.backend.request<Capabilities>("/capabilities", undefined, "GET", signal); if (!value?.elevenlabs || typeof value.elevenlabs.configured !== "boolean") throw new ApiError("protocol"); return value; }
  preferences(signal?: AbortSignal) { return this.backend.request<VoicePreferences>('/coach/preferences', undefined, 'GET', signal); }
  savePreferences(value: Omit<VoicePreferences, 'revision'>, signal?: AbortSignal) { return this.backend.request<VoicePreferences>('/coach/preferences', value, 'PUT', signal); }
  async voices(language: Language, signal?: AbortSignal, nextPageToken?: string) { const value = await this.backend.request<VoiceList>(`/voices?language=${language}&page_size=100${nextPageToken ? `&next_page_token=${encodeURIComponent(nextPageToken)}` : ''}`, undefined, 'GET', signal); if (!Array.isArray(value?.voices) || value.voices.some(voice => typeof voice.voice_id !== 'string' || typeof voice.name !== 'string' || !voice.labels || typeof voice.labels !== 'object')) throw new ApiError('protocol'); return value; }
  preview(voice: string, language: Language, style: VoicePreferences['style'], signal: AbortSignal) { return this.backend.requestBlob(`/voices/${encodeURIComponent(voice)}/preview`, { language, style }, 'POST', signal); }
  speech(body: { cue_id: string; exercise_key?: string; spec_revision?: string } | { message_id: string }, signal: AbortSignal) { return this.backend.requestBlob('/speech', body, 'POST', signal); }
  // Allow the default 62-second backend tool/retry deadline and response delivery.
  turn(text: string, conversation_id: string | null, screen: string, signal?: AbortSignal, operation_id: string = crypto.randomUUID()) { return this.backend.request<CoachTurn>('/coach/turns', { operation_id, text, conversation_id, screen, exercise_key: null }, 'POST', signal, 75000); }
  decide(id: string, decision: 'confirm' | 'reject', operation_id: string, signal?: AbortSignal) { return this.backend.request<Proposal>(`/coach/proposals/${encodeURIComponent(id)}/${decision}`, { operation_id }, 'POST', signal); }
}
