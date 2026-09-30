import { useEffect, useState, useSyncExternalStore, useRef } from 'react';
import { productText } from "../../shared/productCopy";
import { createPortal } from 'react-dom';
import { useModalFocus } from '../../shared/useModalFocus';
import { ApiError } from '../../api/client';
import { ReleaseClient, type Voice, type VoicePreferences, type Capabilities } from '../../api/release';
import type { AudioCoordinator } from '../../audio/audioCoordinator';
import { GestureTarget } from '../gesture-navigation/GestureTarget';
import { useGestureStore } from '../gesture-navigation/gestureNavigation';
import { GestureCursor } from '../gesture-navigation/GestureCursor';
import { defaultVoice } from "../../api/release";
export function VoiceSelection({ client, audio, initial = defaultVoice, onComplete }: { client: ReleaseClient; audio: AudioCoordinator; initial?: VoicePreferences; onComplete: (preferences: VoicePreferences, persisted: boolean) => void }) {
  const [draft, setDraft] = useState(initial), [voices, setVoices] = useState<Voice[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null), [model, setModel] = useState('');
  const t = (key: Parameters<typeof productText>[1]) => productText(draft.language, key);
  const modal = useRef<HTMLElement | null>(null);
  const store=useGestureStore();
  const closeRef=useRef(()=>{});closeRef.current=()=>{if(!busy)void save(true)};
  useEffect(()=>{
    store.setTargetScope(modal.current);
    const remove=store.subscribeEvents(event=>{if(event.type==='gesture.confirmed'&&event.command==='back')closeRef.current()});
    store.onPhysicalInteraction();
    return()=>{remove();store.setTargetScope(null);store.onPhysicalInteraction()};
  },[store]);
  useModalFocus(modal, () => { if (!busy) void save(true); });
  const playback = useSyncExternalStore(audio.subscribe, audio.getSnapshot);
  useEffect(() => {
    const controller = new AbortController();
    void client.capabilities(controller.signal).then(result => { if (!controller.signal.aborted) setCapabilities(result); }).catch(() => {});
    void client.voices(draft.language, controller.signal).then(result => {
      if (!controller.signal.aborted) { setVoices(result.voices.slice(0, 6)); setModel(result.model_id); if (!result.voices.length) setError('Доступные голоса не найдены. Можно продолжить без звука.'); }
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
  return createPortal(<section ref={modal} tabIndex={-1} data-product-modal className="voice-screen" role="dialog" aria-modal="true" aria-labelledby="voice-title" data-guide-target="voice">
    <GestureCursor/>
    <p className="dm-label">ELEVENLABS / COACH VOICE</p><h2 id="voice-title">{t("voiceTitle")}</h2>
    <p>{t("voiceDescription")}</p>
    <div className="dm-actions" role="group" aria-label={t("language")}>{(['ru','kk','en'] as const).map(language => <GestureTarget key={language} id={`voice-language-${language}`} selected={draft.language === language} onSelect={() => { audio.stop(); setLoading(true); setVoices([]); setError(''); setDraft({ ...draft, language, voice_id: null }); }}>{language === 'ru' ? 'Русский' : language === 'kk' ? 'Қазақша' : 'English'}</GestureTarget>)}</div>
    <div className="dm-actions" role="group" aria-label={t("style")}>{(['calm','supportive','energetic','strict'] as const).map(style => <GestureTarget key={style} id={`voice-style-${style}`} selected={draft.style === style} onSelect={() => { audio.stop(); setDraft({ ...draft, style }); }}>{t(style)}</GestureTarget>)}</div>
    {capabilities && <p className="dm-label">ElevenLabs: {capabilities.elevenlabs.disabled ? "выключен" : capabilities.elevenlabs.unavailable ? "недоступен" : capabilities.elevenlabs.configured ? "настроен" : "нет конфигурации"} · {capabilities.elevenlabs.last_check ? `проверка ${capabilities.elevenlabs.last_check}` : "live проверка ещё не выполнена"} {model && `· ${model}`}</p>}
    {loading && <p role="status">{t("loadingVoices")}</p>}{error && <p role="alert">{error}</p>}
    <div className="voice-grid">{voices.map(voice => <article className={`dm-panel ${draft.voice_id === voice.voice_id ? 'selected' : ''}`} key={voice.voice_id}>
      <h3>{voice.name}</h3><p>{voice.description}</p><GestureTarget id={`voice-${voice.voice_id}`} selected={draft.voice_id === voice.voice_id} onSelect={() => { audio.stop(); setDraft({ ...draft, voice_id: voice.voice_id }); }}>{t("select")} {voice.name}</GestureTarget>
      <button onClick={() => { audio.unlock(); audio.preview(`preview:${voice.voice_id}`, `Предпрослушивание: ${voice.name}`, signal => client.preview(voice.voice_id, draft.language, draft.style, signal)); }}>{t("preview")} {voice.name}</button>
      {playback.activeId === `preview:${voice.voice_id}` && <p role="status">{playback.status === 'playing' ? 'Воспроизводится' : playback.status === 'loading' ? 'Загрузка аудио' : playback.status === 'blocked' ? 'Нажмите «Включить звук»' : 'Аудио недоступно'}</p>}
    </article>)}</div>
    {playback.status === "unavailable" && <p role="alert">Аудио недоступно. Выберите другой голос или продолжите без звука.</p>}
    <div className="dm-actions"><button onClick={() => audio.stop()}>{t("stopPreview")}</button><button onClick={() => { audio.unlock(); audio.setMuted(false); }}>{t("enableAudio")}</button>
      <GestureTarget id="voice-continue" disabled={!draft.voice_id || busy || !voices.some(voice => voice.voice_id === draft.voice_id)} onSelect={() => { void save(false); }}>{t("saveContinue")}</GestureTarget>
      <GestureTarget id="voice-silent" disabled={busy} onSelect={() => { void save(true); }}>{t("silent")}</GestureTarget></div>
    <p className="dm-label">Нет ключей в браузере · камера работает независимо от голоса</p>
  </section>, document.body);
}
