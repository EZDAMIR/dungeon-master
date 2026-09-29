import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
export function MenuPage({selectedWorkoutId,onSelect,onConfirm,onBack}:{selectedWorkoutId:string|null;onSelect:()=>void;onConfirm:()=>void;onBack:()=>void}) {
  return <section>
    <h2>Выбери тренировку</h2>
    <p className="instruction">{selectedWorkoutId ? 'Покажи 👍 и удерживай, чтобы начать' : 'Наведи курсор на кнопку, затем соедини большой и указательный пальцы'}</p>
    <GestureTarget id="bodyweight-squat" selected={selectedWorkoutId==='bodyweight-squat'} onSelect={onSelect}>
      <strong>Bodyweight Squat</strong><span>3 sets × 10 reps</span>{selectedWorkoutId && <span>✓ Выбрано</span>}
    </GestureTarget>
    <p>✊ Сожми кулак и удерживай, чтобы вернуться к обучению.</p>
    <details className="fallback"><summary>Клавиатура / доступное управление</summary><button type="button" onClick={onBack}>Назад</button><button type="button" disabled={!selectedWorkoutId} onClick={onConfirm}>Подтвердить выбор</button></details>
  </section>
}
