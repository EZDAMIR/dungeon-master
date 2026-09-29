import { describe, expect, it, vi } from 'vitest'
import { CameraManager } from '../camera'
import type { VisionEvent } from '../../../types/vision'

function setup(error?: string) {
  const track = new EventTarget() as MediaStreamTrack
  track.stop = vi.fn()
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream
  const getUserMedia = vi.fn(() => error ? Promise.reject(new DOMException('', error)) : Promise.resolve(stream))
  const video = document.createElement('video')
  video.play = vi.fn().mockResolvedValue(undefined)
  const events: VisionEvent[] = []
  const camera = new CameraManager(video, e => events.push(e), { secure: true, getUserMedia })
  return { track, getUserMedia, video, events, camera }
}

describe('camera lifecycle', () => {
  it('plays video before ready, never requests audio, stops all tracks', async () => {
    const s = setup()
    await s.camera.start()
    await s.camera.start()
    expect(s.getUserMedia).toHaveBeenCalledTimes(1)
    expect(s.getUserMedia).toHaveBeenCalledWith({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
    expect(s.video.play).toHaveBeenCalledOnce()
    expect(s.video.muted && s.video.playsInline).toBe(true)
    expect(s.events.at(-1)?.type).toBe('camera.ready')
    s.camera.dispose()
    expect(s.track.stop).toHaveBeenCalledOnce()
    expect(s.video.srcObject).toBeNull()
    s.track.dispatchEvent(new Event('ended'))
    expect(s.events.at(-1)?.type).toBe('camera.ready')
  })
  it.each([['NotAllowedError','not_allowed'], ['NotFoundError','not_found'], ['NotReadableError','not_readable'], ['AbortError','unknown'], ['Other','unknown']])('maps %s', async (error, code) => {
    const s = setup(error)
    await s.camera.start()
    expect(s.events.at(-1)).toMatchObject({ type: 'camera.error', code })
  })
  it.each([[false, 'insecure_context'], [true, 'unsupported']])('checks browser capability', async (secure, code) => {
    const events: VisionEvent[] = []
    await new CameraManager(document.createElement('video'), e => events.push(e), { secure }).start()
    expect(events.at(-1)).toMatchObject({ code })
  })
  it('reports track ended and cleans up', async () => {
    const s = setup()
    await s.camera.start()
    s.track.dispatchEvent(new Event('ended'))
    expect(s.events.at(-1)).toMatchObject({ type: 'camera.error', code: 'not_readable' })
    expect(s.video.srcObject).toBeNull()
  })
  it('stops a stream that arrives after disposal', async () => {
    const s = setup()
    const pending = s.camera.start()
    s.camera.dispose()
    await pending
    expect(s.track.stop).toHaveBeenCalledOnce()
    expect(s.events.some(e => e.type === 'camera.ready')).toBe(false)
  })
})
