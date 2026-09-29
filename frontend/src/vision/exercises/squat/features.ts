import { angleDegrees, angleFromVertical, clamp, normalizedVerticalVelocity } from '../../core/geometry'
import { metricPoint, visibilityScore, bodyHeightEstimate } from '../../pose/readiness'
import { SIDES } from '../../pose/landmarks'
import type { PoseRecognitionSample, PoseSide } from '../../pose/types'
import type { SquatFeatures } from './types'
import { squatConfig as c } from './config'
export function squatFeatures(sample:PoseRecognitionSample,side:PoseSide,previous?:SquatFeatures,scale=bodyHeightEstimate(sample)):SquatFeatures {
 const s=SIDES[side],shoulder=metricPoint(sample,s.shoulder),hip=metricPoint(sample,s.hip),knee=metricPoint(sample,s.knee),ankle=metricPoint(sample,s.ankle)
 const kneeAngle=angleDegrees(hip,knee,ankle),dt=previous ? sample.at-previous.at : 0
 return {at:sample.at,kneeAngle,hipAngle:angleDegrees(shoulder,hip,knee),torsoTilt:angleFromVertical(shoulder,hip),hipY:hip.y,kneeY:knee.y,ankleY:ankle.y,
 hipVelocity:previous ? normalizedVerticalVelocity(previous.hipY,hip.y,dt,scale) : 0,kneeVelocity:previous && dt>0 ? (kneeAngle-previous.kneeAngle)*1000/dt : 0,
 depthScore:clamp((180-kneeAngle)/(180-c.bottomAngle)),visibility:visibilityScore(sample,side)}
}
