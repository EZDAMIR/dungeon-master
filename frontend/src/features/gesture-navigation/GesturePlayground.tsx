import { useTranslation } from '../../shared/uiLanguage'
import { useState } from 'react'
import { GestureExample, type GestureExampleKind } from './GestureExample'
import { GestureTarget } from './GestureTarget'
import './gesturePlayground.css'

const examples: { kind: GestureExampleKind; label: string; title: string; text: string }[] = [
  { kind: 'point', label: 'Point', title: 'Your finger is the cursor.', text: 'Move your index finger to explore the screen. The cursor follows your hand.' },
  { kind: 'pinch', label: 'Pinch', title: 'A little pinch. A clear choice.', text: 'Point at a button, bring your thumb and index finger together, then release to select.' },
  { kind: 'scroll', label: 'Scroll', title: 'Two fingers. Keep moving.', text: 'Extend your index and middle fingers and curl the others. Move them up or down; the page follows.' },
  { kind: 'back', label: 'Go back', title: 'Hold a fist to go back.', text: 'Close your hand and hold while the ring fills. Release before your next command.' },
  { kind: 'confirm', label: 'Confirm', title: 'Thumbs up. Ready to begin.', text: 'Hold your thumb up to confirm a selected workout. Release after the ring fills.' },
]

export function GesturePlayground() {
  const { translateUi } = useTranslation()

  const [kind, setKind] = useState<GestureExampleKind>('point')
  const current = examples.find(example => example.kind === kind)!
  return <section className="gesture-playground" id="gesture-preview" aria-labelledby="gesture-preview-title">
    <div className="playground-intro"><p className="dm-label">{translateUi("MEET YOUR NEW CONTROLS")}</p><h2 id="gesture-preview-title">{translateUi("LESS CLICKING.")}<br/>{translateUi("MORE MOVING.")}</h2><p>{translateUi("Pick a gesture. See it in action.")}<br/>{translateUi("Try it with your camera when you’re ready.")}</p></div>
    <div className="playground-demo">
      <GestureExample key={`demo-${kind}`} kind={kind}/>
      <div className="playground-controls" role="group" aria-label={translateUi("Preview a gesture")}>{examples.map((example, index) => <GestureTarget key={example.kind} id={`nav-preview-${example.kind}`} selected={kind === example.kind} onSelect={() => setKind(example.kind)}><span aria-hidden="true">0{index + 1}</span>{translateUi(example.label)}</GestureTarget>)}</div>
      <div key={`copy-${kind}`} className="playground-explanation" aria-live="polite"><h3>{translateUi(current.title)}</h3><p>{translateUi(current.text)}</p></div>
      <p className="playground-note">{translateUi("Illustrated preview. Your camera stays off until you enable it.")}</p>
    </div>
  </section>
}
