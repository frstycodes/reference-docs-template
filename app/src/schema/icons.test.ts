/**
 * Every icon must resolve to a symbol that exists.
 *
 * "Both, or icons resolve to nothing" — the document inlines two sprites, and a
 * reference to a symbol in neither renders as empty space with no error
 * anywhere. That is exactly the drift the locked-file discipline was there to
 * prevent, and it is the kind a type system cannot catch: sprite ids are
 * strings on both sides. This test is the replacement.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const read = (p: string) => readFileSync(at(p), 'utf8')

/** Every `id="…"` in the two sprites. */
function spriteIds(): Set<string> {
  const ids = new Set<string>()
  for (const f of ['../sprites/brand.svg', '../sprites/doc.svg']) {
    for (const m of read(f).matchAll(/id="([^"]+)"/g)) ids.add(m[1]!)
  }
  return ids
}

/** Walk a directory for source files. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(at(dir), { withFileTypes: true })) {
    if (entry.isDirectory()) sources(`${dir}/${entry.name}`, out)
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) out.push(`${dir}/${entry.name}`)
  }
  return out
}

test('the two sprites define no duplicate symbol id', () => {
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const f of ['../sprites/brand.svg', '../sprites/doc.svg']) {
    for (const m of read(f).matchAll(/id="([^"]+)"/g)) {
      if (seen.has(m[1]!)) dupes.push(m[1]!)
      seen.add(m[1]!)
    }
  }
  // A symbol lives in exactly one sprite — the document inlines both, so a
  // duplicate id means one of the two definitions silently wins.
  assert.deepEqual(dupes, [])
})

test('every icon a component references exists in a sprite', () => {
  const ids = spriteIds()
  const missing = new Set<string>()
  for (const file of sources('../components')) {
    const src = read(file)
    for (const m of src.matchAll(/["'`#](i-[a-z0-9-]+)["'`\s]/g)) {
      if (!ids.has(m[1]!)) missing.add(`${m[1]} (${file.split('/').pop()})`)
    }
  }
  assert.deepEqual([...missing], [])
})

test('every icon the torture fixture references exists in a sprite', () => {
  const ids = spriteIds()
  const missing = new Set<string>()
  for (const m of read('../../fixtures/torture.json').matchAll(/"icon":\s*"([^"]+)"/g)) {
    if (!ids.has(m[1]!)) missing.add(m[1]!)
  }
  assert.deepEqual([...missing], [])
})

/**
 * The external set is the one place a mark may come from OUTSIDE the sprites —
 * `doc-icons.json` carries the marks minted for sources the skill has no symbol
 * for. So the check is the same, against a larger set of ids, and it covers the
 * project's own `cards.tsx` too: a card naming a mark nobody minted renders a
 * hole, and a hole in a hover card is invisible until someone hovers.
 */
/**
 * An external set is the one place a mark may come from OUTSIDE the sprites —
 * `doc-icons.json` carries the marks minted for sources the skill has no symbol
 * for. So the check is the same, against a larger set of ids, and it covers the
 * set's own `cards.tsx` too: a card naming a mark nobody minted renders a hole,
 * and a hole in a hover card is invisible until someone hovers.
 *
 * Both sets are checked — the reference one every document copies, and the
 * standalone brief's — because each ships its own marks and its own cards.
 */
for (const [label, dir, files] of [
  ['the reference set', '../__external', ['doc-data', 'brief-data', 'doc-previews']],
  ['the standalone brief', '../../../daily-brief/__external', ['brief-data', 'doc-previews']],
] as const) {
  test(`every icon ${label} references resolves, from a sprite or from its own minted marks`, () => {
    const ids = spriteIds()
    for (const id of Object.keys(JSON.parse(read(`${dir}/doc-icons.json`)))) ids.add(id)

    const missing = new Set<string>()
    for (const file of files) {
      for (const m of read(`${dir}/${file}.json`).matchAll(/"icon":\s*"([^"]+)"/g)) {
        if (!ids.has(m[1]!)) missing.add(`${m[1]} (${file}.json)`)
      }
    }
    for (const m of read(`${dir}/cards.tsx`).matchAll(/["'`#](i-[a-z0-9-]+)["'`\s]/g)) {
      if (!ids.has(m[1]!)) missing.add(`${m[1]} (cards.tsx)`)
    }
    assert.deepEqual([...missing], [])
  })
}
