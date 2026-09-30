import { useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { ReleaseClient, type Proposal } from '../../api/release';
export function ProposalCard({ proposal, client, onChanged }: { proposal: Proposal; client: ReleaseClient; onChanged?: () => void }) {
  const [value, setValue] = useState(proposal), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const flight = useRef(false), ids = useRef({ confirm: crypto.randomUUID(), reject: crypto.randomUUID() });
  async function decide(decision: 'confirm' | 'reject') {
    if (flight.current || value.status !== 'pending') return; flight.current = true; setBusy(true); setError('');
    try { setValue(await client.decide(value.id, decision, ids.current[decision])); onChanged?.(); }
    catch (error) { setError(error instanceof ApiError && error.status === 409 ? 'Предложение устарело. Обновите расписание и запросите новое.' : 'Действие не выполнено. Можно повторить.'); }
    finally { flight.current = false; setBusy(false); }
  }
  const pending = value.status === 'pending', expired = new Date(value.expires_at).getTime() <= now;
  return <article className="dm-panel proposal-card"><h4>{value.kind === 'schedule' ? 'Изменение расписания' : 'Предложение тренера'}</h4>
    <dl>{Object.entries(value.payload).filter(([key]) => ['title', 'action', 'starts_at', 'ends_at', 'duration_minutes', 'appointment_id', 'exercise_key'].includes(key)).map(([key, content]) => <div key={key}><dt>{key}</dt><dd>{typeof content === 'string' || typeof content === 'number' ? String(content) : '—'}</dd></div>)}</dl>
    <p role="status">{value.status === 'confirmed' ? 'Подтверждено сервером' : value.status === 'rejected' ? 'Отклонено' : expired ? 'Истёк срок предложения' : 'Изменение ожидает вашего подтверждения'}</p>
    {error && <p role="alert">{error}</p>}
    {value.result && <p>Результат: {JSON.stringify(value.result)}</p>}
    <button disabled={!pending || busy || expired} onClick={() => { void decide('confirm'); }}>Подтвердить</button><button disabled={!pending || busy} onClick={() => { void decide('reject'); }}>Отклонить</button>
  </article>;
}
