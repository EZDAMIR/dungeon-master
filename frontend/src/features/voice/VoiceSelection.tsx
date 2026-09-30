import { useEffect, useState, useSyncExternalStore } from 'react';
import { ApiError } from '../../api/client';
import { ReleaseClient, type Voice, type VoicePreferences, type Language } from '../../api/release';
import type { AudioCoordinator } from '../../audio/audioCoordinator';
import { GestureTarget } from '../gesture-navigation/GestureTarget';
import { defaultVoice } from "../../api/release";
export function VoiceSelection({ client, audio, initial = defaultVoice, onComplete }: { client: ReleaseClient; audio: AudioCoordinator; initial?: VoicePreferences; onComplete: (preferences: VoicePreferences, persisted: boolean) => void }) {
  const [draft, setDraft] = useState(initial), [voices, setVoices] = useState<Voice[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const playback = useSyncExternalStore(audio.subscribe, audio.getSnapshot);
  useEffect(() => {
    const controller = new AbortController();
    void client.voices(draft.language, controller.signal).then(result => {
      if (!controller.signal.aborted) { setVoices(result.voices.slice(0, 6)); if (!result.voices.length) setError('Доступные голоса не найдены. Можно продолжить без звука.'); }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof ApiError && error.status === 503 ? 'ElevenLabs недоступен для этого языка. Продолжите без звука.' : 'Голоса не загружены. Проверьте подключение.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); audio.stop(); };
  }, [client, audio, draft.language]);
  async function save(silent: boolean) {
    if (busy) return; setBusy(true); audio.stop();
    const value = { voice_id: silent ? draft.voice_id : draft.voice_id, language: draft.language, style: draft.style, audio_enabled: !silent };
    try { const saved = await client.savePreferences(value); onComplete(saved, true); }
    catch { if (silent) onComplete({ ...draft, audio_enabled: false }, false); else setError('Не удалось сохранить голос. Повторите или продолжите без звука.'); }
    finally { setBusy(false); }
  }
  return <section className="voice-screen" role="dialog" aria-modal="true" aria-labelledby="voice-title" data-guide-target="voice">
    <p className="dm-label">ELEVENLABS / COACH VOICE</p><h2 id="voice-title">Выберите голос тренера</h2>
    <p>Предпрослушивание воспроизводит выбранный голос. Язык и стиль сохраняются отдельно.</p>
    <div className="dm-actions"><label>Язык <select value={draft.language} onChange={event => { audio.stop(); setLoading(true); setVoices([]); setError(''); setDraft({ ...draft, language: event.target.value as Language, voice_id: null }); }}><option value="ru">Русский</option><option value="kk">Қазақша</option><option value="en">English</option></select></label>
      <label>Стиль <select value={draft.style} onChange={event => { audio.stop(); setDraft({ ...draft, style: event.target.value as VoicePreferences['style'] }); }}><option value="calm">Спокойный</option><option value="supportive">Поддерживающий</option><option value="energetic">Энергичный</option><option value="strict">Строгий</option></select></label></div>
    {loading && <p role="status">Загружаем доступные голоса…</p>}{error && <p role="alert">{error}</p>}
    <div className="voice-grid">{voices.map(voice => <article className={`dm-panel ${draft.voice_id === voice.voice_id ? 'selected' : ''}`} key={voice.voice_id}>
      <h3>{voice.name}</h3><p>{voice.description}</p><GestureTarget id={`voice-${voice.voice_id}`} selected={draft.voice_id === voice.voice_id} onSelect={() => { audio.stop(); setDraft({ ...draft, voice_id: voice.voice_id }); }}>Выбрать {voice.name}</GestureTarget>
      <button onClick={() => { audio.unlock(); audio.preview(`preview:${voice.voice_id}`, `Предпрослушивание: ${voice.name}`, signal => client.preview(voice.voice_id, draft.language, draft.style, signal)); }}>Послушать {voice.name}</button>
      {playback.activeId === `preview:${voice.voice_id}` && <p role="status">{playback.status === 'playing' ? 'Воспроизводится' : playback.status === 'loading' ? 'Загрузка аудио' : playback.status === 'blocked' ? 'Нажмите «Включить звук»' : 'Аудио недоступно'}</p>}
    </article>)}</div>
    <div className="dm-actions"><button onClick={() => audio.stop()}>Остановить preview</button><button onClick={() => { audio.unlock(); audio.setMuted(false); }}>Включить звук</button>
      <GestureTarget id="voice-continue" disabled={!draft.voice_id || busy || !voices.some(voice => voice.voice_id === draft.voice_id)} onSelect={() => { void save(false); }}>Сохранить и продолжить</GestureTarget>
      <GestureTarget id="voice-silent" disabled={busy} onSelect={() => { void save(true); }}>Продолжить без звука</GestureTarget></div>
    <p className="dm-label">Нет ключей в браузере · камера работает независимо от голоса</p>
  </section>;
}
