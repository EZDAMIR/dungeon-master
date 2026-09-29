export type HandLandmark = { x: number; y: number; z: number }
export type HandRecognitionSample = {
  at: number
  landmarks: readonly HandLandmark[]
  gesture: { name: string; confidence: number } | null
  handedness: 'Left' | 'Right' | null
}
export interface GestureRecognizerAdapter {
  initialize(): Promise<void>
  recognize(video: HTMLVideoElement, timestampMs: number): HandRecognitionSample | null
  close(): void
}
