import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = dirname(dirname(fileURLToPath(import.meta.url)))

// The skills AND every top-level markdown file. The top level is read by a
// human before any skill is, and it ships in the template — a stale claim
// there is exactly as live as one in a protocol. Read rather than listed so a
// file added later is covered without anyone remembering to add it.
// `docs/` is deliberately out: it is the spec's historical record, and the
// retired world is what it is a record OF.
const SCANNED = ['.claude/skills', ...readdirSync(REPO).filter((f) => f.endsWith('.md'))]

/** Prose greps, so a rewritten protocol cannot leave a live path behind. */
function hits(pattern) {
  try {
    return execFileSync('grep', ['-rn', '--include=*.md', pattern, ...SCANNED],
      { cwd: REPO, encoding: 'utf8' }).trim().split('\n')
  } catch {
    return []   // grep exits 1 on no match
  }
}

// `.ignored/project-doc/<name>/init-notes.md` is legitimate: scratch for one
// init run, gitignored on purpose, never a document's home. Everything else
// under `.ignored/project-doc/` is the retired per-repo document location.
// Keyed on the one-segment-then-init-notes shape rather than on the literal
// `<name>` placeholder, which is spelling and could change.
const INIT_NOTES_SCRATCH = /\.ignored\/project-doc\/[^/]+\/init-notes\.md\b/

test('nothing still uses .ignored/project-doc as a document\'s home', () => {
  const found = hits('\\.ignored/project-doc').filter((line) => !INIT_NOTES_SCRATCH.test(line))
  assert.deepEqual(found, [])
})

test('nothing still cites a deleted derived file', () => {
  assert.deepEqual(hits('citations\\.json\\|doc-allowlist\\.json\\|doc-slice\\.mjs'), [])
})

test('nothing still claims the Artifact is the source of truth', () => {
  assert.deepEqual(hits('Artifact is the \\(single \\)\\?source of truth'), [])
  assert.deepEqual(hits('published Artifact is the state'), [])
})

test('nothing still writes the brief config to the home directory', () => {
  assert.deepEqual(hits('~/\\.claude/daily-brief'), [])
})

test('nothing still locates the app under project-doc/app', () => {
  assert.deepEqual(hits('project-doc/app'), [])
})
