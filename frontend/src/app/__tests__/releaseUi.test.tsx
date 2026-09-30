import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { ReleaseClient, type Proposal } from '../../api/release';
import { ApiError, ApiClient } from '../../api/client';
import { BackendStore } from '../../store/backend';
import { SafeStorage } from '../../store/persistence';
import { ProposalCard } from '../../features/coach/ProposalCard';
import { PendingQueue, parsePending } from '../../store/persistence';
import { readVoiceCache, writeVoiceCache } from '../../store/voiceCache';
import type { SetCreate } from '../../api/types';
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
afterEach(() => { vi.restoreAllMocks(); });
const proposal: Proposal = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', kind: 'schedule', payload: { title: 'Practice', starts_at: '2026-10-01T13:00:00Z', duration_minutes: 20, action: 'create' }, source_revision: 1, payload_hash: 'hash', expires_at: '2099-01-01T00:00:00Z', status: 'pending', result: null };
it('proposal double confirmation sends one operation and reports success only after API resolves', async () => {
  const backend = new BackendStore(new ApiClient(), new SafeStorage()), client = new ReleaseClient(backend); let resolve!: (proposal: Proposal) => void; const decide = vi.spyOn(client, 'decide').mockImplementation(() => new Promise(done => { resolve = done; }));
  const element = document.createElement('div'); document.body.append(element); const root = createRoot(element);
  await act(async () => root.render(<StrictMode><ProposalCard proposal={proposal} client={client} /></StrictMode>));
  const button = [...element.querySelectorAll('button')].find(button => button.textContent === 'Подтвердить')!;
  await act(async () => { button.click(); button.click(); }); expect(decide).toHaveBeenCalledOnce(); expect(element.textContent).toContain('ожидает вашего подтверждения');
  await act(async () => resolve({ ...proposal, status: 'confirmed', result: { sync_status: 'partial' } })); expect(element.textContent).toContain('Подтверждено сервером'); expect(element.textContent).toContain('Google: partial'); await act(async () => root.unmount()); element.remove();
});
it('stale proposal remains unconfirmed and requests refresh', async () => {
  const client = new ReleaseClient(new BackendStore(new ApiClient(), new SafeStorage())); vi.spyOn(client, 'decide').mockRejectedValue(new ApiError('http', 409));
  const element = document.createElement('div'); const root = createRoot(element); await act(async () => root.render(<ProposalCard proposal={proposal} client={client} />)); await act(async () => (element.querySelector('button') as HTMLButtonElement).click()); expect(element.textContent).toContain('устарело'); expect(element.textContent).not.toContain('Подтверждено сервером'); await act(async () => root.unmount());
});
it('multi-set queue retains globally numbered sets, nullable geometry and excludes manual reps from assessment', () => {
  const storage = new SafeStorage(), backend = new BackendStore(new ApiClient(), storage); vi.spyOn(backend, 'retry').mockResolvedValue(); const start = backend.startWorkout(null, 'multi-set-v1');
  const camera: SetCreate = { client_set_id: crypto.randomUUID(), exercise_key: 'arm_raise', set_index: 1, total_reps: 3, accepted_reps: 2, duration_ms: 10000, error_counts: { depth_insufficient: 0, too_fast: 0, incomplete_extension: 0 }, generic_error_counts: { range_too_small: 1 }, metrics: { mean_rep_duration_ms: 3000, mean_min_knee_angle: null }, engine_version: 'generic-v1', assessment_mode: 'camera', completion_status: 'completed', spec_revision: proposal.id, target_snapshot: { target_reps: 3, duration_seconds: null, rest_seconds: 30, plan_sets: 2 } };
  const manual: SetCreate = { ...camera, client_set_id: crypto.randomUUID(), set_index: 2, total_reps: 5, accepted_reps: 0, assessment_mode: 'manual', generic_error_counts: {}, metrics: { mean_rep_duration_ms: null, mean_min_knee_angle: null }, engine_version: 'manual-v1' };
  expect(backend.recordSets(start, [camera, manual])).toBe(true); const entry = new PendingQueue(storage).entries()[0]; expect(entry.sets).toHaveLength(2); expect(entry.sets?.[0].metrics.mean_min_knee_angle).toBeNull(); expect(entry.complete.summary).toMatchObject({ total_reps: 8, camera_total_reps: 3, accepted_reps: 2, rejected_reps: 1, total_sets: 2, manual_completed_sets: 1 }); expect(parsePending({ ...entry, sets: [camera, { ...manual, accepted_reps: 5 }] })).toBeNull();
});
it('voice cache restores a selected language and never leaks another owner settings', () => {
  const storage = new SafeStorage(); writeVoiceCache(storage, 'owner1', { voice_id: 'actual-provider-id', language: 'kk', style: 'calm', audio_enabled: true, revision: 2 }, true); expect(readVoiceCache(storage, 'owner1')?.preferences.language).toBe('kk'); expect(readVoiceCache(storage, 'owner2')).toBeNull();
});
