import type { RepResult } from '../../vision/exercises/squat/types'
// Reduce completed rep metrics once at the Results boundary; do not retain samples.
export function meanMinKneeAngle(reps:readonly RepResult[]):number {
  return reps.length ? reps.reduce((total,rep)=>total+rep.metrics.minKneeAngle,0)/reps.length : 0
}
