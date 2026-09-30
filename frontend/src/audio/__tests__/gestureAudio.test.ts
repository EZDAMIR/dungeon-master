import { expect, it, vi } from 'vitest'
import { GestureAudio } from '../gestureAudio'

it('gives scrolling distinct local tones without playing on every frame', () => {
  const audio = new GestureAudio(), tone = vi.spyOn(audio, 'tone').mockImplementation(() => {})
  audio.event({ type: 'gesture.scrolled', at: 180, deltaY: -.1 })
  for (const at of [230, 280, 330]) audio.event({ type: 'gesture.scrolled', at, deltaY: -.1 })
  audio.event({ type: 'gesture.scrolled', at: 1180, deltaY: .1 })
  expect(tone.mock.calls).toEqual([[620], [440]])
  tone.mockRestore()
})
