import type { ApiClient } from './client'
import type { SessionCreate, SetCreate, SessionComplete, WorkoutSession, WorkoutSet } from './types'
export const createSession=(client:ApiClient,token:string,body:SessionCreate,signal?:AbortSignal)=>client.json<WorkoutSession>('/workout-sessions',{method:'POST',token,body,signal})
export const createSet=(client:ApiClient,token:string,sessionId:string,body:SetCreate,signal?:AbortSignal)=>client.json<WorkoutSet>(`/workout-sessions/${encodeURIComponent(sessionId)}/sets`,{method:'POST',token,body,signal})
export const completeSession=(client:ApiClient,token:string,sessionId:string,body:SessionComplete,signal?:AbortSignal)=>client.json<WorkoutSession>(`/workout-sessions/${encodeURIComponent(sessionId)}/complete`,{method:'POST',token,body,signal})
