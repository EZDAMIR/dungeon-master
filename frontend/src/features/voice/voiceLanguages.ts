import type { Language, Voice } from '../../api/release'
export type VoiceLanguageGroup = Language | 'multilingual' | 'unlabelled' | 'other'
const languages: Record<string, Language> = { ru: 'ru', rus: 'ru', russian: 'ru', русский: 'ru', kk: 'kk', kaz: 'kk', kazakh: 'kk', қазақша: 'kk', en: 'en', eng: 'en', english: 'en' }

// Native-language labels are separate from the selected language of speech.
export function voiceLanguageGroup(voice: Voice): VoiceLanguageGroup {
  const label = voice.labels.language ?? voice.labels.languages ?? voice.labels.locale
  if (!label?.trim()) return 'unlabelled'
  if (/multi/i.test(label)) return 'multilingual'
  const parts = label.toLowerCase().split(/[,;/|]/).map(value => value.trim()).filter(Boolean)
  if (new Set(parts).size > 1) return 'multilingual'
  const codes = parts.map(value => {
    const normalized = value.trim().replace('_', '-').split('-')[0]
    return languages[normalized]
  }).filter(Boolean)
  const unique = new Set(codes)
  return unique.size > 1 ? 'multilingual' : codes[0] ?? 'other'
}
export function groupVoices(voices: Voice[], selected: Language, showAll: boolean) {
  const order: VoiceLanguageGroup[] = [selected, ...(['ru', 'kk', 'en'] as const).filter(language => language !== selected), 'multilingual', 'unlabelled', 'other']
  const groups = new Map<string, { key: string; language: VoiceLanguageGroup; label?: string; voices: Voice[] }>()
  for (const voice of voices) {
    const language = voiceLanguageGroup(voice)
    const label = language === 'other' ? (voice.labels.language ?? voice.labels.languages ?? voice.labels.locale).trim() : undefined
    const key = label ? `other:${label.toLowerCase()}` : language
    const group = groups.get(key) ?? { key, language, label, voices: [] }
    group.voices.push(voice); groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => order.indexOf(a.language) - order.indexOf(b.language))
    .filter(group => group.voices.length && (showAll || group.language === selected || group.language === 'multilingual' || group.language === 'unlabelled'))
}
