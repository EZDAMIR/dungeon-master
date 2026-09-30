import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from '../App'
import { UiLanguageProvider } from '../UiLanguageProvider'
import { INITIAL_STATE, emptyWorkout } from '../modes'
import { GestureNavigationProvider } from '../../features/gesture-navigation/GestureNavigationProvider'
import { GestureStore } from '../../features/gesture-navigation/gestureStore'
import { ContextFlow } from '../../features/personalization/ContextFlow'
import { CameraCoachShell } from '../../features/personalization/CameraCoachShell'
import { RestView, NextExerciseView } from '../../features/workout-session/SessionViews'
import { WorkoutSessionRunner } from '../../features/workout-session/runner'
import { validateSpec } from '../../vision/exercises/generic/validator'
import calfSpec from '../../vision/exercises/generic/tests/calfSpec.json'
import { inputPreferences } from '../../features/input-settings/preferences'
import { MenuPage } from '../../pages/MenuPage'
import { CalibrationPage } from '../../pages/CalibrationPage'
import { CountdownPage } from '../../pages/CountdownPage'
import { WorkoutPage } from '../../pages/WorkoutPage'
import { ResultsPage } from '../../pages/ResultsPage'
import { SessionResultsPage } from '../../pages/SessionResultsPage'
import { TutorialPage } from '../../pages/TutorialPage'
import { PlanPage } from '../../pages/PlanPage'
import { ProgressPage } from '../../pages/ProgressPage'
import { BackendStore } from '../../store/backend'
import { ApiClient } from '../../api/client'
import { SafeStorage } from '../../store/persistence'
import { getUiLanguage, languageStorageKey, setUiLanguage } from '../../store/uiLanguage'
import { translateUi, type UiLanguage } from '../../shared/uiLanguage'
import type { ActiveExercise } from '../../api/aiCoach'

let root: Root, host: HTMLDivElement, backend: BackendStore
let saved: Map<string, string>
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  saved = new Map()
  vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) })
  setUiLanguage('ru')
  inputPreferences.set({ mode: 'mouse', onboardingCompleted: false })
  backend = new BackendStore(new ApiClient('http://test', 50, vi.fn().mockRejectedValue(new Error('offline'))), new SafeStorage())
  vi.spyOn(backend, 'attach').mockReturnValue(() => {})
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  window.history.replaceState({}, '', '/?fakeVision=1')
})
afterEach(() => {
  act(() => root.unmount()); host.remove()
  setUiLanguage('ru')
  vi.restoreAllMocks(); vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})
const noop = () => {}
function render(children: ReactNode) {
  act(() => root.render(<UiLanguageProvider><GestureNavigationProvider state={INITIAL_STATE} onEvent={() => INITIAL_STATE}>{children}</GestureNavigationProvider></UiLanguageProvider>))
}
function select(id: string) {
  act(() => host.querySelector<HTMLButtonElement>(`[data-gesture-target="${id}"]`)!.click())
}

it('switches the landing page and navigation through the dedicated button and remembers the choice', async () => {
  window.history.replaceState({}, '', '/')
  const camera = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: camera } })
  act(() => root.render(<App backend={backend} />))
  expect(host.querySelector('#landing-title')?.textContent).toBe('ТВОЁ ТЕЛО.ТВОИ ПРАВИЛА.')
  select('nav-language')
  expect([...host.querySelectorAll('#nav-language-options button')].map(button => button.textContent)).toEqual(['Русский', 'Қазақша', 'English'])
  select('nav-language-kk')
  expect(host.querySelector('#landing-title')?.textContent).toBe('СЕНІҢ ДЕНЕҢ.СЕНІҢ ЕРЕЖЕЛЕРІҢ.')
  expect(host.querySelector('[data-gesture-target="nav-plan"]')?.textContent).toBe('Сенің жоспарың')
  expect(document.documentElement.lang).toBe('kk')
  select('nav-language'); select('nav-language-en')
  expect(host.querySelector('#landing-title')?.textContent).toBe('YOUR BODY.YOUR RULES.')
  expect(host.querySelector('[data-gesture-target="nav-build-plan"]')?.textContent).toBe('Build my plan →')
  expect(saved.get(languageStorageKey)).toBe('en')
  expect(camera).not.toHaveBeenCalled()
  vi.resetModules()
  const reloadedStore = await import('../../store/uiLanguage')
  expect(reloadedStore.getUiLanguage()).toBe('en')
})

it('supports keyboard dismissal and gesture selection without navigating', () => {
  const stores: GestureStore[] = [], connect = GestureStore.prototype.connect
  vi.spyOn(GestureStore.prototype, 'connect').mockImplementation(function (this: GestureStore, callback) { connect.call(this, callback); stores.push(this) })
  act(() => root.render(<App backend={backend} />))
  const initialPath = window.location.pathname
  select('nav-language')
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  expect(host.querySelector('#nav-language-options')).toBeNull()
  expect(document.activeElement).toBe(host.querySelector('[data-gesture-target="nav-language"]'))
  select('nav-language')
  act(() => stores.at(-1)!.registry.activate('nav-language-kk'))
  expect(getUiLanguage()).toBe('kk')
  expect(window.location.pathname).toBe(initialPath)
  expect(host.querySelector('[data-gesture-target="nav-language"]')?.getAttribute('aria-expanded')).toBe('false')
})

it.each([
  ['ru', 'Выбери тренировку', 'Калибровка · присед без оборудования', 'Приготовься', 'Тренировка на паузе', 'Подход завершён', 'Базовый план', 'Прогресс · Только сохранённые тренировки', 'Тренировка завершена', 'Интерактивное обучение жестам'],
  ['kk', 'Жаттығуды таңда', 'Қалыпты тексеру · жабдықсыз отырып-тұру', 'Дайындал', 'Жаттығу үзілісте', 'Сет аяқталды', 'Негізгі жоспар', 'Нәтижелер · Тек сақталған жаттығулар', 'Жаттығу аяқталды', 'Қимылдарды интерактивті үйрену'],
  ['en', 'Choose a workout', 'Calibration · Bodyweight Squat', 'Get ready', 'Workout paused', 'Set complete', 'Basic plan', 'Progress · Saved workouts only', 'Your workout is complete', 'Interactive gesture tutorial'],
] as const)('localizes all legacy pages in %s', (language, menu, calibration, countdown, paused, results, plan, progress, session, tutorial) => {
  setUiLanguage(language)
  const workout = { ...emptyWorkout(), ready: true, tracked: true, feedback: { code: 'depth_insufficient' as const, message: 'Опустись немного ниже' } }
  const pages: [ReactNode, string][] = [
    [<MenuPage key="MenuPage" plan={null} planMessage={null} onSelectPlan={noop} timezone="Asia/Almaty" selectedWorkoutId={null} onSelect={noop} onConfirm={noop} onBack={noop} onProfile={noop} onPlan={noop} onProgress={noop} />, menu],
    [<CalibrationPage key="CalibrationPage" view={workout} onBack={noop} />, calibration],
    [<CountdownPage key="CountdownPage" count={3} />, countdown],
    [<WorkoutPage key="WorkoutPage" view={workout} paused onPause={noop} onResume={noop} />, paused],
    [<ResultsPage key="ResultsPage" result={{ exerciseKey: 'bodyweight_squat', engineVersion: 'squat-v1', totalReps: 5, targetReps: 5, acceptedReps: 4, rejectedReps: 1, durationMs: 12000, meanRepDurationMs: 2000, errorCounts: { depth_insufficient: 1, too_fast: 0, incomplete_extension: 0 } }} syncMessage="Сохранено" onRepeat={noop} onMenu={noop} onRetry={noop} />, results],
    [<PlanPage key="PlanPage" plan={null} message={null} onGenerate={async () => {}} onBack={noop} onProfile={noop} />, plan],
    [<ProgressPage key="ProgressPage" progress={null} cached={false} pending={2} onRetry={noop} onBack={noop} />, progress],
    [<SessionResultsPage key="SessionResultsPage" sets={[]} mode="full" status="completed" elapsedMs={10000} names={{}} syncMessage="Сохранено" onProgress={noop} onPlan={noop} onRetry={noop} />, session],
    [<TutorialPage key="TutorialPage" onDone={noop} />, tutorial],
  ]
  for (const [page, text] of pages) {
    render(page)
    if (text === tutorial) expect(host.querySelector(".tutorial")?.getAttribute("aria-label")).toBe(tutorial)
    else expect(host.textContent).toContain(text)
    if (text === paused) expect(host.textContent).toContain(language === "en" ? "Lower a little more" : language === "kk" ? "Сәл төмен түс" : "Опустись немного ниже")
  }
})

it.each(['ru', 'kk', 'en'] as const)('localizes context steps in %s while preserving draft values and native language choices', (language) => {
  setUiLanguage(language)
  const remote = { ...backend.getSnapshot(), context: { self_description: 'Мои собственные слова', preferred_coach_style: 'strict' as const, preferred_language: 'kk' as const, additional_preferences: {} } }
  render(<ContextFlow backend={backend} remote={remote} jury={false} onPlan={noop} onBack={noop} step="intake" />)
  expect(host.querySelector('textarea')?.value).toBe('Мои собственные слова')
  const selects = host.querySelectorAll('select')
  expect(selects[0].value).toBe('strict')
  expect([...selects[0].options].map(option => option.value)).toEqual(['calm', 'supportive', 'energetic', 'strict'])
  expect([...selects[1].options].map(option => option.textContent)).toEqual(['Русский', 'Қазақша', 'English'])
  expect(selects[1].value).toBe('kk')
  const titles = language === 'ru' ? ['Расскажи о себе', 'Добавь данные. Сохрани контроль.', 'Подходит ли такая отправная точка?'] : language === 'kk' ? ['Өзің туралы айт', 'Деректеріңді қос. Бақылау өзіңде.', 'Осы бастапқы жағдай дұрыс па?'] : ['Tell us about you', 'Bring your context. Keep control.', 'Is this a fair starting point?']
  expect(host.textContent).toContain(titles[0])
  render(<ContextFlow backend={backend} remote={remote} jury={false} onPlan={noop} onBack={noop} step="documents" />)
  expect(host.textContent).toContain(titles[1])
  render(<ContextFlow backend={backend} remote={remote} jury={false} onPlan={noop} onBack={noop} step="review" />)
  expect(host.textContent).toContain(titles[2])
})

it('localizes supplied multilingual coaching cues without remounting the workout or changing repetition counts', () => {
  const parsed = validateSpec(calfSpec)
  if (!parsed.valid) throw new Error('Invalid fixture')
  parsed.spec.error_rules[0].messages = { ru: 'Плавное движение', kk: 'Бірқалыпты қимыл', en: 'Smooth movement' }
  const item: ActiveExercise['item'] = { exercise_key: 'calf_raise', display_name: 'Bodyweight Squat', description: '', instruction: '', difficulty: 'beginner', equipment_codes: ['none'], impact_level: 'low', contraindication_tags: [], camera_angle: 'side', sets: 2, target_reps: 6, rest_seconds: 60, tempo_hint: '', reason: '', source_references: [], camera_coaching_mode: 'ai_generated', camera_coaching_status: 'validated', exercise_source: 'ai_generated', detail_available: true, swap_available: false }
  render(<CameraCoachShell exercise={{ item, spec: parsed.spec, language: 'ru', planId: null }} view={{ stage: 'active', label: '', primary: 'Плавное движение', secondary: '', tracking: true, reps: 2, target: 6, side: 'left', correction: true }} stage="WORKOUT" countdown={0} onPause={noop} onResume={noop} onFinish={noop} voice="Voice muted" onVoice={noop} />)
  const counter = host.querySelector('.rep-counter')
  act(() => setUiLanguage('kk'))
  expect(host.querySelector('.distance-cue:not(.cue-measure)')?.textContent).toBe('Бірқалыпты қимыл')
  expect(host.querySelector('.rep-counter')).toBe(counter)
  expect(counter?.textContent).toBe('2 / 6')
  act(() => setUiLanguage('en'))
  expect(host.querySelector('.distance-cue:not(.cue-measure)')?.textContent).toBe('Smooth movement')
})

it('updates other tabs and keeps working when storage is unavailable', () => {
  act(() => root.render(<App backend={backend} />))
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: languageStorageKey, newValue: 'en' })))
  expect(host.querySelector('[data-gesture-target="nav-language"]')?.textContent).toContain('EN')
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
  act(() => setUiLanguage('kk'))
  expect(getUiLanguage()).toBe('kk')
  expect(document.documentElement.lang).toBe('kk')
})

it.each(['ru', 'kk', 'en'] as const)('localizes rest and next-exercise screens in %s', language => {
  setUiLanguage(language)
  const exercise = { exerciseId: 'demo', exerciseKey: 'demo', specRevision: null, movementSpec: null, sets: 2, reps: 5, restSeconds: 30, assessmentMode: 'manual' as const }
  const runner = new WorkoutSessionRunner([exercise, { ...exercise, exerciseId: 'next', exerciseKey: 'next', sets: 1 }])
  runner.start(0); runner.completeManual(1000)
  render(<RestView snapshot={runner.getSnapshot()} onNext={noop} onStop={noop} />)
  expect(host.querySelector('h1')?.textContent).toBe(language === 'ru' ? 'Отдых' : language === 'kk' ? 'Демалыс' : 'Rest')
  runner.next(2000); runner.completeManual(3000)
  render(<NextExerciseView snapshot={runner.getSnapshot()} onNext={noop} onStop={noop} />)
  expect(host.querySelector('h1')?.textContent).toBe(language === 'ru' ? 'Следующее упражнение' : language === 'kk' ? 'Келесі жаттығу' : 'Next exercise')
})

it('defaults to Russian when a stored language is invalid or cannot be read', async () => {
  saved.set(languageStorageKey, 'invalid')
  vi.resetModules()
  expect((await import('../../store/uiLanguage')).getUiLanguage()).toBe('ru')
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') } })
  vi.resetModules()
  expect((await import('../../store/uiLanguage')).getUiLanguage()).toBe('ru')
})

it('translates dynamic status templates and keeps unknown user content and non-text values intact', () => {
  expect(translateUi('Шаг 2 из 6', 'kk')).toBe('6 қадамның 2-қадамы')
  expect(translateUi('Все 5 повторений выполнены в заданном диапазоне.', 'en')).toBe('All 5 repetitions were completed in the target range.')
  expect(translateUi('Ожидает синхронизации', 'en')).toBe('Waiting to sync')
  for (const language of ['ru', 'kk', 'en'] as UiLanguage[]) expect(translateUi('My own note #42', language)).toBe('My own note #42')
  const value = { repetitions: 2 }
  expect(translateUi(value, 'kk')).toBe(value)
})
