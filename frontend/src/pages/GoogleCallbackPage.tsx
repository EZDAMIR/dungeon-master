import { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
const callbacks = new Map<string, Promise<{ connected: boolean }>>();
export function GoogleCallbackPage() {
  const [status, setStatus] = useState(() => { const query = new URLSearchParams(window.location.search); return query.get('state') && query.get('code') && !query.has('error') ? 'Проверяем ответ Google…' : 'Подключение не завершено. Вернитесь в расписание.'; });
  useEffect(() => {
    const query = new URLSearchParams(window.location.search), state = query.get('state'), code = query.get('code');
    if (!state || !code || query.has('error')) return;
    const key = state + ':' + code;
    let pending = callbacks.get(key);
    if (!pending) {
      pending = new ApiClient().json<{ connected: boolean }>(`/integrations/google/callback?${new URLSearchParams({ state, code })}`);
      callbacks.set(key, pending); while (callbacks.size > 5) callbacks.delete(callbacks.keys().next().value!);
    }
    let active = true;
    void pending.then(result => { if (active) setStatus(result.connected ? 'Google подключён. Вернитесь в расписание для синхронизации.' : 'Подключение не завершено.'); }).catch(() => { if (active) setStatus('Подключение не завершено или ссылка устарела. Попробуйте снова в расписании.'); }).finally(() => { if (active) window.history.replaceState(null, '', window.location.pathname); });
    return () => { active = false; };
  }, []);
  return <main className="app-shell"><h1>Google Calendar</h1><p role="status">{status}</p><a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/schedule`}>Вернуться в расписание</a></main>;
}
