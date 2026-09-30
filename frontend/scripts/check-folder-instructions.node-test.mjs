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
  writeFileSync(path.join(root, 'frontend/CLAUDE.md'), '# Frontend\n')
  const files = ['frontend/src/main.tsx']
  assert.deepEqual(instructionProblems(root, files), ['frontend/src/CLAUDE.md is missing'])
  writeFileSync(path.join(root, 'frontend/src/CLAUDE.md'), ' \n')
  assert.deepEqual(instructionProblems(root, files), ['frontend/src/CLAUDE.md is empty'])
  writeFileSync(path.join(root, 'frontend/src/CLAUDE.md'), '[Rules](../CLAUDE.md)\n[Missing](missing.md)\n')
  assert.deepEqual(instructionProblems(root, files), ['frontend/src/CLAUDE.md has a broken link: missing.md'])
  writeFileSync(path.join(root, 'frontend/src/CLAUDE.md'), '[Rules](../CLAUDE.md#rules)\n[Remote](https://example.com)\n[Local](#rules)\n')
  assert.deepEqual(instructionProblems(root, files), [])
})
