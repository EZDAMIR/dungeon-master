import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
export const modelAssets = [
 {name:'gesture_recognizer.task',source:'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',checksum:'97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482'},
 {name:'pose_landmarker_lite.task',source:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',checksum:'59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'},
]
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
await mkdir(`${publicDir}models`, { recursive: true })
for (const {name,source,checksum} of modelAssets) {
 const target = `${publicDir}models/${name}`
 let valid = false
 try { valid = hash(await readFile(target)) === checksum } catch { /* First install. */ }
 if (valid) continue
 const response = await fetch(source, { signal: AbortSignal.timeout(60000) })
 if (!response.ok) throw new Error(`Official ${name} download failed: HTTP ${response.status}`)
 const bytes = Buffer.from(await response.arrayBuffer())
 if (hash(bytes) !== checksum) throw new Error(`Official ${name} checksum mismatch`)
 try {
  await writeFile(`${target}.tmp`, bytes)
  await rename(`${target}.tmp`, target)
 } finally { await rm(`${target}.tmp`, { force: true }) }
}
await mkdir(`${publicDir}mediapipe`, { recursive: true })
await cp(fileURLToPath(new URL('../node_modules/@mediapipe/tasks-vision/wasm', import.meta.url)), `${publicDir}mediapipe/wasm`, { recursive: true })
console.log('Sprint 2 assets ready: verified official gesture and pose models and installed MediaPipe WASM.')
