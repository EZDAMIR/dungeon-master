import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ files: vi.fn(), create: vi.fn(), recognize: vi.fn(), close: vi.fn() }))
vi.mock('@mediapipe/tasks-vision', () => ({ FilesetResolver: { forVisionTasks: mocks.files }, GestureRecognizer: { createFromOptions: mocks.create } }))
import { MediaPipeGestureRecognizer } from '../gestureRecognizer'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.files.mockResolvedValue({})
  mocks.create.mockResolvedValue({ recognizeForVideo: mocks.recognize, close: mocks.close })
})
it('initializes once, retries CPU once and normalizes provider output', async () => {
  mocks.create.mockRejectedValueOnce(new Error('GPU unsupported'))
  const adapter = new MediaPipeGestureRecognizer()
  await Promise.all([adapter.initialize(), adapter.initialize()])
  expect(mocks.files).toHaveBeenCalledOnce()
  expect(mocks.create).toHaveBeenNthCalledWith(2, {}, expect.objectContaining({ runningMode: 'VIDEO', numHands: 1, baseOptions: expect.objectContaining({ delegate: 'CPU' }) }))
  mocks.recognize.mockReturnValue({ landmarks: [Array.from({length:21}, () => ({ x:.5,y:.4,z:0 }))], gestures: [[{ categoryName: 'Thumb_Up', score: .9 }]], handedness: [[{ categoryName: 'Right' }]] })
  expect(adapter.recognize(document.createElement('video'), 120)).toMatchObject({ at:120, handedness:'Right',gesture:{ name:'Thumb_Up',confidence:.9 } })
  adapter.close(); adapter.close()
  expect(mocks.close).toHaveBeenCalledOnce()
  expect(adapter.recognize(document.createElement('video'), 200)).toBeNull()
})
it('closes a model that finishes loading after unmount', async () => {
  let resolve!: (value: unknown) => void
  mocks.create.mockReturnValue(new Promise(r => { resolve = r }))
  const adapter = new MediaPipeGestureRecognizer()
  const initializing = adapter.initialize()
  await Promise.resolve()
  adapter.close()
  resolve({ close: mocks.close })
  await initializing
  expect(mocks.close).toHaveBeenCalledOnce()
})
