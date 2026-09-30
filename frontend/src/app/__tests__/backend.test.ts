import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../api/client'
import { BackendStore } from '../../store/backend'
import { AUTH_KEY, PENDING_KEY, PROFILE_KEY, PROGRESS_KEY, PendingQueue, SafeStorage, parsePending, readAuth, readProgress, type PendingEntry, type StorageLike } from '../../store/persistence'
import type { ProfileUpdate, Progress, TrainingPlan, User } from '../../api/types'
import { buildResult } from '../../vision/exercises/squat/resultBuilder'

const user:User={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:null,display_name:null,is_guest:true,created_at:'2026-09-30T00:00:00Z'}
const profile:ProfileUpdate={goal:'general_fitness',experience_level:'beginner',days_per_week:3,session_minutes:20,equipment:['none'],locale:'ru-RU',timezone:'Asia/Almaty',confirmed_constraints:[]}
const progress:Progress={completed_sessions:0,total_reps:0,accepted_reps:0,rejected_reps:0,acceptance_rate:0,error_counts:{depth_insufficient:0,too_fast:0,incomplete_extension:0},recent_sessions:[]}
const plan:TrainingPlan={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',status:'active',source:'deterministic',starts_on:'2026-09-28',rationale:'Practice',generator_version:'deterministic-v1',created_at:user.created_at,updated_at:user.created_at,items:[]}
function response(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','X-Request-ID':'request-test'}})}
function server(){
  let hasProfile=false,hasPlan=false
  const transport=vi.fn<typeof fetch>(async(url,options)=>{
    const path=String(url).replace('http://test','')
    if(path==='/auth/guest')return response({access_token:'synthetic-guest-token',token_type:'bearer',expires_in:3600,user})
    if(path==='/auth/me')return response(user)
    if(path==='/profile'){
      if(options?.method==='PUT'){hasProfile=true;return response({...JSON.parse(String(options.body)),created_at:user.created_at,updated_at:user.created_at})}
      return response(hasProfile ? profile : {detail:'Profile required'},hasProfile ? 200 : 404)
    }
    if(path==='/training-plans/current')return response(hasPlan ? plan : {detail:'No active plan'},hasPlan ? 200 : 404)
    if(path==='/training-plans/generate'){hasPlan=true;return response(plan)}
    if(path==='/exercises')return response([])
    if(path.startsWith('/progress/summary'))return response(progress)
    if(path==='/workout-sessions')return response({id:'server-session'})
    if(path.endsWith('/sets'))return response({id:'server-set'})
    if(path.endsWith('/complete'))return response({id:'server-session',status:'completed'})
    throw new Error(`Unexpected route ${path}`)
  })
  return transport
}
function memory(){const data=new Map<string,string>();return {data,raw:{getItem:(key:string)=>data.get(key) ?? null,setItem:(key:string,value:string)=>{data.set(key,value)},removeItem:(key:string)=>{data.delete(key)}}}}
function entry(id=crypto.randomUUID()):PendingEntry {
  return {ownerId:user.id,session:{client_session_id:id,plan_id:null,started_at:user.created_at,client_engine_version:'squat-v1'},set:{client_set_id:crypto.randomUUID(),exercise_key:'bodyweight_squat',set_index:1,total_reps:5,accepted_reps:3,duration_ms:27000,error_counts:{depth_insufficient:1,too_fast:1,incomplete_extension:0},metrics:{mean_rep_duration_ms:5400,mean_min_knee_angle:108.4},engine_version:'squat-v1'},complete:{completed_at:'2026-09-30T00:00:27Z',summary:{total_reps:5,accepted_reps:3,rejected_reps:2,duration_ms:27000,error_counts:{depth_insufficient:1,too_fast:1,incomplete_extension:0}}},attempts:0,lastAttemptAt:null}
}
const requests=(transport:ReturnType<typeof server>,path:string)=>transport.mock.calls.filter(([url])=>String(url).endsWith(path))
let testStorage:StorageLike
beforeEach(()=>{testStorage=memory().raw})
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks()})

describe('typed client',()=>{
  it('sends bearer JSON, captures request ID and handles empty responses',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response({ok:true})).mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(new Response(null,{status:204}))
    const client=new ApiClient('http://test/',100,fetcher)
    const result=await client.request<{ok:boolean}>('/x',{method:'PUT',token:'synthetic-token',body:{value:1}})
    expect(result).toEqual({data:{ok:true},requestId:'request-test'})
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({Authorization:'Bearer synthetic-token','Content-Type':'application/json'})
    expect((await client.request('/empty')).data).toBeNull()
    await expect(client.json('/empty')).rejects.toMatchObject({kind:'protocol'})
  })
  it('normalizes HTTP, malformed JSON and offline errors without logging payloads',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(response({detail:'private body',status:'no_eligible_exercises'},409)).mockResolvedValueOnce(new Response('bad')).mockRejectedValueOnce(new Error('network details'))
    const client=new ApiClient('http://test',100,fetcher)
    await expect(client.json('/x')).rejects.toMatchObject({status:409,code:'no_eligible_exercises',requestId:'request-test'})
    await expect(client.json('/x')).rejects.toMatchObject({kind:'protocol'})
    await expect(client.json('/x')).rejects.toMatchObject({kind:'offline',message:'API offline'})
  })
  it('bounds timeout and composes external cancellation',async()=>{
    vi.useFakeTimers()
    const fetcher=vi.fn<typeof fetch>((_,options)=>new Promise((_,reject)=>{if(options?.signal?.aborted)reject(new Error('aborted'));else options?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})}))
    const client=new ApiClient('http://test',100,fetcher)
    const pending=client.json('/x').catch(error=>error)
    await vi.advanceTimersByTimeAsync(100)
    expect(await pending).toMatchObject({kind:'timeout'})
    const controller=new AbortController(),cancelled=client.json('/x',{signal:controller.signal}).catch(error=>error)
    controller.abort();expect(await cancelled).toMatchObject({kind:'aborted'})
    await expect(client.json('/x',{signal:controller.signal})).rejects.toMatchObject({kind:'aborted'})
  })
})

describe('bootstrap and profiles',()=>{
  it('shares bootstrap, creates default profile once and reuses token/plan after reload',async()=>{
    const transport=server(),storage=new SafeStorage(testStorage),store=new BackendStore(new ApiClient('http://test',100,transport),storage)
    const a=store.bootstrap(),b=store.bootstrap();expect(a).toBe(b);await a
    expect(store.getSnapshot()).toMatchObject({status:'online',auth:{user},plan})
    expect(requests(transport,'/auth/guest')).toHaveLength(1)
    expect(requests(transport,'/profile').filter(([,options])=>options?.method==='PUT')).toHaveLength(1)
    expect(requests(transport,'/training-plans/generate')).toHaveLength(1)
    const reloaded=new BackendStore(new ApiClient('http://test',100,transport),storage)
    await reloaded.bootstrap()
    expect(requests(transport,'/auth/guest')).toHaveLength(1)
    expect(requests(transport,'/training-plans/generate')).toHaveLength(1)
    expect(reloaded.getSnapshot().auth?.user.id).toBe(user.id)
    expect(readAuth(storage)?.expiresAt).toBeGreaterThan(Date.now())
  })
  it('recovers a rejected token once and stays local if guest creation fails',async()=>{
    const storage=new SafeStorage(testStorage)
    storage.write(AUTH_KEY,{accessToken:'invalid',expiresAt:1,user})
    const transport=server(),original=transport.getMockImplementation()!
    transport.mockImplementation((url,options)=>String(url).endsWith('/auth/me') ? Promise.resolve(response({},401)) : original(url,options))
    const store=new BackendStore(new ApiClient('http://test',100,transport),storage)
    await store.bootstrap();expect(requests(transport,'/auth/guest')).toHaveLength(1)
    storage.remove(AUTH_KEY)
    const failing=vi.fn<typeof fetch>().mockResolvedValue(response({},401)),offline=new BackendStore(new ApiClient('http://test',100,failing),storage)
    await offline.bootstrap();expect(failing).toHaveBeenCalledTimes(1);expect(offline.getSnapshot().status).toBe('error')
  })
  it('handles offline startup, persists local draft and later sends a full replacement',async()=>{
    const transport=vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),storage=new SafeStorage(testStorage)
    const store=new BackendStore(new ApiClient('http://test',100,transport),storage)
    await store.bootstrap();expect(store.getSnapshot().status).toBe('offline')
    const updated={...profile,days_per_week:2,confirmed_constraints:['no_high_impact'] as const}
    await store.saveProfile({...updated,confirmed_constraints:[...updated.confirmed_constraints]})
    expect(store.getSnapshot().profileMessage).toContain('Локальный черновик')
    const online=server(),reload=new BackendStore(new ApiClient('http://test',100,online),storage)
    await reload.bootstrap()
    expect(requests(online,'/profile').filter(([,options])=>options?.method==='PUT').every(([,options])=>JSON.parse(String(options?.body)).days_per_week===2)).toBe(true)
    await reload.saveProfile(profile)
    const last=requests(online,'/profile').at(-1)![1]
    expect(JSON.parse(String(last?.body))).toEqual(profile)
  })
  it('shows no eligible plan without issuing an unsupported recommendation',async()=>{
    const transport=server(),original=transport.getMockImplementation()!
    transport.mockImplementation((url,options)=>String(url).endsWith('/training-plans/generate') ? Promise.resolve(response({status:'no_eligible_exercises'},409)) : original(url,options))
    const store=new BackendStore(new ApiClient('http://test',100,transport),new SafeStorage(testStorage))
    await store.bootstrap()
    expect(store.getSnapshot().status).toBe('online')
    expect(store.getSnapshot().plan).toBeNull()
    expect(store.getSnapshot().planMessage).toContain('нет доступных')
  })
})

describe('aggregate sync and bounded pending queue',()=>{
  it('persists only aggregates, survives reload and refuses to discard unsynced entries at the bound',()=>{
    const {raw,data}=memory(),queue=new PendingQueue(new SafeStorage(raw))
    const sample=entry(),projected=parsePending({...sample,landmarks:[],set:{...sample.set,frames:[],video:'raw'}})!
    expect(JSON.stringify(projected)).not.toMatch(/landmarks|frames|video/)
    expect(queue.add(sample)).toBe(true);expect(queue.add(sample)).toBe(true)
    for(let i=1;i<20;i++)expect(queue.add(entry())).toBe(true)
    expect(queue.add(entry())).toBe(false)
    expect(new PendingQueue(new SafeStorage(raw)).entries()).toHaveLength(20)
    queue.remove(sample.session.client_session_id)
    expect(queue.entries()).toHaveLength(19)
    expect(data.get(PENDING_KEY)).not.toContain('synthetic-token')
    expect(parsePending({...sample,set:{...sample.set,metrics:{mean_rep_duration_ms:NaN,mean_min_knee_angle:100}}})).toBeNull()
  })
  it('syncs start/set/complete with stable IDs, removes success and refreshes progress',async()=>{
    const transport=server(),store=new BackendStore(new ApiClient('http://test',100,transport),new SafeStorage(testStorage))
    await store.bootstrap();const sample=entry();store.queue.add(sample)
    await store.retry()
    expect(store.queue.entries()).toHaveLength(0)
    expect(store.getSnapshot().syncMessage).toBe('Сохранено')
    expect(requests(transport,'/workout-sessions')).toHaveLength(1)
    expect(requests(transport,'/sets')).toHaveLength(1)
    expect(requests(transport,'/complete')).toHaveLength(1)
    expect(JSON.parse(String(requests(transport,'/sets')[0][1]?.body))).toEqual(sample.set)
  })
  it.each(['/sets','/complete'])('keeps a result when network fails at %s and repeats idempotent IDs',async(failure)=>{
    const transport=server(),original=transport.getMockImplementation()!,storage=new SafeStorage(testStorage)
    const store=new BackendStore(new ApiClient('http://test',100,transport),storage);await store.bootstrap()
    transport.mockImplementation((url,options)=>String(url).endsWith(failure) ? Promise.reject(new Error('offline')) : original(url,options))
    const sample=entry();store.queue.add(sample);await store.retry()
    expect(store.queue.entries()).toHaveLength(1);expect(store.getSnapshot().syncMessage).toBe('Ожидает синхронизации')
    transport.mockImplementation(original)
    const reload=new BackendStore(new ApiClient('http://test',100,transport),storage);await reload.bootstrap()
    expect(reload.queue.entries()).toHaveLength(0)
    expect(requests(transport,'/workout-sessions').map(([,options])=>JSON.parse(String(options?.body)).client_session_id)).toEqual([sample.session.client_session_id,sample.session.client_session_id])
  })
  it('never reassigns an owned pending result to a recovered guest and does not loop auth',async()=>{
    const transport=server(),original=transport.getMockImplementation()!,store=new BackendStore(new ApiClient('http://test',100,transport),new SafeStorage(testStorage))
    await store.bootstrap();store.queue.add(entry())
    transport.mockImplementation((url,options)=>String(url).endsWith('/workout-sessions') || String(url).endsWith('/auth/me') ? Promise.resolve(response({},401)) : String(url).endsWith('/auth/guest') ? Promise.resolve(response({access_token:'new-guest',expires_in:3600,user:{...user,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}})) : original(url,options))
    await store.retry();expect(store.queue.entries()).toHaveLength(1)
    expect(requests(transport,'/auth/guest')).toHaveLength(2)
    await store.retry();expect(requests(transport,'/workout-sessions')).toHaveLength(1)
    expect(store.getSnapshot().syncMessage).toContain('прежнего гостя')
  })
  it('uses in-memory fallback when localStorage is blocked and marks cache honestly',async()=>{
    const raw={getItem:()=>{throw new Error('blocked')},setItem:()=>{throw new Error('quota')},removeItem:()=>{throw new Error('blocked')}}
    const storage=new SafeStorage(raw),transport=server(),store=new BackendStore(new ApiClient('http://test',100,transport),storage)
    await store.bootstrap();expect(store.getSnapshot().storageAvailable).toBe(false)
    const start=store.startWorkout(null),result=buildResult([],0)
    store.recordWorkout(start,result,0);await store.retry()
    expect(store.getSnapshot().lastSavedClientId).toBe(start.client_session_id)
    storage.write(PROGRESS_KEY,{ownerId:user.id,data:progress})
    expect(readProgress(storage,user.id)).toEqual(progress)
    expect(readProgress(storage,'another-user')).toBeNull()
    storage.write(PROGRESS_KEY,{ownerId:user.id,data:{...progress,acceptance_rate:NaN}})
    expect(readProgress(storage,user.id)).toBeNull()
    storage.write(PROFILE_KEY,{});expect(storage.read(PROFILE_KEY)).toEqual({})
  })
})
it('retries only on explicit online triggers and preserves cached progress while offline',async()=>{
  const storage=new SafeStorage(testStorage)
  storage.write(AUTH_KEY,{accessToken:'cached-guest',expiresAt:Date.now()+3600000,user})
  storage.write(PROGRESS_KEY,{ownerId:user.id,data:progress})
  const transport=server(),original=transport.getMockImplementation()!
  transport.mockRejectedValue(new Error('offline'))
  const store=new BackendStore(new ApiClient('http://test',100,transport),storage)
  const release=store.attach();await store.bootstrap()
  expect(store.getSnapshot()).toMatchObject({status:'offline',progress,cachedProgress:true})
  const calls=transport.mock.calls.length
  await Promise.resolve();expect(transport).toHaveBeenCalledTimes(calls)
  transport.mockImplementation(original)
  window.dispatchEvent(new Event('online'));await store.bootstrap()
  expect(store.getSnapshot()).toMatchObject({status:'online',cachedProgress:false})
  release();await Promise.resolve()
})
it('survives StrictMode attach/release without issuing two guest requests',async()=>{
  const transport=server(),store=new BackendStore(new ApiClient('http://test',100,transport),new SafeStorage(testStorage))
  const release=store.attach();release();const releaseAgain=store.attach()
  await store.bootstrap();expect(requests(transport,'/auth/guest')).toHaveLength(1)
  releaseAgain();await Promise.resolve()
})
