export type RepMetrics = {
  depth: number
  duration_ms: number
  tempo: 'slow' | 'ok' | 'fast'
  confidence: number
}

export type TechniqueErrorCode =
  | 'knee_over_toe'
  | 'back_round'
  | 'asymmetric_feet'
  | 'depth_insufficient'

export type GestureCommand = 'select' | 'back' | 'confirm'
export type CameraErrorCode = 'unsupported' | 'insecure_context' | 'not_allowed' | 'not_found' | 'not_readable' | 'model_load_failed' | 'unknown'

export type VisionEvent =
  | { type: 'camera.loading'; at: number }
  | { type: 'camera.ready'; at: number }
  | { type: 'camera.denied'; at: number; reason: string }
  | { type: 'camera.error'; at: number; code: CameraErrorCode; message: string }
  | { type: 'tracking.acquired'; at: number; target: 'hand' }
  | { type: 'tracking.lost'; at: number; target: 'hand' | 'body' }
  | { type: 'cursor.moved'; at: number; x: number; y: number }
  | { type: 'focus.changed'; at: number; targetId: string | null }
  | { type: 'gesture.candidate'; at: number; command: GestureCommand; progress: number; confidence?: number }
  | { type: 'gesture.cancelled'; at: number; command: GestureCommand }
  | { type: 'gesture.confirmed'; at: number; command: 'select' | 'back' | 'confirm' | 'pause'; targetId?: string }
  | { type: 'workout.rep_completed'; at: number; repIndex: number; accepted: boolean; metrics: RepMetrics }
  | { type: 'workout.technique_error'; at: number; code: TechniqueErrorCode; correction: string; severity: 'hint' | 'warning' }
