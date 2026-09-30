import { useTranslation } from '../shared/uiLanguage'
import type { WorkoutView } from '../app/modes'
import { readinessMessages } from '../vision/feedback/errorPolicy'
import { squatConfig } from '../vision/exercises/squat/config'
import type { TechniqueErrorCode } from '../types/vision'
import { WorkoutFeedbackBanner } from '../features/workout/WorkoutFeedbackBanner'
const corrections:Record<TechniqueErrorCode,string>={depth_insufficient:'Опустись немного ниже',too_fast:'Медленнее вниз, контролируй движение',incomplete_extension:'Заверши подъём'}
const labels={not_ready:'Вернись в исходное положение',standing:'Исходное положение',descending:'Опускание',bottom:'Нижняя точка',ascending:'Подъём'}
export function WorkoutPage({view,paused,onPause,onResume}:{view:WorkoutView;paused:boolean;onPause:()=>void;onResume:()=>void}){
  const { translateUi } = useTranslation()

 const accepted=view.reps.filter(r=>r.accepted).length,last=view.reps.at(-1)
 const recovery=!view.tracked ? readinessMessages.tracking_lost : view.issue ? readinessMessages[view.issue] : !view.ready ? 'Вернись в исходное положение и стой спокойно' : null
 return <section><h2>{translateUi(paused ? 'Тренировка на паузе' : 'Bodyweight Squat')}</h2>
  <p className="rep-counter" key={view.reps.length}>{view.reps.length} / {squatConfig.targetReps}</p>
  <p>{translateUi("Корректных повторений: ")}<strong>{accepted}</strong>{translateUi(" · С ошибками: ")}{view.reps.length-accepted}</p>
  <progress max={squatConfig.targetReps} value={view.reps.length} aria-label={translateUi("Прогресс подхода")} />
  <p className="instruction">{translateUi(labels[view.phase])}</p>
  {view.activeSide && <p>{translateUi("Анализируется ")}{translateUi(view.activeSide==='left' ? 'левая' : 'правая')}{translateUi(" сторона")}</p>}
  <WorkoutFeedbackBanner feedback={{message:recovery ?? (view.feedback ? corrections[view.feedback.code] : null) ?? (view.positive ? 'Хорошее повторение' : 'Контролируй движение'),kind:recovery ? 'error' : view.feedback ? view.feedback.code==='depth_insufficient' ? 'hint' : 'warning' : 'positive'}} />
  {!recovery && last && !last.accepted && <small>{translateUi("Минимальный угол колена: ")}{Math.round(last.metrics.minKneeAngle)}{translateUi("° · Время: ")}{translateUi((last.metrics.totalDurationMs/1000).toFixed(1))}{translateUi(" с")}</small>}
  <p>{translateUi("В исходном положении подними обе руки выше головы и удерживай. Опусти руки перед следующим жестом.")}</p>
  <button type="button" onClick={paused ? onResume : onPause}>{translateUi(paused ? 'Продолжить' : 'Пауза')}</button>
 </section>
}
