import { todayPlanLabel } from '../features/profile/planSchedule'
import type { TrainingPlan } from '../api/types'
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
export function MenuPage({selectedWorkoutId,onSelect,onConfirm,onBack,onProfile,onPlan,onProgress,plan,planMessage,onSelectPlan,timezone}:{selectedWorkoutId:string|null;onSelect:()=>void;onConfirm:()=>void;onBack:()=>void;onProfile:()=>void;onPlan:()=>void;onProgress:()=>void;plan:TrainingPlan|null;planMessage:string|null;onSelectPlan:()=>void;timezone:string}) {
  return <section className="menu-page">
    <h2>Выбери тренировку</h2>
    <p className="instruction">{selectedWorkoutId ? 'Покажи 👍 и удерживай, чтобы начать' : 'Наведи курсор на кнопку, затем соедини большой и указательный пальцы'}</p>
    <GestureTarget id="bodyweight-squat" selected={selectedWorkoutId==='bodyweight-squat'} onSelect={onSelect}>
      <strong>Bodyweight Squat</strong><span>Демонстрационный подход · 5 повторений</span>{selectedWorkoutId==='bodyweight-squat' && <span>✓ Выбрано</span>}
    </GestureTarget>
    {plan && <GestureTarget id="planned-squat" selected={selectedWorkoutId==='planned-squat'} onSelect={onSelectPlan}><strong>Bodyweight Squat</strong><span>По базовому плану · 1 × 5 · Контролируемый темп</span></GestureTarget>}
    <div className="menu-backend">
      <GestureTarget id="open-profile" onSelect={onProfile}>Профиль</GestureTarget>
      <GestureTarget id="open-plan" onSelect={onPlan}><strong>Сегодня · Базовый план</strong>{plan ? <span>{todayPlanLabel(plan,timezone)}</span> : <span>{planMessage ? 'Нет доступных упражнений для профиля' : 'План доступен при подключении'}</span>}</GestureTarget>
      <GestureTarget id="open-progress" onSelect={onProgress}>Прогресс</GestureTarget>
    </div>
    <p>✊ Сожми кулак и удерживай, чтобы вернуться к обучению.</p>
    <details className="fallback"><summary>Клавиатура / доступное управление</summary><button type="button" onClick={onBack}>Назад</button><button type="button" disabled={!selectedWorkoutId} onClick={onConfirm}>Подтвердить выбор</button></details>
  </section>
}
