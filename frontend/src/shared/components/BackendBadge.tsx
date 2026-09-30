import type { BackendStatus } from '../../api/types'
export function BackendBadge({status,pending}:{status:BackendStatus;pending:number}) {
  const label=status==='syncing' || status==='connecting' ? 'Прогресс сохраняется' : pending ? 'Ожидает синхронизации' : status==='online' ? 'Сохранено' : 'Локальный режим'
  return <span className={`backend-badge backend-${status}`} role="status" aria-live="polite">{label}</span>
}
