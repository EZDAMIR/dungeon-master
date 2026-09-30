import { useTranslation } from '../uiLanguage'
export function HoldProgress({progress}:{progress:number}) {
  const { translateUi } = useTranslation()

  return <progress aria-label={translateUi("Прогресс удержания жеста")} max={1} value={progress} />
}
