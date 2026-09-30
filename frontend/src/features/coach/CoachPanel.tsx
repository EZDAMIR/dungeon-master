import { useEffect, useRef, useState } from 'react';
import { ReleaseClient, type CoachTurn, type Language } from '../../api/release';
import type { AudioCoordinator } from '../../audio/audioCoordinator';
import { productText } from "../../shared/productCopy";
import { PushToTalk, type RecordingStatus } from './pushToTalk';
import { ProposalCard } from './ProposalCard';
const allowed = new Set(['open_plan', 'open_schedule', 'open_progress', 'open_exercise', 'open_camera']);
export function CoachPanel({ client, audio, screen, onAction, language = "ru" }: { client: ReleaseClient; audio: AudioCoordinator; screen: 'planning' | 'schedule' | 'results'; language?: Language; onAction: (action: string, exerciseKey?: string) => void }) {
  const [text, setText] = useState(''), [turns, setTurns] = useState<CoachTurn[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [recording, setRecording] = useState<RecordingStatus>('idle');
  const t = (key: Parameters<typeof productText>[1]) => productText(language, key);
  const pendingOperation = useRef<{ text: string; id: string } | null>(null);
  const transcription = useRef<AbortController | null>(null);
  const conversation = useRef<string | null>(null), request = useRef<AbortController | null>(null), flight = useRef(false), mic = useRef<PushToTalk | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    mic.current = new PushToTalk(status => { audio.setRecording(status === "recording"); setRecording(status); }, (blob, seconds) => {
      transcription.current?.abort(); const upload = new AbortController(); transcription.current = upload;
      const form = new FormData(); const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'; form.append('file', blob, `recording.${extension}`); form.append('duration_seconds', String(seconds));
      form.append('language', language);
      void client.backend.request<{ text: string }>('/coach/transcribe', form, 'POST', upload.signal).then(result => { if (!controller.signal.aborted && !upload.signal.aborted) setText(result.text); }).catch(() => { if (!controller.signal.aborted && !upload.signal.aborted) setError('Не удалось распознать речь. Введите текст.'); }).finally(() => { if (!controller.signal.aborted && !upload.signal.aborted) setRecording('idle'); });
    });
    return () => { controller.abort(); transcription.current?.abort(); request.current?.abort(); mic.current?.cancel(); };
  }, [client, audio, language]);
  async function send(value: string) {
    if (!value.trim() || flight.current) return; flight.current = true; setBusy(true); setError('');
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    try {
      const normalized = value.slice(0, 2000);
      if (pendingOperation.current?.text !== normalized) pendingOperation.current = { text: normalized, id: crypto.randomUUID() };
      const turn = await client.turn(normalized, conversation.current, screen, controller.signal, pendingOperation.current.id);
      if (controller.signal.aborted) return; pendingOperation.current = null; conversation.current = turn.conversation_id; setTurns(previous => [...previous.slice(-9), turn]); setText('');
      if (turn.speech_text) audio.enqueue({ id: turn.message_id, text: turn.speech_text, priority: 'chat', load: signal => client.speech({ message_id: turn.message_id }, signal) });
    } catch { if (!controller.signal.aborted) setError('Тренер недоступен. Тренировка и локальное расписание сохраняются.'); }
    finally { flight.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  return <aside className="coach-panel dm-panel" data-guide-target="coach"><h3>{t("coach")}</h3><p>{t("coachDescription")}</p>
    <div className="coach-transcript" aria-live="polite">{turns.map(turn => <article key={turn.message_id}><p className="dm-label">{turn.provenance.cached ? 'cached live' : turn.provenance.execution_mode === 'fixture' ? 'fixture' : turn.provenance.execution_mode === 'live' && !turn.error_category ? `${turn.provenance.model_used ?? 'GPT-5.4'} / live` : 'deterministic fallback'}</p><p>{turn.display_text}</p>
      <div className="source-chips">{turn.source_references.map((source, index) => <span key={index} className="source-chip">{source.label || source.source_type}</span>)}</div>
      {turn.proposals.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} client={client} language={language} />)}
      <div className="dm-actions">{turn.ui_actions.filter(action => allowed.has(action.action)).map((action, index) => <button key={index} onClick={() => onAction(action.action, action.exercise_key)}>{action.action}</button>)}</div>
    </article>)}</div>
    <form onSubmit={event => { event.preventDefault(); void send(text); }}><label>{t("message")}<textarea value={text} maxLength={2000} onChange={event => setText(event.target.value)} /></label><button disabled={busy || !text.trim()}>{t("send")}</button></form>
    <div className="dm-actions">{['Объясни мой план', 'Предложи занятие на этой неделе', 'Как улучшить технику?'].map(chip => <button key={chip} disabled={busy} onClick={() => { void send(chip); }}>{chip}</button>)}</div>
    <div className="dm-actions"><button disabled={recording === 'processing'} onClick={() => { audio.stop(); if (recording === 'recording') mic.current?.stop(); else void mic.current?.start(); }}>{recording === 'recording' ? t("stopRecording") : t("record")}</button><button onClick={() => { transcription.current?.abort(); mic.current?.cancel(); }}>{t("cancelRecording")}</button></div>
    <p role="status">{recording === 'denied' ? 'Микрофон недоступен. Используйте текст.' : recording === 'unsupported' ? 'Запись не поддерживается. Используйте текст.' : recording === 'recording' ? 'Идёт запись · звук тренера остановлен' : recording === 'processing' ? 'Распознаём речь…' : ''}</p>{error && <p role="alert">{error}</p>}
  </aside>;
}
