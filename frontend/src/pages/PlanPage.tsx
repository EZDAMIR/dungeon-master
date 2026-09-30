import { useState } from 'react'
import type { TrainingPlan } from '../api/types'
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
const days=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']
export function PlanPage({plan,message,onGenerate,onBack,onProfile,onStartDay}:{plan:TrainingPlan|null;message:string|null;onGenerate:()=>Promise<void>;onBack:()=>void;onProfile:()=>void;onStartDay?:(day:number)=>void}) {
  const [busy,setBusy]=useState(false)
  const generate=()=>{setBusy(true);void onGenerate().finally(()=>setBusy(false))}
  return <section className="backend-page"><h2>Базовый план</h2>
    {message && <p role="status">{message}</p>}
    {plan ? <><p>Неделя с {plan.starts_on}</p><ul className="plan-days">{plan.items.map(item=><li key={item.id}><strong>{days[item.day_index]}</strong> · {item.exercise.name} · {item.sets} × {item.target_reps} · Контролируемый темп · Отдых {item.rest_seconds} с</li>)}</ul><p>{plan.rationale}</p></> : <p>Персональный базовый план пока недоступен. Локальная демонстрация доступна в меню.</p>}
    {plan && onStartDay && <div className="dm-actions">{[...new Set(plan.items.map(item=>item.day_index))].map(day=><GestureTarget key={day} id={`day-start-${day}`} onSelect={()=>onStartDay(day)}>Начать · {days[day]}</GestureTarget>)}</div>}
    <div className="settings-grid"><GestureTarget id="plan-generate" disabled={busy} onSelect={generate}>{busy ? 'Обновляется…' : 'Создать новый план'}</GestureTarget>
    <GestureTarget id="plan-profile" onSelect={onProfile}>Изменить профиль</GestureTarget>
    <GestureTarget id="plan-back" onSelect={onBack}>Назад в меню</GestureTarget></div>
  </section>
}
