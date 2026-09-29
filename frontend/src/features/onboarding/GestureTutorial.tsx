import { useGestureSnapshot } from '../gesture-navigation/gestureNavigation'
import { GestureTarget } from '../gesture-navigation/GestureTarget'
import { tutorialSteps, tutorialTargetId } from './tutorialMachine'
import { HoldProgress } from '../../shared/components/HoldProgress'
export function GestureTutorial({onDone}:{onDone:()=>void}) {
  const s = useGestureSnapshot()
  const step = s.tutorial.step
  const instruction = tutorialSteps[Math.min(step,4)]
  return <section className="tutorial" aria-label="Интерактивное обучение жестам">
    <p>Шаг {Math.min(step+1,5)}/5</p>
    <div className="step-success" key={step} role="status">{step > 0 ? '✓ Предыдущий шаг выполнен' : 'Начнём с ладони'}</div>
    <div className="gesture-example" aria-hidden="true">{instruction.visual}</div>
    <h2>{instruction.name}</h2><p className="instruction">{instruction.instruction}</p>
    {(step===1 || step===2) && <GestureTarget id={tutorialTargetId}><strong>{step===1 ? 'Наведи курсор сюда' : 'Выбери эту область щипком'}</strong></GestureTarget>}
    <p role="status">{s.hand ? 'Рука найдена' : 'Рука не видна. Подними ладонь и держи её в центре камеры'}</p>
    <HoldProgress progress={step===0 ? s.handProgress : s.progress} />
    <details className="fallback"><summary>Доступный способ управления</summary><button type="button" onClick={onDone}>Продолжить без проверки жестов</button></details>
  </section>
}
