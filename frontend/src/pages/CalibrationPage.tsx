import { useTranslation } from '../shared/uiLanguage'
import type { WorkoutView } from '../app/modes'
import { readinessMessages } from '../vision/feedback/errorPolicy'
export function CalibrationPage({onBack,view}:{onBack:()=>void;view:WorkoutView}) {
  const { translateUi } = useTranslation()

 return <section><h2>{translateUi("Калибровка · Bodyweight Squat")}</h2><p className="instruction">{translateUi("Встань боком к камере. Голова и стопы должны полностью помещаться в кадр.")}</p>
  <ol className="readiness-gates"><li>{translateUi("Всё тело видно")}</li><li>{translateUi("Боковой ракурс")}</li><li>{translateUi("Спокойное исходное положение")}</li></ol>
  <progress max={1} value={view.progress} aria-label={translateUi("Прогресс калибровки")} />
  <p role="status">{translateUi(view.issue ? readinessMessages[view.issue] : view.progress>=2/3 ? 'Стой спокойно, собираем исходное положение' : 'Проверяем положение тела и камеры…')}</p>
  {view.activeSide && <p>{translateUi("Анализируется ")}{translateUi(view.activeSide==='left' ? 'левая' : 'правая')}{translateUi(" сторона")}</p>}
  <button type="button" onClick={onBack}>{translateUi("Назад в меню")}</button>
 </section>
}
