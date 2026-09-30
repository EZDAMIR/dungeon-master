import { useEffect, useRef, useState } from 'react';
import { ReleaseClient, type CoachTurn } from '../../api/release';
import type { AudioCoordinator } from '../../audio/audioCoordinator';
import { PushToTalk, type RecordingStatus } from './pushToTalk';
import { ProposalCard } from './ProposalCard';
const allowed = new Set(['open_plan', 'open_schedule', 'open_progress', 'open_exercise', 'open_camera']);
export function CoachPanel({ client, audio, screen, onAction }: { client: ReleaseClient; audio: AudioCoordinator; screen: 'planning' | 'schedule' | 'results'; onAction: (action: string, exerciseKey?: string) => void }) {
  const [text, setText] = useState(''), [turns, setTurns] = useState<CoachTurn[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [recording, setRecording] = useState<RecordingStatus>('idle');
  const conversation = useRef<string | null>(null), request = useRef<AbortController | null>(null), flight = useRef(false), mic = useRef<PushToTalk | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    mic.current = new PushToTalk(setRecording, (blob, seconds) => {
      const form = new FormData(); const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'; form.append('file', blob, `recording.${extension}`); form.append('duration_seconds', String(seconds));
      form.append('language', 'ru');
      void client.backend.request<{ text: string }>('/coach/transcribe', form, 'POST', controller.signal).then(result => { if (!controller.signal.aborted) setText(result.text); }).catch(() => { if (!controller.signal.aborted) setError('Не удалось распознать речь. Введите текст.'); }).finally(() => { if (!controller.signal.aborted) setRecording('idle'); });
    });
    return () => { controller.abort(); request.current?.abort(); mic.current?.cancel(); };
  }, [client]);
  async function send(value: string) {
    if (!value.trim() || flight.current) return; flight.current = true; setBusy(true); setError('');
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    try {
      const turn = await client.turn(value.slice(0, 2000), conversation.current, screen, controller.signal);
      if (controller.signal.aborted) return; conversation.current = turn.conversation_id; setTurns(previous => [...previous.slice(-9), turn]); setText('');
      if (turn.speech_text) audio.enqueue({ id: turn.message_id, text: turn.speech_text, priority: 'chat', load: signal => client.speech({ message_id: turn.message_id }, signal) });
    } catch { if (!controller.signal.aborted) setError('Тренер недоступен. Тренировка и локальное расписание сохраняются.'); }
    finally { flight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  return <aside className="coach-panel dm-panel" data-guide-target="coach"><h3>Тренер</h3><p>Спросите о плане или предложите перенос. Изменения требуют подтверждения.</p>
    <div className="coach-transcript" aria-live="polite">{turns.map(turn => <article key={turn.message_id}><p className="dm-label">{turn.provenance.cached ? 'cached live' : turn.provenance.execution_mode === 'fixture' ? 'fixture' : turn.provenance.execution_mode === 'live' && !turn.error_category ? `${turn.provenance.model_used ?? 'GPT-5.4'} / live` : 'deterministic fallback'}</p><p>{turn.display_text}</p>
      <div className="source-chips">{turn.source_references.map((source, index) => <span key={index} className="source-chip">{source.label || source.source_type}</span>)}</div>
      {turn.proposals.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} client={client} />)}
      <div className="dm-actions">{turn.ui_actions.filter(action => allowed.has(action.action)).map((action, index) => <button key={index} onClick={() => onAction(action.action, action.exercise_key)}>{action.action}</button>)}</div>
    </article>)}</div>
    <form onSubmit={event => { event.preventDefault(); void send(text); }}><label>Сообщение тренеру<textarea value={text} maxLength={2000} onChange={event => setText(event.target.value)} /></label><button disabled={busy || !text.trim()}>Отправить</button></form>
    <div className="dm-actions">{['Объясни мой план', 'Предложи занятие на этой неделе', 'Как улучшить технику?'].map(chip => <button key={chip} disabled={busy} onClick={() => { void send(chip); }}>{chip}</button>)}</div>
    <div className="dm-actions"><button disabled={recording === 'processing'} onClick={() => { audio.stop(); if (recording === 'recording') mic.current?.stop(); else void mic.current?.start(); }}>{recording === 'recording' ? 'Остановить запись' : 'Записать вопрос (до 30 с)'}</button><button onClick={() => mic.current?.cancel()}>Отменить запись</button></div>
    <p role="status">{recording === 'denied' ? 'Микрофон недоступен. Используйте текст.' : recording === 'unsupported' ? 'Запись не поддерживается. Используйте текст.' : recording === 'recording' ? 'Идёт запись · звук тренера остановлен' : recording === 'processing' ? 'Распознаём речь…' : ''}</p>{error && <p role="alert">{error}</p>}
  </aside>;
}
