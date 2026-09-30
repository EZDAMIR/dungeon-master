import { expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../../api/client';
import { GuideMachine } from '../../features/guided-tour/guideMachine';
import { localToInstant } from '../../features/schedule/timezone';
import { PushToTalk } from '../../features/coach/pushToTalk';
it('binary transport sends bearer only in header and includes cookie credentials', async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Blob(['audio'], { type: 'audio/mpeg' }))), client = new ApiClient('http://test', 100, transport);
  const audio = await client.blob('/voices/id/preview', { method: 'POST', token: 'private', body: { language: 'kk' } });
  expect(audio.size).toBeGreaterThan(0); expect(transport.mock.calls[0][0]).toBe('http://test/voices/id/preview'); expect(transport.mock.calls[0][1]).toMatchObject({ credentials: 'include', headers: { Authorization: 'Bearer private' } });
});
it('audio provider JSON error remains an error', async () => {
  const client = new ApiClient('http://test', 100, vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
  await expect(client.blob('/speech')).rejects.toMatchObject({ status: 503 });
});
it('one rejected access token uses recovery then retries once', async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValue(new Response('{"ok":true}')), client = new ApiClient('http://test', 100, transport), recover = vi.fn().mockResolvedValue('renewed'); client.setAuthRecovery(recover);
  await expect(client.json('/private', { token: 'old' })).resolves.toEqual({ ok: true }); expect(recover).toHaveBeenCalledOnce(); expect(transport.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer renewed' });
});
it('guided demo waits for actual events and remembers out-of-order camera readiness', () => {
  const guide = new GuideMachine(); guide.consume('camera.ready'); expect(guide.getSnapshot()?.event).toBe('voice.selected'); guide.consume('voice.selected'); expect(guide.getSnapshot()?.event).toBe('context.opened'); guide.consume('context.opened'); guide.consume('plan.ready'); guide.consume('exercise.opened'); expect(guide.getSnapshot()?.event).toBe('gesture.success'); guide.stop(); expect(guide.getSnapshot()).toBeNull();
});
it('timezone conversion preserves Almaty and rejects DST gap/fold', () => {
  expect(localToInstant('2026-10-01T18:00', 'Asia/Almaty')).toBe('2026-10-01T13:00:00.000Z'); expect(() => localToInstant('2026-03-08T02:30', 'America/New_York')).toThrow('не существует'); expect(() => localToInstant('2026-11-01T01:30', 'America/New_York')).toThrow('неоднозначно');
});
it('push-to-talk cancellation closes a permission request resolving late', async () => {
  const original = navigator.mediaDevices, stop = vi.fn(); let resolve!: (stream: MediaStream) => void;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => new Promise(done => { resolve = done; }) } });
  vi.stubGlobal('MediaRecorder', class { static isTypeSupported() { return true; } }); const recorder = new PushToTalk(vi.fn(), vi.fn()); const pending = recorder.start(); recorder.cancel(); resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream); await pending; expect(stop).toHaveBeenCalledOnce(); Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original }); vi.unstubAllGlobals();
});
it('normalizes unavailable refresh without identity creation', async () => {
  const transport = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })), client = new ApiClient('http://test', 100, transport); client.setAuthRecovery(async () => { throw new ApiError('http', 401); }); await expect(client.json('/private', { token: 'old' })).rejects.toMatchObject({ status: 401 }); expect(transport).toHaveBeenCalledOnce();
});

import { projectSessionSets, type MeasuredSet } from '../../store/sessionProjection';
it('projects every set with global ordinals and preserves null generic/manual measurements', () => {
 const base: MeasuredSet = {clientSetId: '00000000-0000-4000-8000-000000000001', exerciseKey:'arm_raise',specRevision:'00000000-0000-4000-8000-000000000004',setIndex:1,targetReps:5,assessmentMode:'camera',status:'completed',totalReps:5,acceptedReps:4,durationMs:5000,meanRepDurationMs:1000,errorCounts:{range_short:1},metrics:[{metrics:{minKneeAngle:null}}],targetSnapshot:{targetReps:5,restSeconds:30,planSets:2,durationSeconds:null}};
 const sets = projectSessionSets([base,{...base,clientSetId:'00000000-0000-4000-8000-000000000002',setIndex:2,status:'partial',totalReps:1,acceptedReps:0},{...base,clientSetId:'00000000-0000-4000-8000-000000000003',setIndex:3,assessmentMode:'manual',meanRepDurationMs:null,metrics:[]}]);
 expect(sets.map(set=>set.set_index)).toEqual([1,2,3]);expect(sets[0].metrics.mean_min_knee_angle).toBeNull();expect(sets[0].generic_error_counts).toEqual({range_short:1});expect(sets[1].completion_status).toBe('partial');expect(sets[2].accepted_reps).toBe(0);expect(sets[2].generic_error_counts).toEqual({});expect(sets[2].metrics.mean_rep_duration_ms).toBeNull();expect(sets[0].spec_revision).toBe(base.specRevision);
});
import { WorkoutSessionRunner } from '../../features/workout-session/public';
import { BackendStore } from '../../store/backend';
import { SafeStorage } from '../../store/persistence';
it('keeps completed plus nonempty partial sets for offline retry with stable UUIDs and actual nullable metrics',()=>{
 const runner=new WorkoutSessionRunner([{exerciseId:'first',exerciseKey:'bodyweight_squat',specRevision:null,movementSpec:null,sets:2,reps:2,restSeconds:30,assessmentMode:'camera'}]);
 const rep=(at:number,repIndex:number):import('../../types/vision').VisionEvent=>({type:'workout.generic_rep_completed',at,repIndex,accepted:false,errors:['range_short'],metrics:{minKneeAngle:null,maxReturnKneeAngle:null,descentDurationMs:null,ascentDurationMs:null,depthScore:null,meanVisibility:.8,tempo:'ok',totalDurationMs:1500}});
 runner.start(0);runner.consume({type:'workout.countdown_done',at:100});runner.consume(rep(200,1));runner.consume(rep(300,2));expect(runner.getSnapshot().phase).toBe('rest');runner.next(400);runner.consume({type:'workout.countdown_done',at:500});runner.consume(rep(600,1));runner.stop(700);runner.stop(800);
 const sets=projectSessionSets(runner.getSnapshot().sets),backend=new BackendStore(new ApiClient(),new SafeStorage());vi.spyOn(backend,'retry').mockResolvedValue();const start={...backend.startWorkout(null,'workout-session-v1'),client_session_id:runner.getSnapshot().clientSessionId};expect(backend.recordSets(start,sets)).toBe(true);
 const entry=backend.queue.entries()[0];expect(entry.sets?.map(set=>set.completion_status)).toEqual(['completed','partial']);expect(entry.sets?.map(set=>set.set_index)).toEqual([1,2]);expect(entry.sets?.every(set=>set.metrics.mean_min_knee_angle===null)).toBe(true);expect(entry.complete.summary).toMatchObject({total_sets:2,total_reps:3,camera_total_reps:3,accepted_reps:0,rejected_reps:3,generic_error_counts:{range_short:3},duration_ms:400});expect(backend.queue.entries()[0].session.client_session_id).toBe(start.client_session_id);
});
