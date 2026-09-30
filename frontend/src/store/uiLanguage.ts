import { useSyncExternalStore } from 'react'
import type { UiLanguage } from '../shared/uiLanguage'
export const languageStorageKey = 'dungeon-master.ui-language'
const listeners = new Set<() => void>()
let current: UiLanguage | undefined

function isLanguage(value: unknown): value is UiLanguage {
  return value === 'ru' || value === 'kk' || value === 'en'
}

export function getUiLanguage(): UiLanguage {
  if (current) return current
  try {
    const saved = localStorage.getItem(languageStorageKey)
    if (isLanguage(saved)) current = saved
  } catch { /* An unavailable storage does not prevent language selection. */ }
  current ??= 'ru'
  return current
}

export function setUiLanguage(language: UiLanguage) {
  current = language
  try { localStorage.setItem(languageStorageKey, language) } catch { /* Keep the choice in memory. */ }
  document.documentElement.lang = language
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  // A storage event is sent only to other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== languageStorageKey) return
    current = isLanguage(event.newValue) ? event.newValue : 'ru'
    document.documentElement.lang = current
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}

export function useStoredUiLanguage() {
  return useSyncExternalStore(subscribe, getUiLanguage, () => 'ru' as const)
}

