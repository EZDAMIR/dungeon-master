import { useSyncExternalStore } from 'react'
export interface InputPreferencesV1 { version: 1; mode: 'hands' | 'mouse'; sensitivity: number; smoothingMs: number; onboardingCompleted: boolean }
export const inputPreferencesKey = 'dungeon-master.input-preferences.v1'
export const defaultInputPreferences: InputPreferencesV1 = {version:1,mode:'mouse',sensitivity:1,smoothingMs:80,onboardingCompleted:false}
export function parseInputPreferences(value: unknown): InputPreferencesV1 | null {
  if (!value || typeof value !== 'object') return null
  const p = value as Partial<InputPreferencesV1>
  if(p.version !== 1 || !['hands','mouse'].includes(p.mode ?? '') || typeof p.onboardingCompleted !== 'boolean' || !Number.isFinite(p.sensitivity) || p.sensitivity! < .5 || p.sensitivity! > 2 || !Number.isFinite(p.smoothingMs) || p.smoothingMs! < 0 || p.smoothingMs! > 200) return null
  return {version:1,mode:p.mode!,sensitivity:p.sensitivity!,smoothingMs:p.smoothingMs!,onboardingCompleted:p.onboardingCompleted}
}
export class InputPreferencesStore {
  private listeners = new Set<()=>void>()
  private snapshot: {preferences:InputPreferencesV1;persistence:'local'|'memory'}
  private storage: Pick<Storage,'getItem'|'setItem'> | null
  constructor(storage: Pick<Storage,'getItem'|'setItem'> | null = null) {
    this.storage=storage
    let preferences = {...defaultInputPreferences}, persistence:'local'|'memory' = storage ? 'local' : 'memory'
    try { const raw = storage?.getItem(inputPreferencesKey); if(raw) preferences = parseInputPreferences(JSON.parse(raw)) ?? preferences } catch { persistence = 'memory' }
    this.snapshot = {preferences,persistence}
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener:()=>void) => {this.listeners.add(listener);return ()=>{this.listeners.delete(listener)}}
  set(patch:Partial<InputPreferencesV1>) {
    const preferences = parseInputPreferences({...this.snapshot.preferences,...patch})
    if(!preferences) return
    let persistence = this.snapshot.persistence
    try { if(this.storage) {this.storage.setItem(inputPreferencesKey,JSON.stringify(preferences));persistence='local'} } catch {persistence='memory'}
    this.snapshot = {preferences,persistence};this.listeners.forEach(listener=>listener())
  }
  reset = () => this.set({sensitivity:1,smoothingMs:80})
}
function browserStorage() {try{return typeof localStorage === 'undefined' ? null : localStorage}catch{return null}}
export const inputPreferences = new InputPreferencesStore(browserStorage())
export const useInputPreferences = () => useSyncExternalStore(inputPreferences.subscribe,inputPreferences.getSnapshot,inputPreferences.getSnapshot)
