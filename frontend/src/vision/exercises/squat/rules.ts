import { squatConfig as c } from './config'
import type { RepMetrics, TechniqueErrorCode } from './types'
export const corrections:Record<TechniqueErrorCode,string> = {
 depth_insufficient:'Опустись немного ниже',too_fast:'Медленнее опускайся вниз и контролируй движение',incomplete_extension:'Заверши подъём и вернись в исходное положение',
}
export function evaluateRep(metrics:RepMetrics,incomplete=false):TechniqueErrorCode[] {
 const errors:TechniqueErrorCode[]=[]
 if(metrics.minKneeAngle>c.bottomAngle) errors.push('depth_insufficient')
 if(metrics.descentDurationMs<c.minimumDescentMs || metrics.totalDurationMs<c.minimumRepMs) errors.push('too_fast')
 if(incomplete) errors.push('incomplete_extension')
 return errors
}
