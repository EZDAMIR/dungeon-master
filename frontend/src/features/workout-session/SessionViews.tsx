import { GestureTarget } from '../gesture-navigation/GestureTarget'
import type { WorkoutSessionSnapshot } from './runner'
import './workoutSession.css'
export function RestView({snapshot,onNext,onStop}:{snapshot:WorkoutSessionSnapshot;onNext:()=>void;onStop:()=>void}) {
 return <section className="session-transition" aria-labelledby="rest-title"><small>ПОДХОД СОХРАНЁН</small><h1 id="rest-title">Отдых</h1><p role="timer" aria-live="off">{Math.ceil(snapshot.restRemainingMs/1000)} с</p><p>Следующий подход начнётся с проверки позиции.</p><GestureTarget id="session-next-set" onSelect={onNext}>Начать следующий подход</GestureTarget><GestureTarget id="session-stop-rest" onSelect={onStop}>Завершить тренировку</GestureTarget></section>
}
export function NextExerciseView({snapshot,onNext,onStop}:{snapshot:WorkoutSessionSnapshot;onNext:()=>void;onStop:()=>void}) {
 return <section className="session-transition" aria-labelledby="next-title"><small>{snapshot.sets.length} ПОДХОДОВ СОХРАНЕНО</small><h1 id="next-title">Следующее упражнение</h1><p>Перед новым движением снова проверим положение тела и камеру.</p><GestureTarget id="session-next-exercise" onSelect={onNext}>Продолжить</GestureTarget><GestureTarget id="session-stop-next" onSelect={onStop}>Завершить тренировку</GestureTarget></section>
}
