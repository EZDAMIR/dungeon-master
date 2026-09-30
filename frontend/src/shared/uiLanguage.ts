import { createContext, useContext, useMemo } from 'react'
import { russianCopy, statusTranslations, translations } from './translations'

export type UiLanguage = 'ru' | 'kk' | 'en'
export const languageLocales: Record<UiLanguage, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }
const index = new Map<string, readonly [string, string, string]>()
const templates: { pattern: RegExp; row: readonly [string, string, string] }[] = []
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
for (const sourceRow of translations) {
  const row: readonly [string, string, string] = [russianCopy[sourceRow[0]] ?? sourceRow[0], sourceRow[1], sourceRow[2]]
  for (const text of new Set([...sourceRow, ...row])) {
    const key = normalize(text)
    // Retain the first alias so established product copy is authoritative.
    if (!index.has(key)) index.set(key, row)
    if (/\{\d+\}/.test(key)) {
      const parts = key.split(/(\{\d+\})/)
      const captures: number[] = []
      const pattern = parts.map(part => {
        if (!/^\{\d+\}$/.test(part)) return escapePattern(part)
        captures.push(Number(part.slice(1, -1)))
        return key === '{0} с' || key === '{0} s' ? '(\\d+(?:[.,]\\d+)?)' : '(.+?)'
      }).join('')
      // Capture values by their placeholder index, regardless of word order.
      const reindex = (value: string) => value.replace(/\{(\d+)\}/g, (_, id) => `{${captures.indexOf(Number(id))}}`)
      const canonical: readonly [string, string, string] = [reindex(row[0]), reindex(row[1]), reindex(row[2])]
      templates.push({ pattern: new RegExp(`^${pattern}$`), row: canonical })
    }
  }
}

/** Translate presentation strings only; numbers, elements and state retain identity. */
export function translateUi<T>(value: T, language: UiLanguage = 'ru'): T {
  if (typeof value !== 'string' || !value.trim()) return value
  const key = normalize(value)
  // Language choices always use their native names.
  if (key === 'Русский' || key === 'Қазақша' || key === 'English') return value
  const position = language === 'ru' ? 0 : language === 'kk' ? 1 : 2
  const row = index.get(key) ?? statusTranslations[key]
  let translated = row?.[position]
  if (!translated) {
    for (const template of templates) {
      const match = key.match(template.pattern)
      if (!match) continue
      translated = template.row[position].replace(/\{(\d+)\}/g, (_, id) => String(translateUi(match[Number(id) + 1], language)))
      break
    }
  }
  if (!translated) return value
  return (value.match(/^\s*/)?.[0] + translated + value.match(/\s*$/)?.[0]) as T
}

export function translateUiList(values: readonly string[], language: UiLanguage = 'ru') {
  return values.map(value => translateUi(value, language)).join(', ')
}

export const UiLanguageContext = createContext<{ language: UiLanguage; setLanguage(language: UiLanguage): void }>({ language: 'ru', setLanguage: () => {} })

export function useTranslation() {
  const { language, setLanguage } = useContext(UiLanguageContext)
  return useMemo(() => ({
    language, setLanguage,
    translateUi: <T,>(value: T) => translateUi(value, language),
    translateUiList: (values: readonly string[]) => translateUiList(values, language),
  }), [language, setLanguage])
}
