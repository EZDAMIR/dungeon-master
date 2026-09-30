import { ApiError } from '../../api/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReleaseClient, type Schedule, type SchedulePreferences, type Proposal, type Language } from '../../api/release';
import type { AudioCoordinator } from '../../audio/audioCoordinator';
import { productText } from "../../shared/productCopy";
import { ProposalCard } from '../coach/ProposalCard';
import { localDate, localToInstant, formatAppointment } from './timezone';
type GoogleStatus = { configured: boolean; connected: boolean; sync_status: string };
export function SchedulePanel({ client, audio, language = "ru" }: { client: ReleaseClient; audio: AudioCoordinator; language?: Language }) {
  const [preferences, setPreferences] = useState<SchedulePreferences | null>(null), [schedule, setSchedule] = useState<Schedule | null>(null), [week, setWeek] = useState(() => localDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone)), [error, setError] = useState(''), [busy, setBusy] = useState(false), [proposal, setProposal] = useState<Proposal | null>(null), [starts, setStarts] = useState(''), [title, setTitle] = useState('Тренировка'), [action, setAction] = useState<'create' | 'move' | 'cancel'>('create'), [appointment, setAppointment] = useState(''), [google, setGoogle] = useState<GoogleStatus | null>(null), [reminder, setReminder] = useState(''), [sync, setSync] = useState('');
  const t = (key: Parameters<typeof productText>[1]) => productText(language, key);
  const dedupe = useRef(new Set<string>()), flight = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const [prefs, data] = await Promise.all([client.backend.request<SchedulePreferences>('/schedule/preferences', undefined, 'GET', signal), client.backend.request<Schedule>(`/schedule?starts_on=${week}`, undefined, 'GET', signal)]);
    if (signal?.aborted) return; setPreferences(prefs); setSchedule(data);
  }, [client, week]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => load(controller.signal)).catch(() => { if (!controller.signal.aborted) setError('Расписание недоступно. Попробуйте после подключения.'); });
    void client.backend.request<GoogleStatus>('/integrations/google/status', undefined, 'GET', controller.signal).then(result => { if (!controller.signal.aborted) setGoogle(result); }).catch(() => { if (!controller.signal.aborted) setGoogle({ configured: false, connected: false, sync_status: 'unavailable' }); });
    return () => controller.abort(); }, [load, client]);
  useEffect(() => {
    if (!schedule) return;
    const check = () => {
      for (const item of schedule.appointments) {
        const delta = new Date(item.starts_at).getTime() - Date.now(); const key = `${item.id}:${item.starts_at}`;
        if (item.status !== 'cancelled' && item.status !== 'skipped' && delta >= 0 && delta <= 5 * 60000 && !dedupe.current.has(key)) { dedupe.current.add(key); setReminder(`Скоро: ${item.title} · ${formatAppointment(item.starts_at, schedule.timezone)}`); audio.enqueue({ id: `reminder:${key}`, text: 'Скоро ваша тренировка', priority: 'guide' }); }
      }
    }; check(); const timer = setInterval(check, 30000); return () => clearInterval(timer);
  }, [schedule, audio]);
  async function run(task: () => Promise<void>) { if (flight.current) return; flight.current = true; setBusy(true); setError(''); try { await task(); } catch (error) { setError(error instanceof ApiError && error.code==='invalid_slot'?'Выберите будущее время в пределах вашей доступности или один из свободных слотов.':error instanceof Error && !error.message.startsWith('API') ? error.message : 'Изменение не выполнено. Обновите расписание и повторите.'); } finally { flight.current = false; setBusy(false); } }
  async function propose(instant?: string) {
    if (!schedule || !preferences) return;
    await run(async () => { const starts_at = action === 'cancel' ? null : instant ?? localToInstant(starts, preferences.timezone);
      setProposal(await client.backend.request<Proposal>('/schedule/proposals', { operation_id: crypto.randomUUID(), expected_revision: schedule.revision, action, appointment_id: action === 'create' ? null : appointment, starts_at, duration_minutes: preferences.duration_minutes, title, plan_id: client.backend.getSnapshot().plan?.id ?? null }, 'POST'));
    });
  }
  return <section className="schedule-panel" data-guide-target="schedule"><h2>{t("schedule")}</h2><p>{t("scheduleDescription")}</p>
    <label>{t("week")} <input type="date" value={week} onChange={event => setWeek(event.target.value)} /></label><button disabled={busy} onClick={() => { void run(() => load()); }}>{t("refresh")}</button>
    {reminder && <p role="status">{reminder}</p>}{error && <p role="alert">{error}</p>}
    {preferences && <details><summary>Доступное время · {preferences.timezone}</summary><label>Часовой пояс <input value={preferences.timezone} onChange={event => setPreferences({ ...preferences, timezone: event.target.value })} /></label>
      <label>Минут на занятие <input type="number" min={5} max={120} value={preferences.duration_minutes} onChange={event => setPreferences({ ...preferences, duration_minutes: Number(event.target.value) })} /></label>
      {[0, 1, 2, 3, 4, 5, 6].map(day => { const availability = preferences.availability.find(item => item.weekday === day); return <div className="availability-row" key={day}><label><input type="checkbox" checked={!!availability} onChange={event => setPreferences({ ...preferences, availability: event.target.checked ? [...preferences.availability, { weekday: day, start_minute: 1080, end_minute: 1260 }] : preferences.availability.filter(item => item.weekday !== day) })} />{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][day]}</label>{availability && ['start_minute','end_minute'].map(key => { const field = key as 'start_minute' | 'end_minute', minutes = availability[field]; return <label key={key}>{field === 'start_minute' ? 'С' : 'До'}<input type="time" value={`${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`} onChange={event => { const [hour, minute] = event.target.value.split(':').map(Number); setPreferences({ ...preferences, availability: preferences.availability.map(item => item.weekday === day ? { ...item, [field]: hour * 60 + minute } : item) }); }} /></label>; })}</div>; })}
      <button disabled={busy} onClick={() => { void run(async () => { await client.backend.request('/schedule/preferences', { timezone: preferences.timezone, duration_minutes: preferences.duration_minutes, availability: preferences.availability, expected_revision: preferences.revision }, 'PUT'); await load(); }); }}>Сохранить доступное время</button></details>}
    <div className="schedule-week">{schedule?.appointments.filter(item => item.status !== 'cancelled').map(item => <article className="dm-panel" key={item.id}><h3>{item.title}</h3><p>{formatAppointment(item.starts_at, schedule.timezone)}</p><p>{item.status} · Google: {item.sync_status}</p><button onClick={() => { setAppointment(item.id); setAction('move'); }}>{t("move")}</button><button onClick={() => { setAppointment(item.id); setAction('cancel'); }}>{t("cancel")}</button></article>)}</div>
    {schedule && !schedule.appointments.length && <p>В эту неделю занятий ещё нет.</p>}
    <form onSubmit={event => { event.preventDefault(); void propose(); }}><h3>{action === 'create' ? 'Новое занятие' : action === 'move' ? 'Перенос занятия' : 'Отмена занятия'}</h3><label>{t("title")} <input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} /></label>{action !== 'cancel' && <label>{t("datetime")} · {preferences?.timezone}<input type="datetime-local" required value={starts} onChange={event => setStarts(event.target.value)} /></label>}<button disabled={busy || !schedule}>{t("propose")}</button><button type="button" onClick={() => { setAction('create'); setAppointment(''); }}>{t("newAppointment")}</button></form>
    {action === 'create' && schedule?.slots.length ? <details><summary>{t("slots")}</summary><div className="dm-actions">{schedule.slots.slice(0, 14).map(slot => <button key={slot.starts_at} disabled={busy} onClick={() => { void propose(slot.starts_at); }}>{formatAppointment(slot.starts_at, schedule.timezone)}</button>)}</div></details> : null}
    {proposal && <ProposalCard key={proposal.id} proposal={proposal} client={client} language={language} onChanged={() => { void run(() => load()); }} />}
    <div className="dm-actions"><button onClick={() => { void run(async () => { const blob = await client.backend.requestBlob('/schedule/export.ics'); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'dungeon-master.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }); }}>{t("export")}</button></div>
    <article className="dm-panel"><h3>Google Calendar</h3><p>{google?.connected ? `Подключён · ${google.sync_status}` : google?.configured ? 'Готов к подключению' : 'Настройка Google недоступна · внутреннее расписание работает отдельно'}</p>
      <button disabled={busy || !google?.configured || google.connected} onClick={() => { void run(async () => { const result = await client.backend.request<{ authorization_url: string }>('/integrations/google/authorize', { operation_id: crypto.randomUUID() }, 'POST'); const url = new URL(result.authorization_url); if (url.protocol !== 'https:' || url.hostname !== 'accounts.google.com') throw new Error('Некорректный адрес авторизации'); window.location.assign(url.href); }); }}>{t("connectGoogle")}</button>
      <button disabled={busy || !google?.connected} onClick={() => { void run(async () => { const result = await client.backend.request<{ synced: number; failed: number; status: string }>('/integrations/google/sync', { operation_id: crypto.randomUUID() }, 'POST'); setSync(`${result.status}: ${result.synced} сохранено, ${result.failed} не удалось`); setGoogle(await client.backend.request<GoogleStatus>('/integrations/google/status')); }); }}>{t("syncGoogle")}</button>
      <button disabled={busy || !google?.connected} onClick={() => { void run(async () => { await client.backend.request('/integrations/google/connection', undefined, 'DELETE'); setGoogle(await client.backend.request<GoogleStatus>('/integrations/google/status')); }); }}>{t("disconnectGoogle")}</button>{sync && <p role="status">{sync}</p>}</article>
  </section>;
}
