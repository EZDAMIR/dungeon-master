import type { WorkoutView } from '../app/modes'
import { readinessMessages } from '../vision/feedback/errorPolicy'
export function CalibrationPage({onBack,view}:{onBack:()=>void;view:WorkoutView}) {
 return <section><h2>Калибровка · Bodyweight Squat</h2><p className="instruction">Встань боком к камере. Голова и стопы должны полностью помещаться в кадр.</p>
  <ol className="readiness-gates"><li>Всё тело видно</li><li>Боковой ракурс</li><li>Спокойное исходное положение</li></ol>
  <progress max={1} value={view.progress} aria-label="Прогресс калибровки" />
  <p role="status">{view.issue ? readinessMessages[view.issue] : view.progress>=2/3 ? 'Стой спокойно, собираем исходное положение' : 'Проверяем положение тела и камеры…'}</p>
  {view.activeSide && <p>Анализируется {view.activeSide==='left' ? 'левая' : 'правая'} сторона</p>}
  <button type="button" onClick={onBack}>Назад в меню</button>
 </section>
}
