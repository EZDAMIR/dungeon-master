import { useEffect, useMemo, type ReactNode } from 'react'
import { UiLanguageContext } from '../shared/uiLanguage'
import { setUiLanguage, useStoredUiLanguage } from '../store/uiLanguage'

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const language = useStoredUiLanguage()
  useEffect(() => { document.documentElement.lang = language }, [language])
  const value = useMemo(() => ({ language, setLanguage: setUiLanguage }), [language])
  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>
}
