import { useReducer } from 'react'
import { appReducer, INITIAL_STATE, type AppAction } from './modes'
import { FakeSource } from './FakeSource'
import { TutorialPage } from '../pages/TutorialPage'
import { MenuPage } from '../pages/MenuPage'
import { CalibrationPage } from '../pages/CalibrationPage'
import { CountdownPage } from '../pages/CountdownPage'
import { WorkoutPage } from '../pages/WorkoutPage'
import { ResultsPage } from '../pages/ResultsPage'

export function App() {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE)

  const send = (action: AppAction) => dispatch(action)

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.5rem' }}>
        <strong style={{ fontSize: '1.1rem' }}>Dungeon Master</strong>
        <code style={{ background: '#f0f0f0', padding: '0.1rem 0.4rem', borderRadius: 3 }}>
          {state.mode}
        </code>
      </header>

      <FakeSource mode={state.mode} dispatch={dispatch} />

      <main style={{ marginTop: '1.5rem' }}>
        {state.mode === 'TUTORIAL' && (
          <TutorialPage onDone={() => send({ type: 'TUTORIAL_DONE' })} />
        )}
        {state.mode === 'MENU' && (
          <MenuPage onSelect={() => send({ type: 'MENU_SELECT' })} />
        )}
        {state.mode === 'CALIBRATION' && (
          <CalibrationPage onDone={() => send({ type: 'CALIBRATION_DONE' })} />
        )}
        {state.mode === 'COUNTDOWN' && (
          <CountdownPage onDone={() => send({ type: 'COUNTDOWN_DONE' })} />
        )}
        {state.mode === 'WORKOUT' && (
          <WorkoutPage onDone={(result) => send({ type: 'WORKOUT_DONE', result })} />
        )}
        {state.mode === 'RESULTS' && (
          <ResultsPage
            result={state.workoutResult ?? { reps: 0, errors: 0 }}
            onRestart={() => send({ type: 'RESTART' })}
          />
        )}
      </main>
    </div>
  )
}
