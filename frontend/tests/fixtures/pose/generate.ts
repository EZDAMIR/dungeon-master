import { writeFile } from 'node:fs/promises'
import { sequence } from './builder'
for(const name of ['standing-side','wrong-angle','body-cropped','correct-squat','shallow-squat','fast-squat','incomplete-extension','tracking-lost-mid-rep','pause-gesture','jitter-standing']) {
 const data={version:1,fps:name==='fast-squat' ? 50 : name.includes('squat') || name.includes('extension') || name.includes('mid-rep') ? 1000/60 : 20,frames:sequence(name).map(s=>({at_ms:s.at,landmarks:s.landmarks}))}
 await writeFile(new URL(`${name}.json`,import.meta.url),JSON.stringify(data)+'\n')
}
