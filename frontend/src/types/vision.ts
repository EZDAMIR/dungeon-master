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

export type VisionEvent =
  | { type: 'camera.ready'; at: number }
  | { type: 'camera.denied'; at: number; reason: string }
  | { type: 'tracking.lost'; at: number; target: 'hand' | 'body' }
  | { type: 'cursor.moved'; at: number; x: number; y: number }
  | { type: 'gesture.confirmed'; at: number; command: 'select' | 'back' | 'confirm' | 'pause'; targetId?: string }
  | { type: 'workout.rep_completed'; at: number; repIndex: number; accepted: boolean; metrics: RepMetrics }
  | { type: 'workout.technique_error'; at: number; code: TechniqueErrorCode; correction: string; severity: 'hint' | 'warning' }
