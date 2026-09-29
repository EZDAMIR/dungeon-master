type Props = { onDone: () => void }

export function TutorialPage({ onDone }: Props) {
  return (
    <section>
      <h2>Gesture Tutorial</h2>
      <ul>
        <li>Move index finger → virtual cursor</li>
        <li>Thumb-index pinch → select</li>
        <li>Closed fist (held) → go back</li>
        <li>Thumb up (held) → confirm / start</li>
        <li>Raised hand during workout → pause / resume</li>
      </ul>
      <button onClick={onDone}>Got it — continue</button>
    </section>
  )
}
