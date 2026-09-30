import { LanguageSwitcher } from '../gesture-navigation/LanguageSwitcher'
import { useTranslation } from '../../shared/uiLanguage'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GestureTarget } from '../gesture-navigation/GestureTarget'
import { GestureCursor } from '../gesture-navigation/GestureCursor'
import { GestureExample, type GestureExampleKind } from '../gesture-navigation/GestureExample'
import { useGestureSnapshot } from '../gesture-navigation/gestureNavigation'
import { useModalFocus } from '../../shared/useModalFocus'
import { CameraLoading } from '../../shared/components/CameraLoading'
import { InputSettings } from '../input-settings/InputSettings'
import { inputPreferences, useInputPreferences, type InputPreferencesV1 } from '../input-settings/preferences'
import type { HandsRuntimeAdapter } from './runtimeAdapter'
import './handsOnboarding.css'

export type HandsIntroExit = { mode: 'hands' | 'mouse'; preferences: InputPreferencesV1; outcome: 'calibrated' | 'default' | 'skipped' }
export interface HandsOnboardingProps { open: boolean; runtime: HandsRuntimeAdapter; onComplete(result: HandsIntroExit): void; onUseMouse(): void; onTrustedInteraction?(): void; preview?: ReactNode }
type Stage = 'INTRO' | 'REQUESTING_CAMERA' | 'WAITING_FOR_HAND' | 'PRACTICE' | 'COMPLETE'
const lessons: { kind: GestureExampleKind; title: string; description: string }[] = [
  { kind: 'point', title: 'Двигай курсор', description: 'Покажи кисть камере. Двигай указательный палец — круг на экране следует за ним. Наведи его на кнопку ниже.' },
  { kind: 'pinch', title: 'Выбери кнопку', description: 'Наведи круг на цель. Соедини большой и указательный пальцы, затем разъедини их. Попробуй три раза.' },
  { kind: 'scroll', title: 'Прокрути страницу', description: 'Выпрями указательный и средний пальцы, согни безымянный и мизинец. Двигай руку вверх и вниз: содержимое следует за пальцами. Раскрой ладонь, чтобы снова двигать курсор.' },
  { kind: 'back', title: 'Вернись назад', description: 'Сожми кулак и удерживай его, пока круг не заполнится. Это возвращает на предыдущий экран. Здесь можно безопасно потренироваться.' },
  { kind: 'confirm', title: 'Подтверди действие', description: 'Покажи большой палец вверх и удерживай. Так ты подтверждаешь выбранную тренировку. После команды опусти жест.' },
  { kind: 'point', title: 'Ты готов к сайту', description: 'Сверху — план, прогресс, твой профиль и расписание. Снизу — звук, голос и настройки рук. Выбирай их щипком. Гид покажет, что делать на каждом экране.' },
]
export function HandsOnboarding(props: HandsOnboardingProps) {

 return props.open ? <HandsOnboardingDialog {...props}/> : null }
function HandsOnboardingDialog(props: HandsOnboardingProps) {
  const { translateUi } = useTranslation()

  const { runtime, preview } = props
  const [stage, setStage] = useState<Stage>('INTRO'), [lesson, setLesson] = useState(0), [example, setExample] = useState<GestureExampleKind>('point')
  const [practice, setPractice] = useState(0), [verified, setVerified] = useState<Set<string>>(() => new Set()), [slow, setSlow] = useState(false)
  const [waitingRelease, setWaitingRelease] = useState(false)
  const scrollDirections = useRef(new Set<number>()), pending = useRef<HandsIntroExit['outcome'] | null>(null), completed = useRef(false)
  const root = useRef<HTMLDivElement>(null), callbacks = useRef(props), lessonRef = useRef(lesson)
  useLayoutEffect(() => { callbacks.current = props; lessonRef.current = lesson }, [props, lesson])
  const gesture = useGestureSnapshot(), { preferences } = useInputPreferences()
  const finish = useCallback((mode: HandsIntroExit['mode'], outcome: HandsIntroExit['outcome']) => {
    if (completed.current) return
    completed.current = true; pending.current = null; setWaitingRelease(false); runtime.requireNeutralRelease()
    inputPreferences.set({ mode, onboardingCompleted: true }); setStage('COMPLETE')
    if (mode === 'mouse') { runtime.stop(); callbacks.current.onUseMouse() }
    callbacks.current.onComplete({ mode, preferences: inputPreferences.getSnapshot().preferences, outcome })
  }, [runtime])
  const completeHands = (source: 'hands' | 'physical' | undefined, outcome: HandsIntroExit['outcome']) => {
    if (source === 'hands') { pending.current = outcome; setWaitingRelease(true) } else finish('hands', outcome)
  }
  useModalFocus(root, () => finish('mouse', 'skipped'))
  useEffect(() => {
    runtime.setScope(root.current); runtime.requireNeutralRelease()
    const mark = (kind: string) => setVerified(current => new Set(current).add(kind))
    const remove = runtime.subscribeEvents(event => {
      if (event.type === 'tracking.acquired') setStage(current => current === 'WAITING_FOR_HAND' || current === 'REQUESTING_CAMERA' ? 'PRACTICE' : current)
      if (event.type === 'camera.ready') setStage(current => current === 'REQUESTING_CAMERA' ? 'WAITING_FOR_HAND' : current)
      if (event.type === 'focus.changed' && event.targetId === 'hands-practice-start') mark('point')
      if (event.type === 'gesture.scrolled' && lessonRef.current === 2) {
        scrollDirections.current.add(Math.sign(event.deltaY))
        if (scrollDirections.current.has(1) && scrollDirections.current.has(-1)) mark('scroll')
      }
      if (event.type === 'gesture.confirmed' && event.command === 'back' && lessonRef.current === 3) { mark('back'); setLesson(4) }
      if (event.type === 'gesture.confirmed' && event.command === 'confirm' && lessonRef.current === 4) { mark('confirm'); setLesson(5) }
      if (pending.current && event.type === 'gesture.cancelled' && event.command === 'select') finish('hands', pending.current)
    })
    const unsubscribe = inputPreferences.subscribe(() => runtime.configureInput())
    return () => { remove(); unsubscribe(); runtime.setScope(null); runtime.requireNeutralRelease() }
  }, [runtime, finish])
  useEffect(() => { runtime.requireNeutralRelease() }, [lesson, runtime])
  useLayoutEffect(() => { if ((stage === 'PRACTICE' || stage === 'REQUESTING_CAMERA') && root.current) root.current.scrollTop = 0 }, [stage, lesson])
  useEffect(() => {
    if (stage !== 'REQUESTING_CAMERA') return
    const timer = setTimeout(() => setSlow(true), 12000); return () => clearTimeout(timer)
  }, [stage])
  const request = () => {
    callbacks.current.onTrustedInteraction?.(); setSlow(false)
    setStage(gesture.camera === 'ready' ? gesture.hand ? 'PRACTICE' : 'WAITING_FOR_HAND' : 'REQUESTING_CAMERA')
    void runtime.start()
  }
  const ready = stage === 'PRACTICE', current = lessons[lesson]
  const preparing = stage === 'REQUESTING_CAMERA' && gesture.camera !== 'error'
  const next = () => setLesson(value => Math.min(5, value + 1))
  const outcome = ['point', 'pinch', 'scroll', 'back', 'confirm'].every(kind => verified.has(kind)) ? 'calibrated' : 'default'
  return createPortal(<div ref={root} tabIndex={-1} data-product-modal data-hands-tutorial className="hands-intro" role="dialog" aria-modal="true" aria-labelledby="hands-title" data-stage={stage}>
    <GestureCursor/><div className="modal-language-switcher"><LanguageSwitcher id="nav-hands-language" /></div>
    <div className="hands-content">
      <header className="hands-heading"><span className="hands-eyebrow">{translateUi("DUNGEON MASTER / ПЕРВЫЕ ШАГИ")}</span><span className="hands-step-label">{translateUi(stage === 'INTRO' ? 'Около минуты' : ready ? `Шаг ${lesson + 1} из 6` : 'Настраиваем камеру')}</span></header>
      <div className="hands-layout">
        <div className="hands-demo">
          {preparing ? <CameraLoading/> : <GestureExample key={stage === 'INTRO' ? example : ready ? current.kind : 'point'} kind={stage === 'INTRO' ? example : ready ? current.kind : 'point'}/>}
          {stage === 'INTRO' ? <><div className="hands-example-tabs" aria-label={translateUi("Примеры жестов")}>{(['point', 'pinch', 'scroll', 'back', 'confirm'] as const).map(kind => <GestureTarget key={kind} id={`hands-example-${kind}`} selected={example === kind} onSelect={() => setExample(kind)}>{translateUi(({ point: 'Курсор', pinch: 'Выбор', scroll: 'Прокрутка', back: 'Назад', confirm: 'Подтвердить' })[kind])}</GestureTarget>)}</div><p className="hands-example-hint" aria-live="polite">{translateUi(({ point: 'Двигай указательный палец — курсор следует за ним.', pinch: 'Наведи курсор на кнопку. Соедини большой и указательный пальцы, затем отпусти.', scroll: 'Выпрями два пальца, согни остальные. Двигай их вверх и вниз — содержимое следует за ними.', back: 'Сожми кулак и удерживай до заполнения круга, чтобы вернуться назад.', confirm: 'Подними большой палец и удерживай до заполнения круга, чтобы подтвердить действие.' })[example])}</p></> : <div className="hands-live">{translateUi(preview)}<p role="status" aria-live="polite">{translateUi(gesture.camera === 'error' ? gesture.error : gesture.hand ? '✓ Рука найдена' : gesture.camera === 'ready' ? 'Покажи кисть перед камерой' : 'Ждём готовности камеры и распознавания')}</p></div>}
        </div>
        <section className="hands-lesson">
          <h1 key={`${stage}:${lesson}`} id="hands-title">{translateUi(stage === 'INTRO' ? 'Твои руки — твой курсор' : preparing ? 'Скоро начнём' : ready ? current.title : 'Покажи свою руку')}</h1>
          <p className="hands-lead">{translateUi(stage === 'INTRO' ? 'Научись выбирать кнопки и двигаться по сайту без мыши. Сначала посмотрим примеры, затем попробуем вместе.' : preparing ? 'Как только камера и распознавание будут готовы, мы вместе попробуем первый жест.' : ready ? current.description : 'После разрешения подними одну руку перед камерой. Держи всю кисть в кадре, ладонью к камере.')}</p>
          {stage === 'INTRO' ? <><ol className="hands-roadmap"><li>{translateUi("Разреши камеру")}</li><li>{translateUi("Попробуй пять жестов")}</li><li>{translateUi("Переходи к своему плану")}</li></ol><button className="hands-primary" onClick={request}>{translateUi("Включить управление руками")}</button><small>{translateUi("Камера работает на твоём устройстве. Запись не ведётся.")}</small></> : <>
            {(gesture.camera === 'error' || slow && preparing) && <div className="hands-recovery"><p>{translateUi(gesture.camera === 'error' ? gesture.error : 'Первый запуск может быть дольше: загружаем распознавание. Подожди ещё немного. Если подготовка не завершается, проверь подключение и разрешение камеры.')}</p><button onClick={() => { runtime.stop(); request() }}>{translateUi("Повторить запуск камеры")}</button></div>}
            {ready && <>
              <div className="hands-steps" aria-label={translateUi("Прогресс обучения")}>{lessons.map((step, index) => <span key={index} className={index === lesson ? 'current' : index < lesson ? 'visited' : ''} aria-current={index === lesson ? 'step' : undefined}>{translateUi(index < lesson ? '✓' : index + 1)}<span className="sr-only"> {translateUi(step.title)}</span></span>)}</div>
              {lesson === 1 && <div className="hands-practice"><p>{translateUi("Выбери цель щипком: ")}{practice}{translateUi("/3. Клик мышью не считается проверкой жеста.")}</p><div className="hands-actions">{[0, 1, 2].map(index => <GestureTarget id={`hands-practice-${index}`} key={index} disabled={index !== practice} onSelect={source => {
                if (source !== 'hands') return
                const count = Math.min(3, practice + 1); setPractice(count)
                if (count === 3) { setVerified(value => new Set(value).add('pinch')); setLesson(2) }
              }}>{translateUi(index < practice ? '✓' : `Цель ${index + 1}`)}</GestureTarget>)}</div></div>}
              {lesson === 2 && <div className="hands-scroll-practice" tabIndex={0} aria-label={translateUi("Область для практики прокрутки")}><p>{translateUi("↑ Начало")}</p><p>{translateUi("Наведи курсор сюда перед жестом.")}</p><p>{translateUi("Два пальца вверх — содержимое вверх.")}</p><p>{translateUi("Теперь попробуй обратное движение.")}</p><p>{translateUi("↓ Конец")}</p></div>}
              {(lesson === 3 || lesson === 4) && <progress aria-label={translateUi("Удержание жеста")} max={1} value={gesture.candidate === (lesson === 3 ? 'back' : 'confirm') ? gesture.progress : 0}/>}
              <p className="hands-feedback" role="status">{translateUi(verified.has(current.kind) ? '✓ Получилось! Можно продолжать.' : !gesture.hand ? 'Верни кисть в кадр, чтобы продолжить.' : lesson === 5 ? 'Можно вернуться к примерам в любой момент через «Настройки рук».' : 'Повтори движение из примера. Мышь и клавиатура тоже работают.')}</p>
              <GestureTarget id={lesson === 0 ? 'hands-practice-start' : lesson === 5 ? 'hands-done' : 'hands-next'} className="hands-primary" onSelect={source => lesson === 5 ? completeHands(source, outcome) : next()}>{translateUi(lesson === 0 ? 'Проверить жесты' : lesson === 5 ? 'Готово — управлять руками' : 'Дальше')}</GestureTarget>
              <details className="hands-tuning"><summary>{translateUi("Курсор движется слишком быстро?")}</summary><InputSettings/></details>
            </>}
            {gesture.camera === 'ready' && lesson < 5 && <GestureTarget id="hands-default" className="hands-secondary" onSelect={source => completeHands(source, 'default')}>{translateUi("Использовать стандартные настройки")}</GestureTarget>}
            {waitingRelease && <p role="status">{translateUi("Разъедини пальцы перед переходом к следующему экрану.")}</p>}
          </>}
        </section>
      </div>
      <footer className="hands-footer"><button className="hands-mouse" onClick={() => { callbacks.current.onTrustedInteraction?.(); finish('mouse', 'skipped') }}>{translateUi("Продолжить с мышью")}</button><span>{translateUi("Все действия доступны мышью и клавиатурой. Калибровка тела будет перед упражнением.")}</span></footer>
      {stage !== 'INTRO' && <small className="hands-settings-note">{translateUi("Чувствительность: ")}{Math.round(preferences.sensitivity * 100)}%</small>}
    </div>
  </div>, document.body)
}
