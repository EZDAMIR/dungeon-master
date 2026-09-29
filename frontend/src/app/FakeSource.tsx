import type { AppMode, AppAction } from './modes'

type Props = {
  mode: AppMode
  dispatch: (action: AppAction) => void
}

const BTN_STYLE: React.CSSProperties = { marginLeft: '0.5rem', cursor: 'pointer' }

export function FakeSource({ mode, dispatch }: Props) {
  return (
    <div
      style={{
        background: '#fffbe6',
        border: '1px solid #ffe58f',
        borderRadius: 4,
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
      }}
    >
      <strong>Dev controls</strong>
      {mode === 'TUTORIAL' && (
        <button style={BTN_STYLE} onClick={() => dispatch({ type: 'TUTORIAL_DONE' })}>
          Complete Tutorial →
        </button>
      )}
      {mode === 'MENU' && (
        <button style={BTN_STYLE} onClick={() => dispatch({ type: 'MENU_SELECT' })}>
          Select Workout →
        </button>
      )}
      {mode === 'CALIBRATION' && (
        <button style={BTN_STYLE} onClick={() => dispatch({ type: 'CALIBRATION_DONE' })}>
          Calibration Done →
        </button>
      )}
      {mode === 'COUNTDOWN' && (
        <button style={BTN_STYLE} onClick={() => dispatch({ type: 'COUNTDOWN_DONE' })}>
          Skip Countdown →
        </button>
      )}
      {mode === 'RESULTS' && (
        <button style={BTN_STYLE} onClick={() => dispatch({ type: 'RESTART' })}>
          Restart →
        </button>
      )}
    </div>
  )
}
