import type { ApiClient } from './client'
import type { GuestToken, User } from './types'
export const createGuest=(client:ApiClient,signal?:AbortSignal)=>client.json<GuestToken>('/auth/guest',{method:'POST',body:{},signal})
export const getMe=(client:ApiClient,token:string,signal?:AbortSignal)=>client.json<User>('/auth/me',{token,signal})

export const refreshGuest=(client:ApiClient,signal?:AbortSignal)=>client.json<GuestToken>('/auth/refresh',{method:'POST',body:{},signal})

export const bootstrapGuestSession=(client:ApiClient,token:string,signal?:AbortSignal)=>client.json<GuestToken>('/auth/session',{method:'POST',token,body:{},signal})
