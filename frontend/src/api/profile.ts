import type { ApiClient } from './client'
import type { Profile, ProfileUpdate } from './types'
export const getProfile=(client:ApiClient,token:string,signal?:AbortSignal)=>client.json<Profile>('/profile',{token,signal})
export const putProfile=(client:ApiClient,token:string,body:ProfileUpdate,signal?:AbortSignal)=>client.json<Profile>('/profile',{method:'PUT',token,body,signal})
