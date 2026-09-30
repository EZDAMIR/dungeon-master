import type { ErrorCode, Progress } from '../api/types'
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
const labels:Record<ErrorCode,string>={depth_insufficient:'Недостаточная глубина',too_fast:'Слишком быстро',incomplete_extension:'Неполное выпрямление'}
export function ProgressPage({progress,cached,pending,onRetry,onBack}:{progress:Progress|null;cached:boolean;pending:number;onRetry:()=>void;onBack:()=>void}) {
  return <section className="backend-page"><h2>Прогресс</h2>
    {cached && <p role="status">Сохранённая копия · Данные могут быть устаревшими</p>}
    {!progress || !progress.completed_sessions ? <p>После первой сохранённой тренировки здесь появится прогресс</p> : <>
      <dl className="progress-totals"><div><dt>Тренировок</dt><dd>{progress.completed_sessions}</dd></div><div><dt>Все повторения</dt><dd>{progress.total_reps}</dd></div><div><dt>Корректные</dt><dd>{progress.accepted_reps}</dd></div><div><dt>Доля корректных</dt><dd>{Math.round(progress.acceptance_rate*100)}%</dd></div></dl>
      <div>{(Object.entries(labels) as [ErrorCode,string][]).map(([code,label])=><div key={code}><span>{label}: {progress.error_counts[code]}</span><div className="error-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={Math.max(1,progress.total_reps)} aria-valuenow={progress.error_counts[code]}><span style={{width:`${Math.min(100,progress.error_counts[code]/Math.max(1,progress.total_reps)*100)}%`}}/></div></div>)}</div>
      <h3>Последние тренировки</h3><ul>{progress.recent_sessions.map(session=><li key={session.id}>{new Date(session.completed_at).toLocaleDateString()} · Bodyweight Squat · {session.accepted_reps}/{session.total_reps} корректных · {(session.duration_ms/1000).toFixed(0)} с{session.dominant_error && ` · ${labels[session.dominant_error]}`}</li>)}</ul>
    </>}
    {!!pending && <p>Ожидают синхронизации: {pending}</p>}
    <div className="settings-grid"><GestureTarget id="progress-retry" onSelect={onRetry}>Повторить синхронизацию</GestureTarget>
    <GestureTarget id="progress-back" onSelect={onBack}>Назад в меню</GestureTarget></div>
  </section>
}
