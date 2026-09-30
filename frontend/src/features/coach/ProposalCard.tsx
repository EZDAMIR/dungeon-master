import { useRef, useState } from 'react';
import { productText } from "../../shared/productCopy";
import { ApiError } from '../../api/client';
import { ReleaseClient, type Proposal, type Language } from '../../api/release';
export function ProposalCard({ proposal, client, onChanged, language = "ru" }: { proposal: Proposal; client: ReleaseClient; onChanged?: () => void; language?: Language }) {
  const [value, setValue] = useState(proposal), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const t = (key: Parameters<typeof productText>[1]) => productText(language, key);
  const flight = useRef(false), ids = useRef({ confirm: crypto.randomUUID(), reject: crypto.randomUUID() });
  async function decide(decision: 'confirm' | 'reject') {
    if (flight.current || value.status !== 'pending') return; flight.current = true; setBusy(true); setError('');
    try { setValue(await client.decide(value.id, decision, ids.current[decision])); onChanged?.(); }
    catch (error) { setError(error instanceof ApiError && error.status === 409 ? 'Предложение устарело. Обновите расписание и запросите новое.' : 'Действие не выполнено. Можно повторить.'); }
    finally { flight.current = false; setBusy(false); }
  }
  const pending = value.status === 'pending', expired = new Date(value.expires_at).getTime() <= now;
  return <article className="dm-panel proposal-card"><h4>{value.kind === 'schedule' ? 'Изменение расписания' : 'Предложение тренера'}</h4>
    <dl>{Object.entries(value.payload).filter(([key]) => ['title', 'action', 'starts_at', 'ends_at', 'duration_minutes'].includes(key)).map(([key, content]) => <div key={key}><dt>{{ title: "Название", action: "Действие", starts_at: "Начало", ends_at: "Окончание", duration_minutes: "Длительность, мин" }[key]}</dt><dd>{typeof content === 'string' || typeof content === 'number' ? String(content) : '—'}</dd></div>)}</dl>
    <p role="status">{value.status === 'confirmed' ? t("confirmed") : value.status === 'rejected' ? t("rejected") : expired ? 'Истёк срок предложения' : t("pending")}</p>
    {error && <p role="alert">{error}</p>}
    {value.result && Boolean(value.result.sync_status || value.result.google_sync_status) && <p>Google: {String(value.result.google_sync_status ?? value.result.sync_status)}</p>}
    <button disabled={!pending || busy || expired} onClick={() => { void decide('confirm'); }}>{t("confirm")}</button><button disabled={!pending || busy} onClick={() => { void decide('reject'); }}>{t("reject")}</button>
  </article>;
}
