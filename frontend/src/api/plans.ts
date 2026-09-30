import type { ApiClient } from './client'
import type { TrainingPlan } from './types'
export const getCurrentPlan=(client:ApiClient,token:string,signal?:AbortSignal)=>client.json<TrainingPlan>('/training-plans/current',{token,signal})
export const generatePlan=(client:ApiClient,token:string,signal?:AbortSignal)=>client.json<TrainingPlan>('/training-plans/generate',{method:'POST',body:{},token,signal})
