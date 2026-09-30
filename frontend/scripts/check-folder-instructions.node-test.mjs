import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { instructionFolders, instructionProblems } from './check-folder-instructions.mjs'

test('covers every authored ancestor, including fixtures and placeholder folders', () => {
  assert.deepEqual(instructionFolders([
    'frontend/src/features/profile/.gitkeep',
    'frontend/tests/fixtures/pose/correct-squat.json',
    'backend/src/main.py',
  ]), [
    'frontend', 'frontend/src', 'frontend/src/features', 'frontend/src/features/profile',
    'frontend/tests', 'frontend/tests/fixtures', 'frontend/tests/fixtures/pose',
  ])
})

test('reports missing and empty guides, validates relative links and accepts inherited instructions', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'dungeon-folder-guides-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'frontend/src'), { recursive: true })
  const withExample = content => `${content}\n\`\`\`ts\nexport const progress = 0\n\`\`\`\n`
  writeFileSync(path.join(root, 'frontend/CLAUDE.md'), withExample('# Frontend\n'))
  const files = ['frontend/src/main.tsx']
  assert.deepEqual(instructionProblems(root, files), ['frontend/src/CLAUDE.md is missing'])
  writeFileSync(path.join(root, 'frontend/src/CLAUDE.md'), ' \n')
  assert.deepEqual(instructionProblems(root, files), ['frontend/src/CLAUDE.md is empty'])
  writeFileSync(path.join(root, 'frontend/src/CLAUDE.md'), withExample('[Rules](../CLAUDE.md)\n[Missing](missing.md)\n'))
  assert.deepEqual(instructionProblems(root, files), ['frontend/src/CLAUDE.md has a broken link: missing.md'])
  writeFileSync(path.join(root, 'frontend/src/CLAUDE.md'), withExample('[Rules](../CLAUDE.md#rules)\n[Remote](https://example.com)\n[Local](#rules)\n'))
  assert.deepEqual(instructionProblems(root, files), [])
})

test('requires a nonempty code example instead of prose or a folder tree', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'dungeon-guide-examples-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'frontend'), { recursive: true })
  const guide = path.join(root, 'frontend/CLAUDE.md')
  const problem = ['frontend/CLAUDE.md has no concrete code example']
  for (const content of [
    '# Rules\nUse strict TypeScript.\n',
    '# Rules\n```text\nsrc/\n  app/\n```\n',
    '# Rules\n```ts\n   \n```\n',
    '# Rules\n```ts\nexport const command = "select"\n',
  ]) {
    writeFileSync(guide, content)
    assert.deepEqual(instructionProblems(root, []), problem)
  }
  for (const [language, code] of [
    ['ts', 'export const command = "select"'],
    ['tsx', '<button type="button">Retry</button>'],
    ['js', 'const folders = new Set()'],
    ['json', '{"version": 1, "frames": [0.6, 0.25]}'],
  ]) {
    writeFileSync(guide, `# Rules\n\`\`\`${language}\n${code}\n\`\`\`\n`)
    assert.deepEqual(instructionProblems(root, []), [])
  }
})
