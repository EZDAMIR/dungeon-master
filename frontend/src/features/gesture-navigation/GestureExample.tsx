import './gestureExamples.css'

export type GestureExampleKind = 'point' | 'pinch' | 'scroll' | 'back' | 'confirm'
export function GestureExample({ kind, compact = false }: { kind: GestureExampleKind; compact?: boolean }) {
  const index = kind === 'back' || kind === 'confirm' ? 58 : 14
  const middle = kind === 'scroll' ? 10 : kind === 'back' || kind === 'confirm' ? 60 : 52
  return <div className={`gesture-example example-${kind} ${compact ? 'compact' : ''}`} aria-hidden="true">
    <div className="example-grid"/>
    <div className="example-screen"><span/><span/><span/><div className="example-target"><i/></div></div>
    <svg className="example-hand" viewBox="0 0 220 180">
      <g fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinejoin="round">
        <rect x="88" y="76" width="76" height="70" rx="26"/>
        {kind === 'pinch' ? <g fill="none" strokeWidth="20" strokeLinecap="round">
          <path d="M98 100V72"/>
          <path className="example-index" d="M98 72Q85 64 72 60"/>
          <path className="example-thumb" d="M94 108Q84 91 72 80"/>
        </g> : <rect className="example-index" x="88" y={index} width="18" height={102 - index} rx="9"/>}
        <rect x="109" y={middle} width="18" height={106 - middle} rx="9"/>
        <rect x="130" y="58" width="17" height="48" rx="9"/>
        <rect x="150" y="68" width="15" height="43" rx="8"/>
        {kind !== 'pinch' && <path className="example-thumb" d={kind === 'confirm' ? 'M90 107L73 97V33Q73 17 88 25L100 85Z' : 'M96 112L68 82Q55 67 46 78Q41 86 51 97L91 133Z'}/>}
        <path d="M106 137V167H149V136Z"/>
      </g>
    </svg>
    <span className="example-cursor"/>
    {kind === 'scroll' && <span className="example-scroll-arrows">↑<br/>↓</span>}
    {(kind === 'back' || kind === 'confirm') && <svg className="example-hold" viewBox="0 0 80 80"><circle cx="40" cy="40" r="32"/></svg>}
    <span className="example-caption">{({ point: '01 →', pinch: '✓', scroll: '↑ ↓', back: '←', confirm: '✓' })[kind]}</span>
  </div>
}
