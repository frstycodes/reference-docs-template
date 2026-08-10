import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { hasCustomCards } from './build.mjs'
import { REPO, REFERENCE_EXTERNAL } from './external-path.mjs'

test('the reference set has a card', () => {
  assert.equal(hasCustomCards(REFERENCE_EXTERNAL), true)
})

test('the shipped documents have none', () => {
  assert.equal(hasCustomCards(join(REPO, 'daily-brief/__external')), false)
  // Whichever documents this repo happens to hold. A fresh repo holds none, so
  // there this loop asserts nothing.
  for (const doc of projectDocs())
    assert.equal(hasCustomCards(join(REPO, 'project-docs', doc, '__external')), false, doc)
})

test('a registry holding only a comment is empty', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cards-'))
  writeFileSync(join(dir, 'cards.tsx'),
    'export const cards = {\n  /* one day: vercel */\n} satisfies CardRegistry\n')
  assert.equal(hasCustomCards(dir), false)
})

test('a missing cards.tsx is not a build', () => {
  assert.equal(hasCustomCards(mkdtempSync(join(tmpdir(), 'cards-'))), false)
})

test('a commented-out entry does not count', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cards-'))
  writeFileSync(join(dir, 'cards.tsx'),
    'export const cards = {\n  // vercel: VercelDeploy,\n} satisfies CardRegistry\n')
  assert.equal(hasCustomCards(dir), false)
})

test('a document with no cards assembles without vite', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'built-')), 'brief.html')
  // execFileSync's return value is stdout only, never stderr, even on success —
  // spawnSync is the built-in that hands back both streams unconditionally.
  const { stderr } = spawnSync('node', [join(REPO, 'app/scripts/build.mjs'), 'brief', '--out', out],
    { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] })

  assert.match(stderr, /vendored/, 'should say it took the no-toolchain path')
  assert.ok(statSync(out).size > 100_000, 'a real brief, not a stub')
})

function projectDocs() {
  const dir = join(REPO, 'project-docs')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
}
