import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { AppState } from '../../app/modes'
import type { VisionEvent } from '../../types/vision'
import type { TutorialState } from '../onboarding/tutorialMachine'
import { GestureStore } from './gestureStore'
import { NavigationContext } from './gestureNavigation'
export function GestureNavigationProvider({ state,onEvent,children }: {state:AppState;onEvent:(event:VisionEvent,tutorial:TutorialState)=>AppState;children:ReactNode}) {
  const [store] = useState(() => new GestureStore())
  const callback = useRef(onEvent)
  useLayoutEffect(() => { callback.current = onEvent; store.connect((event,tutorial) => callback.current(event,tutorial)); store.setAppState(state) },[store,state,onEvent])
  return <NavigationContext.Provider value={store}>{children}</NavigationContext.Provider>
}
