import { GestureTutorial } from '../features/onboarding/GestureTutorial'
export function TutorialPage({onDone}:{onDone:()=>void}) { return <GestureTutorial onDone={onDone} /> }
