import { useGestureSnapshot } from './gestureNavigation'
import { HoldProgress } from '../../shared/components/HoldProgress'
const labels: Record<string,string> = {Closed_Fist:'Кулак',Thumb_Up:'Большой палец вверх',Open_Palm:'Ладонь',Pointing_Up:'Указательный палец',None:'Жест не определён'}
const commandLabels: Record<string,string> = {select:'Выбор',back:'Назад',confirm:'Подтверждение','scroll-up':'Прокрутка вверх','scroll-down':'Прокрутка вниз'}
export function GestureHud() {
  const s = useGestureSnapshot()
  return <aside className="gesture-hud" aria-label="Распознавание жестов">
    <div className="status-line">Камера: {({idle:'ожидает включения',loading:'загрузка',ready:'готова',error:'ошибка'})[s.camera]} · Рука: {s.hand ? 'найдена' : 'не видна'}</div>
    <p>{labels[s.recognized] ?? s.recognized} {s.confidence !== null && `· уверенность ${Math.round(s.confidence*100)}%`}</p>
    <p>Кандидат: {s.candidate ? commandLabels[s.candidate] : '—'}</p>
    <HoldProgress progress={s.progress} />
    <p>Цель: {s.focused ?? '—'} · Команда: {s.lastCommand ? commandLabels[s.lastCommand] ?? s.lastCommand : '—'}</p>
    <p role="status" aria-live="polite">{s.qualityHint ?? s.message}</p>
    <p>Прокрутка: свайпни открытой ладонью вверх или вниз. Останови ладонь перед следующим свайпом.</p>
    {import.meta.env.DEV && <small>Inference: {s.fps.toFixed(1)} FPS · {s.inferenceMs.toFixed(1)} ms</small>}
  </aside>
}
