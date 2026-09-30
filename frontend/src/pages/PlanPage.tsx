import { useTranslation } from '../shared/uiLanguage'
import { useState } from 'react'
import type { TrainingPlan } from '../api/types'
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
const days=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']
export function PlanPage({plan,message,onGenerate,onBack,onProfile,onStartDay}:{plan:TrainingPlan|null;message:string|null;onGenerate:()=>Promise<void>;onBack:()=>void;onProfile:()=>void;onStartDay?:(day:number)=>void}) {
  const { translateUi } = useTranslation()

  const [busy,setBusy]=useState(false)
  const generate=()=>{setBusy(true);void onGenerate().finally(()=>setBusy(false))}
  return <section className="backend-page"><h2>{translateUi("Базовый план")}</h2>
    {message && <p role="status">{translateUi(message)}</p>}
    {plan ? <><p>{translateUi("Неделя с ")}{translateUi(plan.starts_on)}</p><ul className="plan-days">{plan.items.map(item=><li key={item.id}><strong>{translateUi(days[item.day_index])}</strong> · {translateUi(item.exercise.name)} · {item.sets} × {item.target_reps}{translateUi(" · Контролируемый темп · Отдых ")}{item.rest_seconds}{translateUi(" с")}</li>)}</ul><p>{translateUi(plan.rationale)}</p></> : <p>{translateUi("Персональный базовый план пока недоступен. Локальная демонстрация доступна в меню.")}</p>}
    {plan && onStartDay && <div className="dm-actions">{[...new Set(plan.items.map(item=>item.day_index))].map(day=><GestureTarget key={day} id={`day-start-${day}`} onSelect={()=>onStartDay(day)}>{translateUi("Начать · ")}{translateUi(days[day])}</GestureTarget>)}</div>}
    <div className="settings-grid"><GestureTarget id="plan-generate" disabled={busy} onSelect={generate}>{translateUi(busy ? 'Обновляется…' : 'Создать новый план')}</GestureTarget>
    <GestureTarget id="plan-profile" onSelect={onProfile}>{translateUi("Изменить профиль")}</GestureTarget>
    <GestureTarget id="plan-back" onSelect={onBack}>{translateUi("Назад в меню")}</GestureTarget></div>
  </section>
}
