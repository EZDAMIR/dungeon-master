import { useTranslation } from '../../shared/uiLanguage'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Language, ReleaseClient } from '../../api/release'
import type { AudioCoordinator } from '../../audio/audioCoordinator'
import { GestureTarget } from '../gesture-navigation/GestureTarget'
import { GestureExample, type GestureExampleKind } from '../gesture-navigation/GestureExample'
import { GuideMachine, type GuideEvent } from './guideMachine'

export function GuidedTour({ audio, screen, language = 'ru', enabled = true, onDone }: {
  audio: AudioCoordinator; client?: ReleaseClient; screen: string; event?: GuideEvent; language?: Language; planReady?: boolean; enabled?: boolean; onDone?: () => void
}) {
  const { translateUi } = useTranslation()

  const [guide] = useState(() => new GuideMachine(screen)), [example, setExample] = useState<{ screen: string; kind: GestureExampleKind } | null>(null)
  const current = useSyncExternalStore(guide.subscribe, guide.getSnapshot)
  useEffect(() => { guide.setScreen(screen) }, [guide, screen])
  useEffect(() => {
    if (!enabled || !current) return
    const target = document.querySelector<HTMLElement>(`[data-guide-target="${current.target}"]`)
    if (!target || target.closest('[inert]')) return
    target.dataset.guideHighlight = 'true'
    return () => { delete target.dataset.guideHighlight }
  }, [enabled, current])
  if (!enabled || !current) return null
  const kind = example?.screen === screen ? example.kind : current.kind
  const next = () => { setExample(null); if (guide.index + 1 >= guide.total) { guide.stop(); onDone?.() } else guide.skip() }
  const word = (ru: string, kk: string, en: string) => language === 'ru' ? ru : language === 'kk' ? kk : en
  const hint = ({ point: word('Двигай указательный палец — курсор следует за ним.', 'Сұқ саусағыңды қозғалт — меңзер бірге жүреді.', 'Move your index finger to move the cursor.'), pinch: word('Соедини большой и указательный пальцы, затем отпусти.', 'Бас және сұқ саусақты қосып, кейін ажырат.', 'Pinch thumb and index finger, then release.'), scroll: word('Два пальца вверх или вниз — содержимое следует за ними.', 'Екі саусақты жоғары не төмен қозғалт.', 'Move two fingers up or down; content follows them.'), back: word('Удерживай кулак, чтобы вернуться назад.', 'Артқа қайту үшін жұдырығыңды ұстап тұр.', 'Hold a fist to go back.'), confirm: word('Удерживай большой палец вверх для подтверждения.', 'Растау үшін бас бармақты жоғары ұстап тұр.', 'Hold a thumbs-up to confirm.') })[kind]
  return <aside className="guided-tour" aria-label={translateUi(word('Гид по сайту', 'Сайт нұсқаулығы', 'Site guide'))}>
    <GestureExample key={kind} kind={kind} compact/>
    <div className="guide-copy"><p className="dm-label">{translateUi(word('ГИД', 'НҰСҚАУЛЫҚ', 'GUIDE'))} · {guide.index + 1} / {guide.total}</p><div className="guide-progress" aria-hidden="true"><span style={{ width: `${(guide.index + 1) / guide.total * 100}%` }}/></div><div className="guide-step-copy" key={`${screen}:${guide.index}`}><h3>{translateUi(current.title[language])}</h3><p>{translateUi(current.text[language])}</p></div>
      <div className="guide-examples" aria-label={translateUi(word('Примеры жестов', 'Қимыл мысалдары', 'Gesture examples'))}>{(['point', 'pinch', 'scroll', 'back', 'confirm'] as const).map(value => <GestureTarget key={value} id={`guide-example-${value}`} selected={kind === value} onSelect={() => setExample({ screen, kind: value })}>{translateUi(word(({ point: 'Курсор', pinch: 'Выбор', scroll: 'Прокрутка', back: 'Назад', confirm: 'Подтвердить' })[value], ({ point: 'Меңзер', pinch: 'Таңдау', scroll: 'Айналдыру', back: 'Артқа', confirm: 'Растау' })[value], ({ point: 'Point', pinch: 'Select', scroll: 'Scroll', back: 'Back', confirm: 'Confirm' })[value]))}</GestureTarget>)}</div>
      <p className="guide-gesture-hint">{translateUi(hint)}</p>
      <div className="dm-actions"><GestureTarget id="guide-next" onSelect={next}>{translateUi(guide.index + 1 === guide.total ? word('Готово', 'Дайын', 'Done') : word('Следующая подсказка', 'Келесі кеңес', 'Next tip'))}</GestureTarget>
        <GestureTarget id="guide-repeat" onSelect={() => { audio.setMuted(false); audio.unlock(); audio.enqueue({ id: `guide-repeat:${screen}:${guide.index}:${Date.now()}`, text: current.text[language], priority: 'guide' }) }}>{translateUi(word('Прочитать вслух', 'Дауыстап оқу', 'Read aloud'))}</GestureTarget>
        <GestureTarget id="guide-close" onSelect={() => { audio.stop(); guide.stop(); onDone?.() }}>{translateUi(word('Скрыть гид', 'Жасыру', 'Hide guide'))}</GestureTarget></div>
    </div>
  </aside>
}
