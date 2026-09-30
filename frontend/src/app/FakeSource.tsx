import { useGestureStore } from '../features/gesture-navigation/gestureNavigation'
import type { VisionEvent } from '../types/vision'
export function FakeSource() {
  const store=useGestureStore()
  const now=()=>store.replayClock.read()
  const emit=(event:VisionEvent)=>store.emit(event)
  const cursor=()=>{
    const target=store.registry.rect(store.getSnapshot().tutorial.step<3 ? 'tutorial-target' : 'bodyweight-squat')
    emit({type:'cursor.moved',at:now(),x:target ? target.left+target.width/2 : window.innerWidth/2,y:target ? target.top+target.height/2 : window.innerHeight/2})
  }
  const command=(command:'select'|'back'|'confirm')=>{
    emit({type:'gesture.candidate',at:now(),command,progress:1,confidence:.99})
    emit({type:'gesture.confirmed',at:now(),command})
  }
  return <details open className="fake-controls"><summary>Fake vision · только development</summary>
    <button type="button" onClick={()=>emit({type:'camera.ready',at:now()})}>Camera ready</button>
    <button type="button" onClick={()=>emit({type:'tracking.acquired',at:now(),target:'hand'})}>Hand found</button>
    <button type="button" onClick={cursor}>Move cursor to target</button>
    <button type="button" onClick={()=>emit({type:'focus.changed',at:now(),targetId:null})}>Clear focus</button>
    <button type="button" onClick={()=>command('select')}>Pinch / select</button>
    <button type="button" onClick={()=>command('back')}>Fist hold</button>
    <button type="button" onClick={()=>command('confirm')}>Thumb Up hold</button>
    <button type="button" onClick={()=>emit({type:'gesture.scrolled',at:now(),deltaY:.1})}>Two fingers up</button>
    <button type="button" onClick={()=>emit({type:'gesture.scrolled',at:now(),deltaY:-.1})}>Two fingers down</button>
    <button type="button" onClick={()=>emit({type:'tracking.lost',at:now(),target:'hand'})}>Hand lost</button>
    <button type="button" onClick={()=>emit({type:'camera.error',at:now(),code:'not_readable',message:'Камера отключена. Повтори запуск.'})}>Camera error</button>
  </details>
}
