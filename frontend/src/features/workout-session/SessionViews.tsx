import { useTranslation } from '../../shared/uiLanguage'
import { GestureTarget } from '../gesture-navigation/GestureTarget'
import type { WorkoutSessionSnapshot } from './runner'
import './workoutSession.css'
export function RestView({snapshot,onNext,onStop}:{snapshot:WorkoutSessionSnapshot;onNext:()=>void;onStop:()=>void}) {
  const { translateUi } = useTranslation()

 return <section className="session-transition" aria-labelledby="rest-title"><small>{translateUi("ПОДХОД СОХРАНЁН")}</small><h1 id="rest-title">{translateUi("Отдых")}</h1><p role="timer" aria-live="off">{Math.ceil(snapshot.restRemainingMs/1000)}{translateUi(" с")}</p><p>{translateUi("Следующий подход начнётся с проверки позиции.")}</p><GestureTarget id="session-next-set" onSelect={onNext}>{translateUi("Начать следующий подход")}</GestureTarget><GestureTarget id="session-stop-rest" onSelect={onStop}>{translateUi("Завершить тренировку")}</GestureTarget></section>
}
export function NextExerciseView({snapshot,onNext,onStop}:{snapshot:WorkoutSessionSnapshot;onNext:()=>void;onStop:()=>void}) {
  const { translateUi } = useTranslation()

 return <section className="session-transition" aria-labelledby="next-title"><small>{snapshot.sets.length}{translateUi(" ПОДХОДОВ СОХРАНЕНО")}</small><h1 id="next-title">{translateUi("Следующее упражнение")}</h1><p>{translateUi("Перед новым движением снова проверим положение тела и камеру.")}</p><GestureTarget id="session-next-exercise" onSelect={onNext}>{translateUi("Продолжить")}</GestureTarget><GestureTarget id="session-stop-next" onSelect={onStop}>{translateUi("Завершить тренировку")}</GestureTarget></section>
}
