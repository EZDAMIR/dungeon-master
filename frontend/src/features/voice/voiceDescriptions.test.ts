import { expect, it } from 'vitest'
import type { Voice } from '../../api/release'
import { voiceDescription } from './voiceDescriptions'

const voice: Voice = { voice_id: 'example', name: 'Example', labels: {}, description: null }

it('turns provider descriptions into concise coaching copy without marketing content', () => {
  const source = { ...voice, description: 'A very deep, thunderous bass voice. Energetic and crisp. Perfect for dramatic wrestling commercials.' }
  expect(voiceDescription(source, 'ru')).toBe('Низкий, насыщенный тембр. Бодрая, энергичная подача.')
  expect(voiceDescription(source, 'kk')).toBe('Төмен, қанық тембр. Сергек, жігерлі сөйлеу мәнері.')
  expect(voiceDescription(source, 'en')).toBe('A deep, full tone. An upbeat, energetic delivery.')
})

it('uses declared labels before description and ignores unrelated provider fields', () => {
  const source = { ...voice, description: 'Bright and energetic.', labels: { descriptive: 'calm', pitch: 'deep', gender: 'female', use_case: 'excited gaming' } }
  expect(voiceDescription(source, 'en')).toBe('A deep, full tone. A calm, measured delivery.')
  expect(voiceDescription({ ...voice, labels: { language: 'Russian', use_case: 'deep narration' } }, 'en')).not.toContain('deep')
})

it('does not invent acoustic traits for missing or invalid provider descriptions', () => {
  const source = { ...voice, description: '112321312312312434231523521', labels: { gender: 'female' } }
  expect(voiceDescription(source, 'ru')).toBe('Женский голос. Послушай пример, чтобы оценить тембр и подачу.')
  expect(voiceDescription(voice, 'en')).toBe('Listen to a sample to hear the tone and delivery.')
  expect(voiceDescription({ ...voice, description: 'Kazakh Womannnnnnnnnnnnnn' }, 'kk')).toBe('Тембрі мен сөйлеу мәнерін бағалау үшін үлгіні тыңда.')
})
