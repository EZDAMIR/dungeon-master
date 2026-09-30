import type { TrainingPlan } from '../../api/types'
export function todayPlanLabel(plan:TrainingPlan|null,timezone:string,now=new Date()):string {
  if(!plan)return 'План доступен при подключении'
  const parts=new Intl.DateTimeFormat('en',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
  const part=(type:string)=>Number(parts.find(value=>value.type===type)?.value)
  const date=Date.UTC(part('year'),part('month')-1,part('day'))
  const day=Math.round((date-Date.parse(`${plan.starts_on}T00:00:00Z`))/86_400_000)
  const item=plan.items.find(value=>value.day_index===day)
  return item ? `${item.exercise.name} · ${item.sets} × ${item.target_reps} · Контролируемый темп` : 'На сегодня подходов нет'
}
