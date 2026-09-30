import { useTranslation } from '../shared/uiLanguage'
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
import { GestureLink } from '../features/gesture-navigation/GestureLink'
import { GesturePlayground } from '../features/gesture-navigation/GesturePlayground'
import { readMotionPreference } from '../shared/motion'
import './landingPage.css'

export function LandingPage({ onBuildPlan, onRoutines }: { onBuildPlan(): void; onRoutines(): void }) {
  const { translateUi } = useTranslation()

  const assets = `${import.meta.env.BASE_URL}design/`
  return <div className="landing-page" data-figma-node="3:111">
    <div className="landing-hero">
      <section className="landing-narrative" aria-labelledby="landing-title">
        <p className="dm-label landing-desktop">{translateUi("PERSONAL TRAINING, WITHOUT THE GUESSWORK")}</p>
        <p className="dm-label landing-mobile">{translateUi("YOUR OWN STARTING POINT")}</p>
        <h1 id="landing-title"><span>{translateUi("YOUR BODY.")}</span><br/><span>{translateUi("YOUR RULES.")}</span></h1>
        <p className="landing-description landing-desktop">{translateUi("A plan that understands your context.")}<br/>{translateUi("A coach that sees your movement.")}<br/>{translateUi("A session you control without touching a screen.")}</p>
        <p className="landing-description landing-mobile">{translateUi("A personal plan. Real-time cues.")}<br/>{translateUi("A coach you control with movement.")}</p>
        <div className="landing-actions landing-desktop">
          <GestureTarget id="nav-ready-routines" className="dm-primary" onSelect={onRoutines}>{translateUi('Как начать тренировку →')}</GestureTarget>
          <GestureTarget id="nav-build-plan" onSelect={onBuildPlan}>{translateUi("Build my plan →")}</GestureTarget>
        </div>
        <p className="landing-note landing-desktop">{translateUi("No account needed to explore. Camera off until you choose.")}</p>
        <ol className="landing-how landing-desktop" aria-label={translateUi("How it works")}>
          {['Готовые программы', 'Настрой камеру и голос', 'Move with feedback'].map((label, index) => <li key={label}><span className="dm-label">0{index + 1}</span>{index === 0 ? <GestureTarget id="nav-how-start" onSelect={onRoutines}>{translateUi(label)}</GestureTarget> : <strong>{translateUi(label)}</strong>}</li>)}
        </ol>
        <GestureLink id="nav-explore-gestures" className="landing-explore landing-desktop" href="#gesture-preview" onSelect={() => document.getElementById('gesture-preview')?.scrollIntoView({ behavior: readMotionPreference() === 'on' ? 'smooth' : 'instant', block: 'start' })}>{translateUi("Explore gesture controls ")}<span aria-hidden="true">↓</span></GestureLink>
      </section>
      <section className="landing-stage landing-desktop" aria-label={translateUi("Motion studio illustration")}>
        <div className="landing-stage-top"><span>{translateUi("● Made for your movement")}</span><p className="dm-label">{translateUi("01 / HUMAN FIRST")}</p></div>
        <div className="landing-art"><img src={`${assets}kinetic-reach.svg`} alt={translateUi("Abstract figure reaching and moving")} width="520" height="470"/></div>
        <div className="landing-principles"><h2>{translateUi("LESS FRICTION.")}<br/>{translateUi("MORE MOTION.")}</h2><p>{translateUi("Your camera becomes")}<br/>{translateUi("your controller.")}</p></div>
      </section>
      <div className="landing-mobile-preview landing-mobile" data-figma-node="3:154"><img src={`${assets}mobile-pose-squat.svg`} alt={translateUi("Illustration of a squat with movement tracking points")} width="350" height="238"/></div>
    </div>
    <div className="landing-mobile landing-mobile-actions"><p>{translateUi("Choose a personal plan or a ready-made daily routine.")}</p><GestureTarget id="nav-mobile-routines" className="dm-primary" onSelect={onRoutines}>{translateUi("Как начать тренировку →")}</GestureTarget><GestureTarget id="nav-mobile-build" onSelect={onBuildPlan}>{translateUi("Build my plan →")}</GestureTarget><small>{translateUi("Camera off until you choose.")}</small></div>
    <GesturePlayground/>
    <footer className="landing-footer landing-desktop"><span>{translateUi("MOTION STUDIO / ADMIT 2026")}</span><span>{translateUi("LOCAL CAMERA · PRIVATE BY DESIGN")}</span></footer>
  </div>
}
