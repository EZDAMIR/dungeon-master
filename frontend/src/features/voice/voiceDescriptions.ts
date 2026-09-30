import type { Voice } from '../../api/release'
import type { UiLanguage } from '../../shared/uiLanguage'

type Copy = readonly [string, string, string]
type Trait = { pattern: RegExp; copy: Copy }

// Summarize declared provider characteristics. Never display the raw marketing
// paragraph or infer a voice's sound from its ID, native language or use case.
const textures: Trait[] = [
  { pattern: /\b(bass|baritone|deep|low[- ]pitched)\b|низк|басов|баритон|төмен тембр/i, copy: ['Низкий, насыщенный тембр.', 'Төмен, қанық тембр.', 'A deep, full tone.'] },
  { pattern: /\b(velvet\w*|smooth|silky)\b|бархат|шелков|жібектей/i, copy: ['Бархатистый, мягкий тембр.', 'Барқыттай жұмсақ тембр.', 'A smooth, velvety tone.'] },
  { pattern: /\b(husky|raspy|gravelly|gritty)\b|хрип|қарлық/i, copy: ['Тембр с лёгкой хрипотцой.', 'Сәл қарлығыңқы тембр.', 'A textured, slightly husky tone.'] },
  { pattern: /\b(resonant|resonance)\b|резонанс|звонк|сыңғыр/i, copy: ['Звучный, выразительный тембр.', 'Үні анық, мәнерлі тембр.', 'A resonant, expressive tone.'] },
  { pattern: /\b(high[- ]pitched|bright|light|airy)\b|светл|воздуш|жарқын|әуезді/i, copy: ['Лёгкий, светлый тембр.', 'Жеңіл, жарқын тембр.', 'A light, bright tone.'] },
  { pattern: /\b(soft|gentle|mellow)\b|мягк|нежн|жұмсақ/i, copy: ['Мягкий, нежный тембр.', 'Жұмсақ, нәзік тембр.', 'A soft, gentle tone.'] },
]
const deliveries: Trait[] = [
  { pattern: /\b(energetic|excited|enthusiastic|upbeat|animated|cheerful)\b|энергич|бодр|көңілді|жігерлі/i, copy: ['Бодрая, энергичная подача.', 'Сергек, жігерлі сөйлеу мәнері.', 'An upbeat, energetic delivery.'] },
  { pattern: /\b(calm\w*|relaxed|laid[- ]back|easygoing|measured|patient|balanced)\b|спокойн|размеренн|байсалды|сабырлы/i, copy: ['Спокойная, размеренная речь.', 'Байсалды, асықпай сөйлеу мәнері.', 'A calm, measured delivery.'] },
  { pattern: /\b(warm\w*|comforting|reassuring|friendly)\b|тёпл|тепл|дружелюб|жылы/i, copy: ['Тёплая, дружелюбная подача.', 'Жылы, достық сөйлеу мәнері.', 'A warm, friendly delivery.'] },
  { pattern: /\b(firm|assertive|authoritative|commanding|confident|steady)\b|уверенн|твёрд|тверд|сенімді/i, copy: ['Уверенная подача с выразительными акцентами.', 'Сенімді, мәнерлі сөйлеу мәнері.', 'A confident delivery with expressive emphasis.'] },
  { pattern: /\b(clear|crisp|articulate|precise)\b|чётк|четк|дикци|анық/i, copy: ['Чёткая дикция и понятные акценты.', 'Анық дикция, айқын екпін.', 'Clear diction and distinct emphasis.'] },
]
const genders: Trait[] = [
  { pattern: /^(female|woman|feminine)$/i, copy: ['Женский голос.', 'Әйел дауысы.', 'A female voice.'] },
  { pattern: /^(male|man|masculine)$/i, copy: ['Мужской голос.', 'Ер дауысы.', 'A male voice.'] },
  { pattern: /^(neutral|non[-_ ]?binary|gender[-_ ]?neutral)$/i, copy: ['Гендерно-нейтральный голос.', 'Гендерлік бейтарап дауыс.', 'A gender-neutral voice.'] },
]
const fallback: Copy = ['Послушай пример, чтобы оценить тембр и подачу.', 'Тембрі мен сөйлеу мәнерін бағалау үшін үлгіні тыңда.', 'Listen to a sample to hear the tone and delivery.']

function trait(source: string, choices: Trait[]) {
  return choices.find(value => value.pattern.test(source))?.copy
}

export function voiceDescription(voice: Voice, language: UiLanguage): string {
  const position = language === 'ru' ? 0 : language === 'kk' ? 1 : 2
  const labels = Object.entries(voice.labels)
    .filter(([key]) => /^(descriptive|tone|pitch|style|delivery|texture)$/i.test(key))
    .map(([, value]) => value).join(' ')
  const description = voice.description ?? ''
  // Structured labels take precedence over free text when both describe a trait.
  const texture = trait(labels, textures) ?? trait(description, textures)
  const delivery = trait(labels, deliveries) ?? trait(description, deliveries)
  const gender = trait(voice.labels.gender ?? '', genders)
  const characteristics = [texture, delivery].filter((copy): copy is Copy => Boolean(copy))
  if (!characteristics.length) characteristics.push(...(gender ? [gender, fallback] : [fallback]))
  return characteristics.map(copy => copy[position]).join(' ')
}
