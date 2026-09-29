import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const source = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'
const checksum = '97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482'
const target = `${publicDir}models/gesture_recognizer.task`
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
await mkdir(`${publicDir}models`, { recursive: true })
let valid = false
try { valid = hash(await readFile(target)) === checksum } catch { /* First install. */ }
if (!valid) {
  const response = await fetch(source, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Official model download failed: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (hash(bytes) !== checksum) throw new Error('Official model checksum mismatch')
  try {
    await writeFile(`${target}.tmp`, bytes)
    await rename(`${target}.tmp`, target)
  } finally { await rm(`${target}.tmp`, { force: true }) }
}
await mkdir(`${publicDir}mediapipe`, { recursive: true })
await cp(fileURLToPath(new URL('../node_modules/@mediapipe/tasks-vision/wasm', import.meta.url)), `${publicDir}mediapipe/wasm`, { recursive: true })
console.log('Sprint 1 assets ready: verified official model and installed MediaPipe WASM.')
