import { expect, it, vi } from 'vitest'
import { GestureAudio } from '../gestureAudio'

it('gives swipes distinct local confirmation tones', () => {
  const audio = new GestureAudio(), tone = vi.spyOn(audio, 'tone').mockImplementation(() => {})
  audio.event({ type: 'gesture.swiped', at: 180, direction: 'up' })
  audio.event({ type: 'gesture.swiped', at: 1180, direction: 'down' })
  expect(tone.mock.calls).toEqual([[620], [440]])
  tone.mockRestore()
})
