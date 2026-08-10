import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { persist } from './persist.mjs'

/** A clone with a real upstream, so a push is a push and not a mock. */
function repoWithRemote() {
  const root = mkdtempSync(join(tmpdir(), 'persist-'))
  const bare = join(root, 'origin.git')
  const work = join(root, 'work')
  mkdirSync(bare)
  execFileSync('git', ['init', '--bare', '-b', 'main', bare])
  execFileSync('git', ['clone', bare, work], { stdio: 'ignore' })
  for (const [k, v] of [['user.email', 't@t.test'], ['user.name', 'T']]) {
    execFileSync('git', ['config', k, v], { cwd: work })
  }
  writeFileSync(join(work, 'seed'), 'seed\n')
  execFileSync('git', ['add', '-A'], { cwd: work })
  execFileSync('git', ['commit', '-m', 'seed'], { cwd: work })
  execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: work, stdio: 'ignore' })
  return work
}

const remoteHead = (work) =>
  execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], { cwd: work, encoding: 'utf8' }).split('\t')[0]

test('a change is committed and pushed to main', () => {
  const work = repoWithRemote()
  const before = remoteHead(work)

  writeFileSync(join(work, 'doc-data.json'), '{"v":2}\n')
  assert.equal(persist('docs: refresh', work), 'pushed')

  assert.notEqual(remoteHead(work), before, 'origin/main should have moved')
})

test('a clean tree is a no-op, not a failure', () => {
  const work = repoWithRemote()
  const before = remoteHead(work)

  assert.equal(persist('docs: refresh', work), 'clean')
  assert.equal(remoteHead(work), before)
})

test('untracked files are included', () => {
  const work = repoWithRemote()
  writeFileSync(join(work, 'brand-new.json'), '{}\n')

  assert.equal(persist('docs: refresh', work), 'pushed')
  const tracked = execFileSync('git', ['ls-tree', '--name-only', 'origin/main'], { cwd: work, encoding: 'utf8' })
  assert.match(tracked, /brand-new\.json/)
})
