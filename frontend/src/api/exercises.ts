import type { ApiClient } from './client'
import type { Exercise } from './types'
export const getExercises=(client:ApiClient,token:string,signal?:AbortSignal)=>client.json<Exercise[]>('/exercises',{token,signal})
