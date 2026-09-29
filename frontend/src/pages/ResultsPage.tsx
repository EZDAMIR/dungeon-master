import type { WorkoutResult } from '../app/modes'
import { recommendation } from '../vision/exercises/squat/resultBuilder'
import { GestureTarget } from '../features/gesture-navigation/GestureTarget'
export function ResultsPage({result,onRepeat,onMenu}:{result:WorkoutResult;onRepeat:()=>void;onMenu:()=>void}){
 return <section><h2>Подход завершён</h2><table><tbody>
  <tr><th>Всего повторений</th><td>{result.totalReps} / {result.targetReps}</td></tr>
  <tr><th>Корректные повторения</th><td>{result.acceptedReps}</td></tr>
  <tr><th>Повторения с ошибками</th><td>{result.rejectedReps}</td></tr>
  <tr><th>Доля корректных повторений</th><td>{result.totalReps ? Math.round(result.acceptedReps/result.totalReps*100) : 0}%</td></tr>
  <tr><th>Недостаточная глубина</th><td>{result.errorCounts.depth_insufficient}</td></tr>
  <tr><th>Слишком быстро</th><td>{result.errorCounts.too_fast}</td></tr>
  <tr><th>Неполное выпрямление</th><td>{result.errorCounts.incomplete_extension}</td></tr>
  <tr><th>Среднее время повторения</th><td>{(result.meanRepDurationMs/1000).toFixed(1)} с</td></tr>
 </tbody></table><p className="instruction">{recommendation(result)}</p>
 <GestureTarget id="repeat-squat" onSelect={onRepeat}>Повторить подход</GestureTarget>
 <GestureTarget id="results-menu" onSelect={onMenu}>Вернуться в меню</GestureTarget>
 <p>👍 Повторить подход · ✊ Вернуться в меню · или выбери кнопку щипком.</p></section>
}
