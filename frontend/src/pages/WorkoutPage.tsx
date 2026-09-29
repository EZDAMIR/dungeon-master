import { useState } from 'react'
import type { WorkoutResult } from '../app/modes'
import type { VisionEvent } from '../types/vision'

type Props = { onDone: (result: WorkoutResult) => void }

const FAKE_REP_METRICS = { depth: 0.72, duration_ms: 1_400, tempo: 'ok' as const, confidence: 0.91 }

const FAKE_ERRORS: Array<Pick<VisionEvent & { type: 'workout.technique_error' }, 'code' | 'correction' | 'severity'>> = [
  { code: 'knee_over_toe', correction: 'Keep knees behind your toes', severity: 'warning' },
  { code: 'depth_insufficient', correction: 'Squat deeper — aim for parallel thighs', severity: 'hint' },
  { code: 'back_round', correction: 'Keep your chest up and back straight', severity: 'warning' },
]

function applyRepEvent(
  event: VisionEvent & { type: 'workout.rep_completed' },
  setReps: React.Dispatch<React.SetStateAction<number>>,
) {
  if (event.accepted) setReps((r) => r + 1)
}

function applyErrorEvent(
  event: VisionEvent & { type: 'workout.technique_error' },
  setErrors: React.Dispatch<React.SetStateAction<number>>,
  setLastCorrection: React.Dispatch<React.SetStateAction<string | null>>,
) {
  setErrors((e) => e + 1)
  setLastCorrection(`[${event.severity.toUpperCase()}] ${event.correction}`)
}

export function WorkoutPage({ onDone }: Props) {
  const [reps, setReps] = useState(0)
  const [errors, setErrors] = useState(0)
  const [lastCorrection, setLastCorrection] = useState<string | null>(null)
  const [errorIndex, setErrorIndex] = useState(0)

  function handleFakeRep() {
    const event: VisionEvent & { type: 'workout.rep_completed' } = {
      type: 'workout.rep_completed',
      at: 0,
      repIndex: reps,
      accepted: true,
      metrics: FAKE_REP_METRICS,
    }
    applyRepEvent(event, setReps)
  }

  function handleFakeError() {
    const template = FAKE_ERRORS[errorIndex % FAKE_ERRORS.length]
    const event: VisionEvent & { type: 'workout.technique_error' } = {
      type: 'workout.technique_error',
      at: 0,
      ...template,
    }
    applyErrorEvent(event, setErrors, setLastCorrection)
    setErrorIndex((i) => i + 1)
  }

  return (
    <section>
      <h2>Workout in progress</h2>
      <p style={{ fontSize: '1.5rem' }}>Reps: <strong>{reps}</strong></p>
      {lastCorrection && (
        <p style={{ color: '#c0392b', background: '#fdecea', padding: '0.4rem 0.8rem', borderRadius: 4 }}>
          {lastCorrection}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={handleFakeRep}>+ Fake rep</button>
        <button onClick={handleFakeError}>+ Fake error</button>
        <button
          style={{ marginLeft: 'auto', background: '#27ae60', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: 4, cursor: 'pointer' }}
          onClick={() => onDone({ reps, errors })}
        >
          Finish workout
        </button>
      </div>
    </section>
  )
}
