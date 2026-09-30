import type { GestureStore } from '../gesture-navigation/gestureStore'
import type { RealVisionSource } from '../workout/RealVisionSource'
import { inputPreferences } from '../input-settings/preferences'
import type { VisionEvent } from '../../types/vision'
export interface HandsRuntimeAdapter {
 start(): void | Promise<void>; stop():void; requireNeutralRelease():void;
 setScope(element:HTMLElement|null):void;
 subscribeEvents(callback:(event:VisionEvent)=>void):()=>void;
 configureInput():void;
}
export function createHandsRuntimeAdapter(store:GestureStore,getSource:()=>RealVisionSource|null,start:()=>void|Promise<void>,stop:()=>void): HandsRuntimeAdapter {
 return {
  start:()=>{const pending=start();getSource()?.configureInput(inputPreferences.getSnapshot().preferences);return pending},
  stop, requireNeutralRelease:()=>getSource()?.requireNeutralRelease(),
  configureInput:()=>getSource()?.configureInput(inputPreferences.getSnapshot().preferences),
  setScope:element=>{store.setTargetScope(element);store.onPhysicalInteraction=()=>getSource()?.requireNeutralRelease()},
  subscribeEvents:store.subscribeEvents,
 }
}
