export const LANDMARK = {
  nose:0, leftShoulder:11, rightShoulder:12, leftElbow:13, rightElbow:14,
  leftWrist:15, rightWrist:16, leftHip:23, rightHip:24, leftKnee:25, rightKnee:26,
  leftAnkle:27, rightAnkle:28, leftHeel:29, rightHeel:30, leftFootIndex:31, rightFootIndex:32,
} as const
export const SIDES = {
 left:{shoulder:LANDMARK.leftShoulder,hip:LANDMARK.leftHip,knee:LANDMARK.leftKnee,ankle:LANDMARK.leftAnkle,heel:LANDMARK.leftHeel,foot:LANDMARK.leftFootIndex,wrist:LANDMARK.leftWrist},
 right:{shoulder:LANDMARK.rightShoulder,hip:LANDMARK.rightHip,knee:LANDMARK.rightKnee,ankle:LANDMARK.rightAnkle,heel:LANDMARK.rightHeel,foot:LANDMARK.rightFootIndex,wrist:LANDMARK.rightWrist},
} as const
export const POSE_CONNECTIONS = [
 [LANDMARK.leftShoulder,LANDMARK.rightShoulder],[LANDMARK.leftHip,LANDMARK.rightHip],
 ...Object.values(SIDES).flatMap(s=>[[s.shoulder,s.hip],[s.hip,s.knee],[s.knee,s.ankle],[s.ankle,s.heel],[s.heel,s.foot],[s.ankle,s.foot],[s.shoulder,s.wrist]]),
] as const
