#!/usr/bin/env node
/**
 * Fetch every remote avatar a document cites and rewrite it as a `data:` URI.
 *
 * The Artifact's CSP blocks external images, so a remote avatar URL in
 * `#doc-previews` is not merely a missed face — it is a request the browser
 * attempts, fails, and then falls back from. The card ends up showing a
 * monogram either way; inlining is what actually puts the face on it.
 *
 * A DEV-MACHINE tool: it needs the network, which is exactly why it does not
 * live beside `assemble.mjs`. The publish path stays offline and merely
 * guarantees that nothing un-inlined ships.
 *
 *   node scripts/inline-avatars.mjs <doc-previews.json> [--store avatars.json]
 *
 * With `--store`, it also FILLS faces that were never there. A payload often
 * names someone without carrying their picture — a Slack message from a person
 * whose profile the sweep did not fetch — and the project's own avatar store is
 * keyed by display name for exactly this. Someone the store does not know keeps
 * their monogram, which is a designed state, not a hole: people outside the
 * workspace genuinely have no face here.
 *
 * Idempotent — a payload already carrying `data:` URIs is left alone, so this
 * can be re-run after every refresh without re-fetching what it already has.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const file = process.argv[2]
if (!file) {
  process.stderr.write('usage: inline-avatars.mjs <doc-previews.json>\n')
  process.exit(2)
}

/** Any key naming an avatar, wherever it sits in a payload. */
const AVATAR_KEY = /avatar/i

/** Ask for a small square. GitHub honours `s=`; other hosts ignore it, which
 *  costs a few KB rather than breaking anything. */
function sized(url) {
  try {
    const u = new URL(url)
    if (u.hostname.endsWith('githubusercontent.com')) u.searchParams.set('s', '72')
    return u.toString()
  } catch {
    return url
  }
}

/** curl rather than fetch: it already honours this environment's proxy, and a
 *  build tool that silently fetches nothing is worse than one that shells out. */
function toDataUri(url) {
  const out = execFileSync('curl', [
    '-sS', '--max-time', '20', '--fail',
    '-w', '\n%{content_type}',
    '--output', '-', sized(url),
  ], { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 })

  const text = out.toString('latin1')
  const split = text.lastIndexOf('\n')
  const type = text.slice(split + 1).trim().split(';')[0]
  if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'unknown'})`)
  const bytes = out.subarray(0, split)
  return `data:${type};base64,${bytes.toString('base64')}`
}

/** Accent- and case-insensitive, and matches on any name part, because a store
 *  keyed "Joaquín" has to find "Joaquín Peña" and a payload saying
 *  "renee@northwind.com" has to find "Renée". */
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
function lookup(store, name) {
  if (!name) return undefined
  const parts = norm(name).split(/[\s@.]+/).filter(Boolean)
  for (const key of Object.keys(store)) {
    const k = norm(key)
    if (parts.includes(k) || parts[0]?.startsWith(k)) return store[key]
  }
  return undefined
}

/** Which key holds the picture for the person named by this key. */
const AVATAR_FOR = { author: 'authorAvatarUrl', owner: 'ownerAvatarUrl', name: 'avatarUrl' }

const storeArg = process.argv.indexOf('--store')
const store = storeArg > -1 && process.argv[storeArg + 1]
  ? JSON.parse(readFileSync(resolve(process.argv[storeArg + 1]), 'utf8'))
  : undefined

const path = resolve(file)
const doc = JSON.parse(readFileSync(path, 'utf8'))

// One fetch per distinct URL, however many citations share it.
const wanted = new Set()
const walk = (node, visit) => {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit))
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node)) {
    if (AVATAR_KEY.test(k) && typeof v === 'string' && !v.startsWith('data:')) visit(node, k, v)
    else walk(v, visit)
  }
}

walk(doc, (_n, _k, url) => wanted.add(url))
if (!wanted.size && !store) {
  process.stderr.write('inline-avatars: nothing to do — every avatar is already inline\n')
  process.exit(0)
}

const resolved = new Map()
let failed = 0
for (const url of wanted) {
  try {
    resolved.set(url, toDataUri(url))
  } catch (e) {
    failed++
    process.stderr.write(`  could not fetch ${url} — ${e.message}\n`)
  }
}

let rewritten = 0
let dropped = 0
walk(doc, (node, key, url) => {
  const data = resolved.get(url)
  if (data) {
    node[key] = data
    rewritten++
  } else {
    // Leaving it would ship a blocked request for the same monogram.
    delete node[key]
    dropped++
  }
})

// Fill what was never there, from the project's own store.
let filled = 0
const unknown = new Set()
if (store) {
  const fill = (node) => {
    if (Array.isArray(node)) return node.forEach(fill)
    if (!node || typeof node !== 'object') return
    for (const [nameKey, avatarKey] of Object.entries(AVATAR_FOR)) {
      const person = node[nameKey]
      if (typeof person !== 'string' || node[avatarKey]) continue
      const found = lookup(store, person)
      if (found?.src) {
        node[avatarKey] = found.src
        filled++
      } else {
        unknown.add(person)
      }
    }
    for (const v of Object.values(node)) fill(v)
  }
  fill(doc)
}

writeFileSync(path, JSON.stringify(doc))
const kb = (n) => `${(n / 1024).toFixed(1)} kB`
process.stderr.write(
  `inline-avatars: ${wanted.size} distinct URL(s), ${wanted.size - failed} fetched — ` +
  `${rewritten} reference(s) inlined, ${dropped} dropped to a monogram` +
  (store ? `, ${filled} filled from the store` : '') +
  `. File now ${kb(JSON.stringify(doc).length)}.\n`,
)
if (unknown.size) {
  process.stderr.write(
    `  no face for: ${[...unknown].join(', ')} — they keep a monogram\n`,
  )
}
