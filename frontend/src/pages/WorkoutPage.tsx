import type { WorkoutView } from '../app/modes'
import { readinessMessages } from '../vision/feedback/errorPolicy'
import { squatConfig } from '../vision/exercises/squat/config'
const labels={not_ready:'Вернись в исходное положение',standing:'Исходное положение',descending:'Опускание',bottom:'Нижняя точка',ascending:'Подъём'}
export function WorkoutPage({view,paused,onPause,onResume}:{view:WorkoutView;paused:boolean;onPause:()=>void;onResume:()=>void}){
 const accepted=view.reps.filter(r=>r.accepted).length,last=view.reps.at(-1)
 const recovery=!view.tracked ? readinessMessages.tracking_lost : view.issue ? readinessMessages[view.issue] : !view.ready ? 'Вернись в исходное положение и стой спокойно' : null
 return <section><h2>{paused ? 'Тренировка на паузе' : 'Bodyweight Squat'}</h2>
  <p className="rep-counter" key={view.reps.length}>{view.reps.length} / {squatConfig.targetReps}</p>
  <p>Корректных повторений: <strong>{accepted}</strong> · С ошибками: {view.reps.length-accepted}</p>
  <progress max={squatConfig.targetReps} value={view.reps.length} aria-label="Прогресс подхода" />
  <p className="instruction">{labels[view.phase]}</p>
  {view.activeSide && <p>Анализируется {view.activeSide==='left' ? 'левая' : 'правая'} сторона</p>}
  <div className={`feedback-card ${recovery || view.feedback ? 'correction' : ''}`} role="status" aria-live="polite">
   {recovery ?? view.feedback?.message ?? (view.positive ? 'Хорошее повторение' : 'Контролируй движение')}
   {!recovery && view.feedback && <small className="error-badge">{view.feedback.code}</small>}
   {!recovery && last && !last.accepted && <small>Минимальный угол колена: {Math.round(last.metrics.minKneeAngle)}° · Время: {(last.metrics.totalDurationMs/1000).toFixed(1)} с</small>}
  </div>
  <p>В исходном положении подними обе руки выше головы и удерживай. Опусти руки перед следующим жестом.</p>
  <button type="button" onClick={paused ? onResume : onPause}>{paused ? 'Продолжить' : 'Пауза'}</button>
 </section>
}
