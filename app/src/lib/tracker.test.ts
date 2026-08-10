/**
 * The tracker mark is the one icon in the set that is CHOSEN rather than
 * looked up, so it is the one that can be chosen wrong — and wrong here means
 * putting one company's logo on another company's work.
 *
 * The case that motivated this: `bead` is Pact's word for its items, and
 * `beads` is also an unrelated open-source tracker
 * (github.com/steveyegge/beads) whose items are likewise beads. A document
 * citing `bd-a1b2` must not wear Pact's mark.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trackerIcon } from './tracker.ts'

test('config wins — it knows which server the item was read from', () => {
  assert.equal(trackerIcon('ENG-431', 'linear'), 'i-linear')
  assert.equal(trackerIcon('ENG-431', 'jira'), 'i-jira')
  assert.equal(trackerIcon('PACT-0036', 'linear'), 'i-linear', 'config overrides the id shape')
  assert.equal(trackerIcon('#412', 'github-issues'), 'i-github')
  assert.equal(trackerIcon('ENG-431', 'asana'), 'i-bead', 'a kind with no mark is generic, not an error')
})

test("Pact's own ids get Pact's mark", () => {
  for (const id of ['PACT-0036', 'BEAD-0036', 'pact-0005', 'BEAD-0078']) {
    assert.equal(trackerIcon(id), 'i-pact', id)
  }
})

test('the OSS beads tracker is a different product and does not get it', () => {
  for (const id of ['bd-a1b2', 'bd-a3f8', 'bd-a3f8.1', 'bd-a3f8.1.1', 'proj-1f4c']) {
    assert.equal(trackerIcon(id), 'i-bead', id)
  }
})

test('an ambiguous id stays generic rather than guessing', () => {
  // Linear and Jira are indistinguishable here — both are PREFIX-number — so
  // neither logo is safe without config.
  for (const id of ['ENG-431', 'PROJ-12', 'MER-431', 'ABC-1']) {
    assert.equal(trackerIcon(id), 'i-bead', id)
  }
})

test('every vendor mark resolves to a symbol that exists', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { TRACKER_VENDORS } = await import('./tracker.ts')
  const ids = new Set<string>()
  for (const f of ['../sprites/brand.svg', '../sprites/doc.svg']) {
    const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8')
    for (const m of src.matchAll(/id="([^"]+)"/g)) ids.add(m[1]!)
  }
  const missing = TRACKER_VENDORS.map((v) => trackerIcon('X-1', v)).filter((i) => !ids.has(i))
  assert.deepEqual(missing, [])
})
