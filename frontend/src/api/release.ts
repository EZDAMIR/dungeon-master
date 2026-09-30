import type { BackendStore } from '../store/backend';
export type Language = 'ru' | 'kk' | 'en';
export type VoicePreferences = { voice_id: string | null; language: Language; style: 'calm' | 'supportive' | 'energetic' | 'strict'; audio_enabled: boolean; revision: number };
export const defaultVoice: VoicePreferences = { voice_id: null, language: 'ru', style: 'supportive', audio_enabled: false, revision: 0 };
export type Voice = { voice_id: string; name: string; description: string | null; labels: Record<string, string> };
export type VoiceList = { voices: Voice[]; has_more: boolean; next_page_token: string | null; model_id: string; language: Language };
export type ProviderState = { configured: boolean; disabled: boolean; unavailable: boolean; last_check: string | null; model?: string };
export type Capabilities = { openai: ProviderState; elevenlabs: ProviderState; transcription: ProviderState; google: ProviderState; execution_mode: string };
export type Proposal = { id: string; kind: 'schedule' | 'plan_change' | 'exercise_swap'; payload: Record<string, unknown>; source_revision: string | number; payload_hash: string; expires_at: string; status: 'pending' | 'confirmed' | 'rejected'; result: Record<string, unknown> | null };
export type CoachTurn = { conversation_id: string; message_id: string; display_text: string; speech_text: string; source_references: { source_type: string; source_id?: string; label?: string; excerpt?: string }[]; proposal_ids: string[]; proposals: Proposal[]; ui_actions: { action: string; exercise_key?: string }[]; provenance: { execution_mode: string; model_used: string | null; cached: boolean; input_revision: string; prompt_version: string; generated_at: string }; error_category: string | null };
export type SchedulePreferences = { timezone: string; duration_minutes: number; availability: { weekday: number; start_minute: number; end_minute: number }[]; revision: number };
export type Appointment = { id: string; title: string; starts_at: string; ends_at: string; status: string; plan_id: string | null; sync_status: string };
export type Schedule = { timezone: string; revision: number; appointments: Appointment[]; slots: { starts_at: string; ends_at: string }[] };
export type GenerationJob = { id: string; status: 'queued' | 'running' | 'completed' | 'fallback' | 'failed' | 'cancelled' | 'interrupted'; stage: string; completed_specs: number; total_specs: number; result_plan_id: string | null; error_category: string | null; input_revision: string };
export class ReleaseClient {
  readonly backend: BackendStore;
  constructor(backend: BackendStore) { this.backend = backend; }
  capabilities(signal?: AbortSignal) { return this.backend.request<Capabilities>("/capabilities", undefined, "GET", signal); }
  preferences(signal?: AbortSignal) { return this.backend.request<VoicePreferences>('/coach/preferences', undefined, 'GET', signal); }
  savePreferences(value: Omit<VoicePreferences, 'revision'>, signal?: AbortSignal) { return this.backend.request<VoicePreferences>('/coach/preferences', value, 'PUT', signal); }
  voices(language: Language, signal?: AbortSignal) { return this.backend.request<VoiceList>(`/voices?language=${language}&page_size=6`, undefined, 'GET', signal); }
  preview(voice: string, language: Language, style: VoicePreferences['style'], signal: AbortSignal) { return this.backend.requestBlob(`/voices/${encodeURIComponent(voice)}/preview`, { language, style }, 'POST', signal); }
  speech(body: { cue_id: string; exercise_key?: string; spec_revision?: string } | { message_id: string }, signal: AbortSignal) { return this.backend.requestBlob('/speech', body, 'POST', signal); }
  turn(text: string, conversation_id: string | null, screen: string, signal?: AbortSignal, operation_id: string = crypto.randomUUID()) { return this.backend.request<CoachTurn>('/coach/turns', { operation_id, text, conversation_id, screen, exercise_key: null }, 'POST', signal); }
  decide(id: string, decision: 'confirm' | 'reject', operation_id: string, signal?: AbortSignal) { return this.backend.request<Proposal>(`/coach/proposals/${encodeURIComponent(id)}/${decision}`, { operation_id }, 'POST', signal); }
}
