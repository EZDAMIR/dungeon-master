type Props = { onDone: () => void }

export function CalibrationPage({ onDone }: Props) {
  return (
    <section>
      <h2>Camera Calibration</h2>
      <p>Stand 2–3 m from the camera so your full body is visible from the side.</p>
      <p style={{ color: '#888' }}>[Camera feed placeholder — Sprint 1]</p>
      <button onClick={onDone}>Position looks good</button>
    </section>
  )
}
