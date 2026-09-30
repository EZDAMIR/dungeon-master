import { LanguageSwitcher } from '../gesture-navigation/LanguageSwitcher'
import { useTranslation } from '../../shared/uiLanguage'
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore, useRef } from 'react'
import { createPortal } from 'react-dom'
import { productText } from '../../shared/productCopy'
import { useModalFocus } from '../../shared/useModalFocus'
import { ApiError } from '../../api/client'
import { ReleaseClient, defaultVoice, type Voice, type VoicePreferences } from '../../api/release'
import type { AudioCoordinator } from '../../audio/audioCoordinator'
import { GestureTarget } from '../gesture-navigation/GestureTarget'
import { useGestureStore } from '../gesture-navigation/gestureNavigation'
import { GestureCursor } from '../gesture-navigation/GestureCursor'
import { groupVoices, type VoiceLanguageGroup } from './voiceLanguages'
import { voiceDescription } from './voiceDescriptions'

export function VoiceSelection({ client, audio, initial = defaultVoice, onComplete, onClose }: { client: ReleaseClient; audio: AudioCoordinator; initial?: VoicePreferences; onComplete: (preferences: VoicePreferences, persisted: boolean) => void; onClose?: () => void }) {
  const { translateUi, language: uiLanguage } = useTranslation()

  const [draft, setDraft] = useState(initial), [voices, setVoices] = useState<Voice[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false), [nextToken, setNextToken] = useState<string | null>(null), [reload, setReload] = useState(0)
  const [sessionExpired, setSessionExpired] = useState(false)
  const modal = useRef<HTMLElement | null>(null), saving = useRef(false), pageRequest = useRef<AbortController | null>(null)
  const store = useGestureStore(), playback = useSyncExternalStore(audio.subscribe, audio.getSnapshot)
  const t = (key: Parameters<typeof productText>[1]) => productText(draft.language, key)
  const word = useCallback((ru: string, kk: string, en: string) => draft.language === 'ru' ? ru : draft.language === 'kk' ? kk : en, [draft.language])
  const groupTitle = (language: VoiceLanguageGroup) => ({ ru: 'Русский', kk: 'Қазақша', en: 'English', multilingual: word('Мультиязычные', 'Көптілді', 'Multilingual'), unlabelled: word('Язык не указан', 'Тіл көрсетілмеген', 'Language not specified'), other: word('Другие языки', 'Басқа тілдер', 'Other languages') })[language]
  const closeRef = useRef(() => {})
  useLayoutEffect(() => { closeRef.current = () => { if (saving.current) return; if (onClose) { audio.stop(); onClose() } else void save(true) } })
  const resetList = () => { setLoading(true); setVoices([]); setNextToken(null); setError(''); setSessionExpired(false) }
  useEffect(() => {
    store.setTargetScope(modal.current)
    const remove = store.subscribeEvents(event => { if (event.type === 'gesture.confirmed' && event.command === 'back') closeRef.current() })
    store.onPhysicalInteraction()
    return () => { remove(); store.setTargetScope(null); store.onPhysicalInteraction() }
  }, [store])
  useModalFocus(modal, () => closeRef.current())
  useEffect(() => {
    pageRequest.current?.abort()
    const controller = new AbortController()
    void client.voices(draft.language, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setVoices(result.voices); setNextToken(result.has_more ? result.next_page_token : null)
      if (!result.voices.length) setError(word('Для этого языка пока нет доступных голосов. Можно продолжить без звука.', 'Бұл тілде әзірге дауыс жоқ. Дыбыссыз жалғастыруға болады.', 'No voices are available for this language yet. You can continue without audio.'))
    }).catch(error => {
      if (controller.signal.aborted) return
      const expired = error instanceof ApiError && error.status === 401
      setSessionExpired(expired)
      setError(expired ? word('Гостевая сессия истекла и не восстановилась. Начни новую сессию, чтобы загрузить голоса. Прежний прогресс останется связан с прежней сессией.', 'Қонақ сессиясының мерзімі өтіп, қалпына келмеді. Дауыстар үшін жаңа сессия баста. Бұрынғы нәтижелер бұрынғы сессияда қалады.', 'Your guest session expired and could not be restored. Start a new session to load voices. Previous progress stays with the previous session.') : error instanceof ApiError && error.status === 503 ? word('Голоса для этого языка сейчас недоступны. Выбери другой язык или продолжи без звука.', 'Бұл тілдің дауыстары қолжетімсіз. Басқа тілді таңда немесе дыбыссыз жалғастыр.', 'Voices for this language are unavailable. Choose another language or continue without audio.') : word('Не удалось загрузить голоса. Попробуй ещё раз или продолжи без звука.', 'Дауыстар жүктелмеді. Қайталап көр немесе дыбыссыз жалғастыр.', 'Could not load voices. Retry or continue without audio.'))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); pageRequest.current?.abort(); audio.stop() }
  }, [client, audio, draft.language, reload, word])
  async function retryList() {
    resetList()
    await client.backend.bootstrap(false)
    setReload(value => value + 1)
  }
  async function reconnect() {
    if (saving.current) return
    saving.current = true; setBusy(true)
    try {
      await client.backend.startNewGuest()
      resetList(); setReload(value => value + 1)
    } catch { setError(word('Не удалось подключиться. Попробуй ещё раз.', 'Қосылу мүмкін болмады. Қайта көр.', 'Could not reconnect. Try again.')) }
    finally { saving.current = false; setBusy(false) }
  }
  async function loadMore() {
    if (!nextToken || loading) return
    pageRequest.current?.abort(); const controller = new AbortController(); pageRequest.current = controller
    setLoading(true)
    try {
      const result = await client.voices(draft.language, controller.signal, nextToken)
      if (controller.signal.aborted) return
      setVoices(current => [...new Map([...current, ...result.voices].map(voice => [voice.voice_id, voice])).values()])
      setNextToken(result.has_more ? result.next_page_token : null)
    } catch { if (!controller.signal.aborted) setError(word('Не удалось загрузить следующую страницу.', 'Келесі бет жүктелмеді.', 'Could not load more voices.')) }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }
  async function save(silent: boolean) {
    if (saving.current) return
    saving.current = true; setBusy(true); audio.stop()
    const value = { voice_id: silent ? null : draft.voice_id, language: draft.language, style: draft.style, audio_enabled: !silent }
    try { const saved = await client.savePreferences(value); onComplete(saved, true) }
    catch { if (silent) onComplete({ ...draft, voice_id: null, audio_enabled: false }, false); else setError(word('Не удалось сохранить голос. Повтори или продолжи без звука.', 'Дауыс сақталмады. Қайтала немесе дыбыссыз жалғастыр.', 'Could not save your voice. Retry or continue without audio.')) }
    finally { saving.current = false; setBusy(false) }
  }
  const groups = groupVoices(voices, draft.language, showAll)
  return createPortal(<section ref={modal} tabIndex={-1} data-product-modal className="voice-screen" role="dialog" aria-modal="true" aria-labelledby="voice-title" data-guide-target="voice">
    <GestureCursor/><div className="modal-language-switcher"><LanguageSwitcher id="nav-voice-language" /></div>
    <div className="voice-content"><GestureTarget id="voice-silent-top" className="voice-top-skip" disabled={busy} onSelect={() => closeRef.current()}>{translateUi(onClose && initial.revision > 0 ? word('Закрыть', 'Жабу', 'Close') : word('Настроить позже', 'Кейін баптау', 'Set up later'))}</GestureTarget><p className="dm-label">{translateUi("DUNGEON MASTER / ")}{translateUi(word('ТВОЙ ТРЕНЕР', 'СЕНІҢ ЖАТТЫҚТЫРУШЫҢ', 'YOUR COACH'))}</p><h2 id="voice-title">{translateUi(t('voiceTitle'))}</h2><p>{translateUi(word('Сначала выбери язык подсказок, затем послушай и выбери голос. Звук необязателен.', 'Алдымен кеңес тілін таңда, кейін дауысты тыңдап таңда. Дыбыс міндетті емес.', 'Choose your coaching language, then listen and pick a voice. Audio is optional.'))}</p>
      <div className="voice-language-tabs" role="group" aria-label={translateUi(t('language'))}>{(['ru', 'kk', 'en'] as const).map(language => <GestureTarget key={language} id={`voice-language-${language}`} selected={draft.language === language} onSelect={() => { if (language === draft.language) return; audio.stop(); resetList(); setDraft({ ...draft, language, voice_id: null }); setShowAll(false) }}>{translateUi(language === 'ru' ? 'Русский' : language === 'kk' ? 'Қазақша' : 'English')}</GestureTarget>)}</div>
      <div className="voice-style-row"><span>{translateUi(t('style'))}</span><div className="dm-actions" role="group" aria-label={translateUi(t('style'))}>{(['calm', 'supportive', 'energetic', 'strict'] as const).map(style => <GestureTarget key={style} id={`voice-style-${style}`} selected={draft.style === style} onSelect={() => { audio.stop(); setDraft({ ...draft, style }) }}>{translateUi(t(style))}</GestureTarget>)}</div></div>
      {loading && <p role="status">{translateUi(t('loadingVoices'))}</p>}{error && <div className="voice-error"><p role="alert">{translateUi(error)}</p><GestureTarget id="voice-retry" disabled={loading || busy} onSelect={() => { void retryList() }}>{translateUi(word('Попробовать снова', 'Қайта көру', 'Retry'))}</GestureTarget>{sessionExpired && <GestureTarget id="voice-new-session" disabled={loading || busy} onSelect={() => { void reconnect() }}>{translateUi(word('Начать новую гостевую сессию', 'Жаңа қонақ сессиясын бастау', 'Start a new guest session'))}</GestureTarget>}</div>}
      {!loading && voices.length > 0 && !groups.length && <p role="status">{translateUi(word('В списке нет голосов с меткой этого языка. Посмотри другие языки и послушай пример.', 'Тізімде бұл тіл белгісі бар дауыс жоқ. Басқа тілдерді қарап, мысалды тыңда.', 'No voices are labelled for this language. Browse other languages and listen to a sample.'))}</p>}
      {groups.map(group => <section className="voice-language-group" key={group.key} aria-label={translateUi(group.label ?? groupTitle(group.language))}><h3>{translateUi(group.label ?? groupTitle(group.language))} <span>{group.voices.length}</span></h3>
        {(group.language === 'unlabelled' || group.language === 'multilingual') && <p className="voice-group-hint">{translateUi(word('Послушай пример на выбранном языке перед выбором.', 'Таңдау алдында осы тілдегі мысалды тыңда.', 'Listen to a sample in your chosen language before selecting.'))}</p>}
        <div className="voice-grid">{group.voices.map(voice => <article className={`dm-panel ${draft.voice_id === voice.voice_id ? 'selected' : ''}`} key={voice.voice_id}><div className="voice-card-heading"><h4>{translateUi(voice.name)}</h4>{draft.voice_id === voice.voice_id && <span>✓</span>}</div><p>{voiceDescription(voice, uiLanguage)}</p>
          <GestureTarget id={`voice-preview-${voice.voice_id}`} onSelect={() => { audio.unlock(); audio.preview(`preview:${voice.voice_id}`, `${t('preview')}: ${voice.name}`, signal => client.preview(voice.voice_id, draft.language, draft.style, signal)) }}>{translateUi(t('preview'))} {translateUi(voice.name)}</GestureTarget>
          <GestureTarget id={`voice-${voice.voice_id}`} selected={draft.voice_id === voice.voice_id} onSelect={() => { audio.stop(); setDraft({ ...draft, voice_id: voice.voice_id }) }}>{translateUi(draft.voice_id === voice.voice_id ? '✓ ' : '')}{translateUi(t('select'))} {translateUi(voice.name)}</GestureTarget>
          {playback.activeId === `preview:${voice.voice_id}` && <p role="status">{translateUi(playback.status === 'playing' ? word('Воспроизводится', 'Ойнатылуда', 'Playing') : playback.status === 'loading' ? word('Загрузка примера…', 'Мысал жүктелуде…', 'Loading sample…') : playback.status === 'blocked' ? word('Нажми «Включить звук» мышью или клавиатурой.', '«Дыбысты қосу» батырмасын бас.', 'Click Enable audio with your mouse or keyboard.') : word('Пример недоступен', 'Мысал қолжетімсіз', 'Sample unavailable'))}</p>}
        </article>)}</div></section>)}
      <div className="dm-actions"><GestureTarget id="voice-all-languages" selected={showAll} onSelect={() => setShowAll(value => !value)}>{translateUi(showAll ? word('Только выбранный язык', 'Тек таңдалған тіл', 'Only chosen language') : word('Показать все языки', 'Барлық тілдерді көрсету', 'Show all languages'))}</GestureTarget>{nextToken && <GestureTarget id="voice-more" disabled={loading} onSelect={() => { void loadMore() }}>{translateUi(word('Загрузить ещё', 'Тағы жүктеу', 'Load more'))}</GestureTarget>}</div>
      <div className="voice-footer"><div className="dm-actions"><GestureTarget id="voice-enable-audio" selected={playback.status !== 'muted'} onSelect={() => { audio.setMuted(false); audio.unlock(); audio.tone(660) }}>{translateUi(t('enableAudio'))}</GestureTarget><GestureTarget id="voice-stop-preview" onSelect={() => audio.stop()}>{translateUi(t('stopPreview'))}</GestureTarget></div>
        {playback.status === 'unavailable' && <p role="alert">{translateUi(word('Пример сейчас недоступен. Выбери другой голос или продолжи без звука.', 'Мысал қолжетімсіз. Басқа дауысты таңда немесе дыбыссыз жалғастыр.', 'Preview is unavailable. Choose another voice or continue without audio.'))}</p>}
        <div className="dm-actions"><GestureTarget id="voice-continue" className="voice-primary" disabled={!draft.voice_id || busy || !voices.some(voice => voice.voice_id === draft.voice_id)} onSelect={() => { void save(false) }}>{translateUi(busy ? word('Сохраняем…', 'Сақталуда…', 'Saving…') : t('saveContinue'))}</GestureTarget><GestureTarget id="voice-silent" disabled={busy} onSelect={() => { void save(true) }}>{translateUi(t('silent'))}</GestureTarget></div>
      </div>
    </div>
  </section>, document.body)
}
