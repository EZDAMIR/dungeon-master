import { useTranslation } from '../../shared/uiLanguage'
import { useGestureSnapshot } from './gestureNavigation'
import { HoldProgress } from '../../shared/components/HoldProgress'
const labels: Record<string,string> = {Closed_Fist:'Кулак',Thumb_Up:'Большой палец вверх',Open_Palm:'Ладонь',Pointing_Up:'Указательный палец',Two_Finger_Scroll:'Два пальца — прокрутка',None:'Жест не определён'}
const commandLabels: Record<string,string> = {select:'Выбор',back:'Назад',confirm:'Подтверждение','scroll-up':'Прокрутка вверх','scroll-down':'Прокрутка вниз'}
export function GestureHud() {
  const { translateUi } = useTranslation()

  const s = useGestureSnapshot()
  return <aside className="gesture-hud" aria-label={translateUi("Распознавание жестов")}>
    <div className="status-line">{translateUi("Камера: ")}{translateUi(({idle:'ожидает включения',loading:'загрузка',ready:'готова',error:'ошибка'})[s.camera])}{translateUi(" · Рука: ")}{translateUi(s.hand ? 'найдена' : 'не видна')}</div>
    <p>{translateUi(labels[s.recognized] ?? s.recognized)} {translateUi(s.confidence !== null && `· уверенность ${Math.round(s.confidence*100)}%`)}</p>
    <p>{translateUi("Кандидат: ")}{translateUi(s.candidate ? commandLabels[s.candidate] : '—')}</p>
    <HoldProgress progress={s.progress} />
    <p>{translateUi("Цель: ")}{translateUi(s.focused ?? '—')}{translateUi(" · Команда: ")}{translateUi(s.lastCommand ? commandLabels[s.lastCommand] ?? s.lastCommand : '—')}</p>
    <p role="status" aria-live="polite">{translateUi(s.qualityHint ?? s.message)}</p>
    <p>{translateUi("Прокрутка: покажи ладонь камере, выпрями указательный и средний пальцы, согни безымянный и мизинец. Двигай два пальца вверх или вниз — содержимое движется вместе с ними. Раскрой ладонь, чтобы снова двигать курсор.")}</p>
    {import.meta.env.DEV && <small>{translateUi("Inference: ")}{translateUi(s.fps.toFixed(1))}{translateUi(" FPS · ")}{translateUi(s.inferenceMs.toFixed(1))}{translateUi(" ms")}</small>}
  </aside>
}
