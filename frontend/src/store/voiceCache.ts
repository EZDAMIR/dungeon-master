import type { VoicePreferences } from '../api/release';
import { record, SafeStorage } from './persistence';
export function readVoiceCache(storage: SafeStorage, owner: string | null): { preferences: VoicePreferences; persisted: boolean } | null {
  const value = storage.read('dungeon-master.voice-preferences.v1');
  if (!record(value) || value.owner !== owner || !record(value.preferences)) return null;
  const p = value.preferences;
  if ((p.voice_id !== null && typeof p.voice_id !== 'string') || !['ru','kk','en'].includes(String(p.language)) || !['calm','supportive','energetic','strict'].includes(String(p.style)) || typeof p.audio_enabled !== 'boolean' || typeof p.revision !== 'number' || !Number.isInteger(p.revision)) return null;
  return { preferences: p as VoicePreferences, persisted: value.persisted === true };
}
export function writeVoiceCache(storage: SafeStorage, owner: string | null, preferences: VoicePreferences, persisted: boolean) { storage.write('dungeon-master.voice-preferences.v1', { owner, preferences, persisted }); }
