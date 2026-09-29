import type { WorkoutResult } from '../app/modes'

type Props = {
  result: WorkoutResult
  onRestart: () => void
}

export function ResultsPage({ result, onRestart }: Props) {
  const { reps, errors } = result

  return (
    <section>
      <h2>Session results</h2>
      <table style={{ borderCollapse: 'collapse', marginBottom: '1rem' }}>
        <tbody>
          <tr>
            <th style={{ textAlign: 'left', paddingRight: '2rem' }}>Reps completed</th>
            <td style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{reps}</td>
          </tr>
          <tr>
            <th style={{ textAlign: 'left', paddingRight: '2rem' }}>Technique errors</th>
            <td style={{ fontSize: '1.4rem', color: errors > 0 ? '#c0392b' : '#27ae60' }}>{errors}</td>
          </tr>
        </tbody>
      </table>
      <button onClick={onRestart}>Restart</button>
    </section>
  )
}
