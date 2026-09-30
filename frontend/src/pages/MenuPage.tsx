import { useTranslation } from '../shared/uiLanguage'
import { todayPlanLabel } from '../features/profile/planSchedule'
import type { TrainingPlan } from '../api/types'
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
export function MenuPage({selectedWorkoutId,onSelect,onConfirm,onBack,onProfile,onPlan,onProgress,plan,planMessage,onSelectPlan,timezone}:{selectedWorkoutId:string|null;onSelect:()=>void;onConfirm:()=>void;onBack:()=>void;onProfile:()=>void;onPlan:()=>void;onProgress:()=>void;plan:TrainingPlan|null;planMessage:string|null;onSelectPlan:()=>void;timezone:string}) {
  const { translateUi } = useTranslation()

  return <section className="menu-page">
    <h2>{translateUi("Выбери тренировку")}</h2>
    <p className="instruction">{translateUi(selectedWorkoutId ? 'Покажи 👍 и удерживай, чтобы начать' : 'Наведи курсор на кнопку, затем соедини большой и указательный пальцы')}</p>
    <GestureTarget id="bodyweight-squat" selected={selectedWorkoutId==='bodyweight-squat'} onSelect={onSelect}>
      <strong>{translateUi("Bodyweight Squat")}</strong><span>{translateUi("Демонстрационный подход · 5 повторений")}</span>{selectedWorkoutId==='bodyweight-squat' && <span>{translateUi("✓ Выбрано")}</span>}
    </GestureTarget>
    {plan && <GestureTarget id="planned-squat" selected={selectedWorkoutId==='planned-squat'} onSelect={onSelectPlan}><strong>{translateUi("Bodyweight Squat")}</strong><span>{translateUi("По базовому плану · 1 × 5 · Контролируемый темп")}</span></GestureTarget>}
    <div className="menu-backend">
      <GestureTarget id="open-profile" onSelect={onProfile}>{translateUi("Профиль")}</GestureTarget>
      <GestureTarget id="open-plan" onSelect={onPlan}><strong>{translateUi("Сегодня · Базовый план")}</strong>{plan ? <span>{translateUi(todayPlanLabel(plan,timezone))}</span> : <span>{translateUi(planMessage ? 'Нет доступных упражнений для профиля' : 'План доступен при подключении')}</span>}</GestureTarget>
      <GestureTarget id="open-progress" onSelect={onProgress}>{translateUi("Прогресс")}</GestureTarget>
    </div>
    <p>{translateUi("✊ Сожми кулак и удерживай, чтобы вернуться к обучению.")}</p>
    <details className="fallback"><summary>{translateUi("Клавиатура / доступное управление")}</summary><button type="button" onClick={onBack}>{translateUi("Назад")}</button><button type="button" disabled={!selectedWorkoutId} onClick={onConfirm}>{translateUi("Подтвердить выбор")}</button></details>
  </section>
}
