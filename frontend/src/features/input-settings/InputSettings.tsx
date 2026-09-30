import { GestureTarget } from '../gesture-navigation/GestureTarget'
import { inputPreferences, useInputPreferences } from './preferences'
export function InputSettings() {
  const {preferences,persistence} = useInputPreferences()
  const set = (value:number) => inputPreferences.set({sensitivity:Math.round(Math.min(2,Math.max(.5,value))*10)/10})
  return <section className="hands-settings" aria-label="Настройки курсора">
    <h2>Чувствительность курсора — {Math.round(preferences.sensitivity*100)}%</h2>
    <p>Меньше — точнее. Больше — курсор проходит дальше при том же движении руки.</p>
    <label>Чувствительность курсора<input type="range" min="50" max="200" step="10" value={Math.round(preferences.sensitivity*100)} aria-valuetext={`${Math.round(preferences.sensitivity*100)}%`} onChange={event=>set(Number(event.target.value)/100)}/></label>
    <div className="hands-actions"><GestureTarget id="hands-minus" ariaLabel="Уменьшить чувствительность" onSelect={()=>set(preferences.sensitivity-.1)}>−</GestureTarget><GestureTarget id="hands-plus" ariaLabel="Увеличить чувствительность" onSelect={()=>set(preferences.sensitivity+.1)}>+</GestureTarget>
      {[.7,1,1.5].map(gain=><GestureTarget key={gain} id={`hands-preset-${gain}`} onSelect={()=>set(gain)}>{Math.round(gain*100)}%</GestureTarget>)}
      <GestureTarget id="hands-reset" onSelect={inputPreferences.reset}>Сбросить</GestureTarget></div>
    <p>Если курсор у края: убери руку, переставь её и покажи снова.</p>
    {persistence==='memory' && <p role="status">Настройки сохранятся только до закрытия этой вкладки.</p>}
  </section>
}
