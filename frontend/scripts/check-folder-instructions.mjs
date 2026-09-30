import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function instructionFolders(files) {
  const folders = new Set(['frontend'])
  for (const file of files) {
    if (!file.startsWith('frontend/')) continue
    let folder = path.posix.dirname(file)
    while (folder !== 'frontend') {
      folders.add(folder)
      folder = path.posix.dirname(folder)
    }
  }
  return [...folders].sort()
}

export function instructionProblems(root, files) {
  const problems = []
  for (const folder of instructionFolders(files)) {
    const guide = path.join(root, folder, 'CLAUDE.md')
    if (!existsSync(guide)) {
      problems.push(`${folder}/CLAUDE.md is missing`)
      continue
    }
    const content = readFileSync(guide, 'utf8')
    if (!content.trim()) problems.push(`${folder}/CLAUDE.md is empty`)
    else if (![...content.matchAll(/^```(?:ts|tsx|js|json|bash|sh|css|html|svg)\r?\n([\s\S]*?)^```[ \t]*$/gm)]
      .some(match => match[1].trim())) {
      problems.push(`${folder}/CLAUDE.md has no concrete code example`)
    }
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1]
      if (/^(?:[a-z]+:|#)/i.test(target)) continue
      const file = target.split('#')[0]
      if (!existsSync(path.resolve(path.dirname(guide), file))) {
        problems.push(`${folder}/CLAUDE.md has a broken link: ${target}`)
      }
    }
  }
  return problems
}

function main() {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  // Git excludes dependencies, build output and generated model/WASM directories.
  const files = execFileSync('git', [
    'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'frontend/',
  ], { cwd: root, encoding: 'utf8' }).split('\0').filter(file => file && existsSync(path.join(root, file)))
  const problems = instructionProblems(root, files)
  if (problems.length) {
    console.error(problems.join('\n'))
    return 1
  }
  console.log(`Folder instructions verified: ${instructionFolders(files).length} authored frontend folders.`)
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
