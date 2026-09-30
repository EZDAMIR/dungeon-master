import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { VoiceSelection } from './VoiceSelection'
import { groupVoices, voiceLanguageGroup } from './voiceLanguages'
import { AudioCoordinator } from '../../audio/audioCoordinator'
import { ReleaseClient, type Voice, type VoicePreferences } from '../../api/release'
import { ApiError } from '../../api/client'
import { BackendStore } from '../../store/backend'
import { NavigationContext } from '../gesture-navigation/gestureNavigation'
import { GestureStore } from '../gesture-navigation/gestureStore'
import { INITIAL_STATE } from '../../app/modes'
import { UiLanguageContext } from '../../shared/uiLanguage'

const voices: Voice[] = [
  { voice_id: 'ru-1', name: 'Анна', description: 'Спокойный голос', labels: { language: 'Russian' } },
  { voice_id: 'en-1', name: 'Sam', description: 'Clear voice', labels: { language: 'en-US' } },
  { voice_id: 'kk-1', name: 'Айша', description: 'Жұмсақ дауыс', labels: { language: 'Kazakh' } },
  { voice_id: 'unknown', name: 'Alex', description: null, labels: {} },
]
let root: Root, host: HTMLDivElement, audio: AudioCoordinator
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  audio = new AudioCoordinator(); vi.spyOn(audio, 'unlock').mockImplementation(() => {}); vi.spyOn(audio, 'tone').mockImplementation(() => {})
})
afterEach(() => { act(() => root.unmount()); audio.close(); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
async function setup(options: { initial?: VoicePreferences; onClose?: () => void } = {}, listVoices = voices) {
  const store = new GestureStore(); store.setAppState({ ...INITIAL_STATE, mode: 'PROFILE' })
  const client = new ReleaseClient(new BackendStore()), complete = vi.fn()
  vi.spyOn(client.backend, 'bootstrap').mockResolvedValue()
  const list = vi.spyOn(client, 'voices').mockResolvedValue({ voices: listVoices, language: 'ru', model_id: 'model', has_more: false, next_page_token: null })
  const save = vi.spyOn(client, 'savePreferences').mockImplementation(async value => ({ ...value, revision: 1 }))
  await act(async () => root.render(<NavigationContext.Provider value={store}><VoiceSelection audio={audio} client={client} onComplete={complete} {...options}/></NavigationContext.Provider>))
  const pinch = async (id: string) => { await act(async () => store.emit({ type: 'gesture.confirmed', command: 'select', targetId: id, at: 100 })) }
  return { client, store, complete, list, save, pinch }
}
it('groups native language labels without inventing a language for unlabelled voices', () => {
  expect(voices.map(voiceLanguageGroup)).toEqual(['ru', 'en', 'kk', 'unlabelled'])
  expect(groupVoices(voices, 'ru', false).map(group => group.language)).toEqual(['ru', 'unlabelled'])
  expect(groupVoices(voices, 'kk', true).map(group => group.language)).toEqual(['kk', 'ru', 'en', 'unlabelled'])
  expect(voiceLanguageGroup({ ...voices[0], labels: { languages: 'Russian, English' } })).toBe('multilingual')
  expect(voiceLanguageGroup({ ...voices[0], labels: { languages: 'English, French' } })).toBe('multilingual')
  const other = groupVoices([{ ...voices[0], labels: { language: 'French' } }, { ...voices[1], labels: { language: 'Spanish' } }], 'ru', true)
  expect(other.map(group => group.label)).toEqual(['French', 'Spanish'])
})
it('filters by language and supports gesture preview, enable audio and selection/save', async () => {
  const s = await setup(), preview = vi.spyOn(audio, 'preview').mockImplementation(() => {})
  expect(document.querySelector('[data-gesture-target="voice-ru-1"]')).not.toBeNull()
  expect(document.querySelector('[data-gesture-target="voice-en-1"]')).toBeNull()
  await s.pinch('voice-enable-audio'); expect(audio.isMuted()).toBe(false); expect(audio.unlock).toHaveBeenCalled()
  await s.pinch('voice-preview-ru-1'); expect(preview).toHaveBeenCalledWith('preview:ru-1', expect.any(String), expect.any(Function))
  await s.pinch('voice-ru-1'); await s.pinch('voice-continue')
  expect(s.save).toHaveBeenCalledWith({ voice_id: 'ru-1', language: 'ru', style: 'supportive', audio_enabled: true })
  expect(s.complete).toHaveBeenCalledWith(expect.objectContaining({ language: 'ru', voice_id: 'ru-1' }), true)
})
it('renders readable API-derived descriptions in the interface language', async () => {
  const s = await setup({}, [{ ...voices[0], description: 'Deep bass, energetic. Perfect for wrestling commercials.' }, { ...voices[3], description: '123123123' }])
  const descriptions = () => [...document.querySelectorAll('.voice-grid article > p')].map(element => element.textContent)
  expect(descriptions()).toEqual(['Низкий, насыщенный тембр. Бодрая, энергичная подача.', 'Послушай пример, чтобы оценить тембр и подачу.'])
  await act(async () => root.render(<UiLanguageContext.Provider value={{ language: 'kk', setLanguage: () => {} }}><NavigationContext.Provider value={s.store}><VoiceSelection audio={audio} client={s.client} onComplete={s.complete}/></NavigationContext.Provider></UiLanguageContext.Provider>))
  expect(descriptions()).toEqual(['Төмен, қанық тембр. Сергек, жігерлі сөйлеу мәнері.', 'Тембрі мен сөйлеу мәнерін бағалау үшін үлгіні тыңда.'])
  expect(document.querySelector('.voice-grid')?.textContent).not.toMatch(/commercials|123123123/)
})
it('changes voice groups with language and clears stale selections', async () => {
  const s = await setup()
  await s.pinch('voice-ru-1'); await s.pinch('voice-language-kk')
  expect(s.list).toHaveBeenLastCalledWith('kk', expect.any(AbortSignal))
  expect(document.querySelector('[data-gesture-target="voice-kk-1"]')).not.toBeNull()
  expect(document.querySelector<HTMLButtonElement>('[data-gesture-target="voice-continue"]')?.disabled).toBe(true)
  expect(document.querySelector('[data-gesture-target="voice-ru-1"]')).toBeNull()
  await s.pinch('voice-all-languages'); expect(document.querySelector('[data-gesture-target="voice-ru-1"]')).not.toBeNull()
})
it('provider failure leaves retry and a usable silent exit, and restores the page after close', async () => {
  const s = await setup(); s.list.mockRejectedValue(new Error('offline')); s.save.mockRejectedValue(new Error('offline'))
  await s.pinch('voice-language-en'); expect(document.querySelector('[role=alert]')?.textContent).toContain('Не удалось загрузить голоса')
  await s.pinch('voice-silent-top'); expect(s.complete).toHaveBeenCalledWith(expect.objectContaining({ audio_enabled: false, voice_id: null }), false)
  await act(async () => root.render(null)); expect(host.inert).toBeFalsy()
})
it('reloads voices after retry when the API connection is restored', async () => {
  const s = await setup()
  s.list.mockRejectedValueOnce(new ApiError('http', 404))
  await s.pinch('voice-language-en')
  expect(document.querySelector('[role=alert]')?.textContent).toContain('Не удалось загрузить голоса')
  expect(document.querySelector('[data-gesture-target="voice-en-1"]')).toBeNull()
  await s.pinch('voice-retry')
  expect(s.list).toHaveBeenLastCalledWith('en', expect.any(AbortSignal))
  expect(document.querySelector('[role=alert]')).toBeNull()
  expect(document.querySelector('[data-gesture-target="voice-en-1"]')).not.toBeNull()
  await s.pinch('voice-en-1'); await s.pinch('voice-continue')
  expect(s.complete).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', voice_id: 'en-1', audio_enabled: true }), true)
})
it('explains an expired session and loads voices after explicit guest recovery', async () => {
  const s = await setup()
  s.list.mockRejectedValueOnce(new ApiError('http', 401, 'recovery_required'))
  await s.pinch('voice-language-en')
  expect(document.querySelector('[role=alert]')?.textContent).toContain('Гостевая сессия истекла')
  const reconnect = vi.spyOn(s.client.backend, 'startNewGuest').mockResolvedValue()
  expect(reconnect).not.toHaveBeenCalled()
  await s.pinch('voice-new-session')
  expect(reconnect).toHaveBeenCalledOnce()
  expect(document.querySelector('[role=alert]')).toBeNull()
  expect(document.querySelector('[data-gesture-target="voice-en-1"]')).not.toBeNull()
})
it('loads later pages without duplicating gesture targets', async () => {
  const s = await setup()
  s.list.mockResolvedValueOnce({ voices, language: 'ru', model_id: 'model', has_more: true, next_page_token: 'page-2' })
  await s.pinch('voice-language-en')
  s.list.mockResolvedValueOnce({ voices: [...voices, { ...voices[1], voice_id: 'en-2', name: 'Jo' }], language: 'en', model_id: 'model', has_more: false, next_page_token: null })
  await s.pinch('voice-more'); expect(s.list).toHaveBeenLastCalledWith('en', expect.any(AbortSignal), 'page-2')
  expect(document.querySelectorAll('[data-gesture-target="voice-en-1"]')).toHaveLength(1)
  expect(document.querySelector('[data-gesture-target="voice-en-2"]')).not.toBeNull()
})
it.each(['button', 'escape', 'back'])('dismisses existing voice settings with %s without clearing the saved voice', async method => {
  const onClose = vi.fn(), initial: VoicePreferences = { voice_id: 'ru-1', language: 'ru', style: 'calm', audio_enabled: true, revision: 3 };
  const s = await setup({ initial, onClose });
  expect(document.querySelector('[data-gesture-target="voice-silent-top"]')?.textContent).toBe('Закрыть');
  await s.pinch('voice-style-strict');
  if (method === 'button') await s.pinch('voice-silent-top');
  else if (method === 'escape') await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  else await act(async () => s.store.emit({ type: 'gesture.confirmed', command: 'back', at: 500 }));
  expect(onClose).toHaveBeenCalledOnce(); expect(s.save).not.toHaveBeenCalled(); expect(s.complete).not.toHaveBeenCalled();
});
it('keeps settings open on save failure and ignores dismissals during an active save', async () => {
  const onClose = vi.fn(), s = await setup({ onClose }); let reject!: (reason: Error) => void;
  s.save.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
  await s.pinch('voice-ru-1'); await s.pinch('voice-continue');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => reject(new Error('offline')));
  expect(document.querySelector('[role=alert]')?.textContent).toContain('Не удалось сохранить голос');
  expect(s.complete).not.toHaveBeenCalled(); await s.pinch('voice-silent-top'); expect(onClose).toHaveBeenCalledOnce();
});
