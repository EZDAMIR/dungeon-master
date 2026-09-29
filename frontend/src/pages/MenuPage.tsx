type Props = { onSelect: () => void }

export function MenuPage({ onSelect }: Props) {
  return (
    <section>
      <h2>Select Workout</h2>
      <ul>
        <li>
          <button onClick={onSelect}>Bodyweight Squat — 3 sets × 10 reps</button>
        </li>
      </ul>
    </section>
  )
}
