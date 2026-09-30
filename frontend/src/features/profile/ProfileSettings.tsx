import { useState } from 'react'
import type { Constraint, Equipment, Experience, Goal, ProfileUpdate } from '../../api/types'
import { profileFields } from '../../store/persistence'
import { GestureTarget } from '../gesture-navigation/GestureTarget'
const goals:Record<Goal,string>={general_fitness:'Общая физическая форма',strength_foundation:'Базовая сила',mobility:'Подвижность'}
const experiences:Record<Experience,string>={beginner:'Начинающий',intermediate:'Средний уровень',advanced:'Опытный'}
const equipmentLabels:Record<Equipment,string>={none:'Без оборудования',chair:'Стул',resistance_band:'Эластичная лента',dumbbells:'Гантели'}
const constraints:Record<Constraint,string>={no_high_impact:'Избегать ударной нагрузки',avoid_deep_knee_flexion:'Избегать глубокой нагрузки на колени',avoid_overhead:'Избегать движений над головой'}
const steps=['Цель','Опыт','Дни в неделю','Длительность','Оборудование','Ограничения']
export function ProfileSettings({profile,message,onSave,onBack}:{profile:ProfileUpdate;message:string;onSave:(profile:ProfileUpdate)=>Promise<void>;onBack:()=>void}) {
  const [draft,setDraft]=useState(()=>profileFields(profile)),[step,setStep]=useState(0),[saving,setSaving]=useState(false)
  const equipment=(code:Equipment)=>{
    const selected=code==='none' ? ['none'] as Equipment[] : draft.equipment.includes(code) ? draft.equipment.filter(value=>value!==code) : [...draft.equipment.filter(value=>value!=='none'),code]
    setDraft({...draft,equipment:selected.length ? selected : ['none']})
  }
  const constraint=(code:Constraint)=>setDraft({...draft,confirmed_constraints:draft.confirmed_constraints.includes(code) ? draft.confirmed_constraints.filter(value=>value!==code) : [...draft.confirmed_constraints,code]})
  const save=()=>{setSaving(true);void onSave(profileFields(draft)).finally(()=>setSaving(false))}
  return <section className="backend-page"><h2>Профиль</h2><p className="instruction">{step+1} / {steps.length} · {steps[step]}</p>
    <div className="settings-grid">
      {step===0 && (Object.entries(goals) as [Goal,string][]).map(([value,label])=><GestureTarget key={value} id={`goal-${value}`} selected={draft.goal===value} onSelect={()=>setDraft({...draft,goal:value})}>{label}</GestureTarget>)}
      {step===1 && (Object.entries(experiences) as [Experience,string][]).map(([value,label])=><GestureTarget key={value} id={`experience-${value}`} selected={draft.experience_level===value} onSelect={()=>setDraft({...draft,experience_level:value})}>{label}</GestureTarget>)}
      {step===2 && <><GestureTarget id="days-minus" disabled={draft.days_per_week<=1} onSelect={()=>setDraft({...draft,days_per_week:draft.days_per_week-1})}>− День</GestureTarget><strong className="progress-number">{draft.days_per_week}</strong><GestureTarget id="days-plus" disabled={draft.days_per_week>=7} onSelect={()=>setDraft({...draft,days_per_week:draft.days_per_week+1})}>+ День</GestureTarget></>}
      {step===3 && [5,10,20,30,45,60,90,120].map(value=><GestureTarget key={value} id={`duration-${value}`} selected={draft.session_minutes===value} onSelect={()=>setDraft({...draft,session_minutes:value})}>{value} мин</GestureTarget>)}
      {step===4 && (Object.entries(equipmentLabels) as [Equipment,string][]).map(([value,label])=><GestureTarget key={value} id={`equipment-${value}`} selected={draft.equipment.includes(value)} onSelect={()=>equipment(value)}>{label}</GestureTarget>)}
      {step===5 && (Object.entries(constraints) as [Constraint,string][]).map(([value,label])=><GestureTarget key={value} id={`constraint-${value}`} selected={draft.confirmed_constraints.includes(value)} onSelect={()=>constraint(value)}>{label}</GestureTarget>)}
    </div>
    {step===5 && <p>Ограничения задаются пользователем и не являются медицинским диагнозом. При сохранении ты подтверждаешь выбранные ограничения.</p>}
    <p role="status" aria-live="polite">{message}</p>
    <div className="settings-grid">
      {step>0 && <GestureTarget id="profile-previous" onSelect={()=>setStep(step-1)}>Предыдущий шаг</GestureTarget>}
      {step<steps.length-1 ? <GestureTarget id="profile-next" onSelect={()=>setStep(step+1)}>Следующий шаг</GestureTarget> : <GestureTarget id="profile-save" disabled={saving} onSelect={save}>{saving ? 'Сохраняется…' : 'Сохранить профиль'}</GestureTarget>}
      <GestureTarget id="profile-back" onSelect={onBack}>Назад в меню</GestureTarget>
    </div>
  </section>
}
