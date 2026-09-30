import { squatConfig } from './config'
import type { RepResult, WorkoutResult } from './types'
export function buildResult(reps:readonly RepResult[],durationMs:number,targetReps:number=squatConfig.targetReps):WorkoutResult {
 const errorCounts:WorkoutResult['errorCounts']={depth_insufficient:0,too_fast:0,incomplete_extension:0}
 for(const rep of reps) for(const code of new Set(rep.errors)) errorCounts[code]++
 const acceptedReps=reps.filter(r=>r.accepted).length
 return {exerciseKey:'bodyweight_squat',targetReps,totalReps:reps.length,acceptedReps,rejectedReps:reps.length-acceptedReps,durationMs:Math.max(0,durationMs),meanRepDurationMs:reps.length ? reps.reduce((sum,r)=>sum+r.metrics.totalDurationMs,0)/reps.length : 0,errorCounts,engineVersion:'squat-v1'}
}
export function recommendation(result:WorkoutResult):string {
 const {depth_insufficient:depth,too_fast:fast,incomplete_extension:extension}=result.errorCounts
 if(!result.totalReps) return 'Начни новый подход после калибровки.'
 if(!depth && !fast && !extension) return `Все ${result.totalReps} повторений выполнены в заданном диапазоне.`
 if(depth>=fast && depth>=extension) return 'В следующем подходе удели внимание глубине и выполняй движение медленно.'
 if(fast>=extension) return 'Попробуй замедлить фазу опускания.'
 return 'В следующем подходе заверши каждый подъём до исходного положения.'
}
