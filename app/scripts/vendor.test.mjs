import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { APP, REPO } from './external-path.mjs'

// The reference set registers a Vercel card whose label falls back to the
// literal 'Vercel'. A vendored bundle is rendered for documents that have no
// cards of their own, so that string appearing in one means a document would
// inherit somebody else's card.
const MARKER = 'Vercel'

for (const skill of ['project-doc', 'daily-brief']) {
  test(`vendored ${skill} bundle carries no document card`, () => {
    const bundle = join(REPO, '.claude/skills', skill, 'references/app.js')
    assert.doesNotMatch(readFileSync(bundle, 'utf8'), new RegExp(MARKER))
  })
}

test('the reference set does register a card, so the check above is live', () => {
  const cards = readFileSync(join(APP, 'src/__external/cards.tsx'), 'utf8')
  assert.match(cards, new RegExp(MARKER))
})
