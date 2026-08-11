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

// The CSS minifier writes the `-webkit-` prefix itself. Hand-writing one beside
// its unprefixed property makes it MERGE the pair and keep the prefixed half —
// and Chrome does not implement `-webkit-backdrop-filter`, so the preview card
// shipped with no blur. The bug is invisible in source and only exists in the
// build, so it is checked here rather than trusted to a comment.
for (const skill of ['project-doc', 'daily-brief']) {
  test(`vendored ${skill} stylesheet kept its unprefixed backdrop-filter`, () => {
    const css = readFileSync(join(REPO, '.claude/skills', skill, 'references/app.css'), 'utf8')
    assert.match(css, /(^|[;{])backdrop-filter:/)
  })
}

test('no stylesheet hand-writes a vendor prefix beside its own unprefixed property', () => {
  for (const file of ['cite.css', 'shell.css', 'doc-components.css', 'preview-card.css', 'fonts.css']) {
    const css = readFileSync(join(APP, 'src/styles', file), 'utf8')
    for (const [, prop] of css.matchAll(/-(?:webkit|moz|ms)-([a-z-]+)\s*:/g)) {
      // `-webkit-box`/`-webkit-line-clamp` have no unprefixed twin here, so the
      // merge cannot happen; only a PAIR in the same file is the trap.
      assert.doesNotMatch(css, new RegExp(`(^|[;{\\s])${prop}\\s*:`, 'm'),
        `${file} declares both ${prop} and its prefixed twin — the minifier will keep only the prefixed one`)
    }
  }
})
