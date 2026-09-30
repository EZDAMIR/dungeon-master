import { useEffect, useState } from 'react'

export type WorkoutFeedback = { message: string; kind: 'positive' | 'hint' | 'warning' | 'error' }

// Presentation timing only; exercise feedback policy remains in the vision engine.
export function WorkoutFeedbackBanner({ feedback }: { feedback: WorkoutFeedback }) {
  const [previous, setPrevious] = useState(feedback)
  const [held, setHeld] = useState<WorkoutFeedback | null>(feedback.kind === 'positive' ? null : feedback)
  if (previous.message !== feedback.message || previous.kind !== feedback.kind) {
    setPrevious(feedback)
    if (feedback.kind !== 'positive') setHeld(feedback)
  }
  useEffect(() => {
    if (!held) return
    const timer = setTimeout(() => setHeld(null), held.kind === 'error' ? 2500 : 3500)
    return () => clearTimeout(timer)
  }, [held])
  const shown = feedback.kind === 'error' ? feedback : held ?? feedback
  return <div className={`workout-feedback-banner feedback-${shown.kind}`} role="status" aria-live="polite" aria-atomic="true">
    {shown.message}
  </div>
}
