export function HoldProgress({progress}:{progress:number}) {
  return <progress aria-label="Прогресс удержания жеста" max={1} value={progress} />
}
