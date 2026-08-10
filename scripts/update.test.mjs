import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REPLACED, update } from './update.mjs'

const CLI = fileURLToPath(new URL('./update.mjs', import.meta.url))

function put(root, path, body) {
  mkdirSync(join(root, dirname(path)), { recursive: true })
  writeFileSync(join(root, path), body)
}

/** A docs repo mid-life: skills and app from the template, plus two documents. */
function docsRepo() {
  const root = mkdtempSync(join(tmpdir(), 'docs-'))
  put(root, '.claude/skills/project-doc/SKILL.md', 'old skill\n')
  put(root, '.claude/skills/gone/SKILL.md', 'a skill upstream deleted\n')
  put(root, 'app/src/main.tsx', 'old app\n')
  put(root, 'project-docs/meridian/__external/doc-data.json', '{"mine":true}\n')
  put(root, 'daily-brief/__external/brief-data.json', '{"mine":true}\n')
  return root
}

function upstream() {
  const root = mkdtempSync(join(tmpdir(), 'tmpl-'))
  put(root, '.claude/skills/project-doc/SKILL.md', 'new skill\n')
  put(root, 'app/src/main.tsx', 'new app\n')
  put(root, 'app/src/__external/cards.tsx', 'reference set\n')
  put(root, 'BOOTSTRAP.md', 'not replaced\n')
  return root
}

test('skills and app are replaced', () => {
  const repo = docsRepo()
  update(repo, upstream())

  assert.equal(readFileSync(join(repo, '.claude/skills/project-doc/SKILL.md'), 'utf8'), 'new skill\n')
  assert.equal(readFileSync(join(repo, 'app/src/main.tsx'), 'utf8'), 'new app\n')
})

test('a file upstream deleted is gone, not merged', () => {
  const repo = docsRepo()
  update(repo, upstream())

  assert.equal(existsSync(join(repo, '.claude/skills/gone/SKILL.md')), false)
})

test('documents are never touched', () => {
  const repo = docsRepo()
  update(repo, upstream())

  assert.equal(readFileSync(join(repo, 'project-docs/meridian/__external/doc-data.json'), 'utf8'), '{"mine":true}\n')
  assert.equal(readFileSync(join(repo, 'daily-brief/__external/brief-data.json'), 'utf8'), '{"mine":true}\n')
})

test('nothing outside the two paths is replaced', () => {
  const repo = docsRepo()
  update(repo, upstream())

  assert.equal(existsSync(join(repo, 'BOOTSTRAP.md')), false)
  assert.deepEqual(REPLACED, ['.claude/skills', 'app'])
})

test('the version is stamped', () => {
  const repo = docsRepo()
  const from = upstream()
  put(from, '.template-version', 'ignored — the stamp is written, not copied\n')

  update(repo, from)
  assert.match(readFileSync(join(repo, '.template-version'), 'utf8'), /^\d{4}-\d{2}-\d{2}T/)
})

test('an upstream missing app/ leaves both directories intact, and the call throws', () => {
  const repo = docsRepo()
  const from = upstream()
  rmSync(join(from, 'app'), { recursive: true, force: true })

  assert.throws(() => update(repo, from))
  assert.equal(readFileSync(join(repo, '.claude/skills/project-doc/SKILL.md'), 'utf8'), 'old skill\n')
  assert.equal(readFileSync(join(repo, 'app/src/main.tsx'), 'utf8'), 'old app\n')
})

test('--from with no value is rejected, not treated as a path', () => {
  const repo = docsRepo()
  const result = spawnSync('node', [CLI, '--from'], { cwd: repo, encoding: 'utf8' })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /--from requires a value/)
  assert.equal(readFileSync(join(repo, 'app/src/main.tsx'), 'utf8'), 'old app\n')
})

test('an unresolvable --from fails naming the path it tried, and leaves the repo untouched', () => {
  const repo = docsRepo()
  const bogus = join(repo, 'no-such-upstream')
  const result = spawnSync('node', [CLI, '--from', bogus], { cwd: repo, encoding: 'utf8' })

  assert.notEqual(result.status, 0)
  assert.ok(result.stderr.includes(join(bogus, '.claude/skills')), result.stderr)
  assert.equal(readFileSync(join(repo, '.claude/skills/project-doc/SKILL.md'), 'utf8'), 'old skill\n')
  assert.equal(readFileSync(join(repo, 'app/src/main.tsx'), 'utf8'), 'old app\n')
})
