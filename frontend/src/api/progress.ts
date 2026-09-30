import type { ApiClient } from './client'
import type { Progress } from './types'
export const getProgress=(client:ApiClient,token:string,signal?:AbortSignal)=>client.json<Progress>('/progress/summary?recent_limit=5',{token,signal})
