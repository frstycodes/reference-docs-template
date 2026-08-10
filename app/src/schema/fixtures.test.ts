import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { mintIcons, type MintedIcon } from '../lib/mint-icons.mjs'

import { validate } from './validate.ts'
import { LAYOUTS, type SectionNode } from './doc-data.ts'
import { DocConfig, isAllowed } from './doc-config.ts'
import { readPreviews } from './doc-previews.ts'
import { BriefData } from './brief-data.ts'

const load = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../fixtures/${name}.json`, import.meta.url)), 'utf8'))

/** The reference external set — what `npm run dev` boots against and what a new
 *  document copies. Checking it here is what stops it rotting into a shape the
 *  app no longer accepts. */
const reference = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../__external/${name}.json`, import.meta.url)), 'utf8'))

/** The standalone brief's external set. There is one, it spans every project,
 *  and it lives beside the skill that publishes it rather than under any one
 *  project. */
const briefExternal = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../daily-brief/__external/${name}.json`, import.meta.url)), 'utf8'))

/** The sample under "## Config schema" in `daily-brief-setup` — what a setup
 *  agent transcribes into a fresh repo, and therefore the shape every new
 *  standalone brief is born with. */
function documentedBriefConfig(): Record<string, unknown> {
  const skill = readFileSync(
    fileURLToPath(new URL('../../../.claude/skills/daily-brief-setup/SKILL.md', import.meta.url)), 'utf8')
  const block = /## Config schema[\s\S]*?```json\n([\s\S]*?)```/.exec(skill)
  assert.ok(block, 'daily-brief-setup no longer documents a config sample')
  return JSON.parse(block[1]!)
}

const previews = readPreviews(reference('doc-previews'))

test('the reference document is publishable', () => {
  const r = validate(reference('doc-data'), previews)
  assert.deepEqual(r.errors, [])
  assert.equal(r.ok, true)
})

test('the reference document exercises every layout the renderer implements', () => {
  const r = validate(reference('doc-data'), previews)
  const used = new Set(r.data!.sections.map((s) => s.layout))
  // `generic` is an alias of `prose`; the reference need not carry both.
  const missing = LAYOUTS.filter((l) => l !== 'generic' && !used.has(l))
  assert.deepEqual(missing, [], `the reference document never renders: ${missing.join(', ')}`)
})

test('the reference set resolves every citation it makes', () => {
  const r = validate(reference('doc-data'), previews)
  const keys = new Set<string>()
  JSON.stringify(r.data, (k, v) => (k === 'cites' && Array.isArray(v)
    ? (v.forEach((c: { key?: string }) => c.key && keys.add(c.key)), v)
    : v))
  const missing = [...keys].filter((k) => !previews[k]?.preview)
  assert.deepEqual(missing, [], `no hover card for: ${missing.join(', ')}`)
})

test('the reference config carries the hosts its citations link to', () => {
  const config = DocConfig.parse(reference('config'))
  const urls: string[] = []
  JSON.stringify(reference('doc-data'), (k, v) => (k === 'url' && typeof v === 'string' ? (urls.push(v), v) : v))
  const blocked = [...new Set(urls.filter((u) => !isAllowed(u, config.allowlist)))]
  assert.deepEqual(blocked, [], `these would render unlinked: ${blocked.join(', ')}`)
})

test('every minted mark in the reference set survives its sanitiser', () => {
  const icons = reference('doc-icons') as Record<string, MintedIcon>
  const warns: string[] = []
  const { ids } = mintIcons(icons, (m) => warns.push(m))
  assert.deepEqual(warns, [])
  assert.deepEqual([...ids].sort(), Object.keys(icons).sort())
})

test('torture fixture is publishable — every degradation is legal, not an error', () => {
  const r = validate(load('torture'))
  assert.deepEqual(r.errors, [])
})

test('torture fixture degrades exactly as designed', () => {
  const r = validate(load('torture'))
  const byId = new Map(r.data!.sections.map((s) => [s.id, s] as const))

  // An unknown layout becomes prose rather than failing the document.
  assert.equal(byId.get('novel')!.layout, 'prose')

  const cites = (byId.get('whatsnew') as SectionNode & { layout: 'whatsnew' })
    .blocks.runs[0]!.bullets[0]!.cites!
  const kind = (key: string) => cites.find((c) => c.key === key)!.kind
  assert.equal(kind('legacy'), 'tracker', 'bead normalises to tracker')
  assert.equal(kind('unknown-kind'), 'link', 'an unknown kind falls back to the generic chip')
})

test('torture fixture warns where it should, without blocking a publish', () => {
  const r = validate(load('torture'))
  const warned = r.warns.join('\n')
  assert.match(warned, /runs outside the window/, 'the overrunning gantt bar is a warning')
  assert.equal(r.ok, true, 'warnings never block a publish')
})

/* ── The brief, both scopes ────────────────────────────────────────────── */

test('both brief scopes parse, each from the external set that owns it', () => {
  for (const [json, label, scope] of [
    [reference('brief-data'), 'app/src/__external/brief-data.json', 'project'],
    [briefExternal('brief-data'), 'daily-brief/__external/brief-data.json', 'all'],
  ] as const) {
    const r = BriefData.safeParse(json)
    assert.deepEqual(
      r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      [],
      label,
    )
    assert.equal(r.data!.meta.scope, scope)
  }
})

test('the standalone brief exercises every section kind', () => {
  const brief = BriefData.parse(briefExternal('brief-data'))
  const used = new Set(brief.sections.map((s) => s.kind))
  const missing = ['todos', 'updates', 'schedule', 'reads', 'prose'].filter((k) => !used.has(k as never))
  assert.deepEqual(missing, [], `the standalone brief never renders: ${missing.join(', ')}`)
})

test('the standalone brief resolves every citation it makes, and links every host', () => {
  const brief = BriefData.parse(briefExternal('brief-data'))
  const previews = readPreviews(briefExternal('doc-previews'))
  const config = DocConfig.parse(briefExternal('config'))

  const keys = new Set<string>()
  const urls: string[] = []
  JSON.stringify(brief, (k, v) => {
    if (k === 'cites' && Array.isArray(v)) v.forEach((c: { key?: string }) => c.key && keys.add(c.key))
    if (k === 'url' && typeof v === 'string') urls.push(v)
    return v
  })

  assert.deepEqual([...keys].filter((k) => !previews[k]?.preview), [], 'citations with no hover card')
  assert.deepEqual([...new Set(urls.filter((u) => !isAllowed(u, config.allowlist)))], [], 'hosts that would render unlinked')
})

/**
 * The documented sample and the committed file drifted apart once, and nothing
 * caught it: the brief build takes no `--config`, so no schema ever runs on this
 * path. A config transcribed from a sample missing `allowlist` produces a
 * complete, valid, entirely unlinked brief and publishes it with exit 0.
 */
test('the documented brief config is the shape the committed one has', () => {
  const sample = documentedBriefConfig()
  DocConfig.parse(sample)
  assert.deepEqual(
    Object.keys(sample).sort(),
    Object.keys(briefExternal('config')).sort(),
    'daily-brief-setup documents a different key set than daily-brief/__external/config.json has',
  )
  assert.ok(Array.isArray(sample.allowlist) && sample.allowlist.length,
    'a sample with no allowlist teaches an unlinked brief')
})

test('the standalone brief discloses what it learned', () => {
  const brief = BriefData.parse(briefExternal('brief-data'))
  assert.ok(brief.learned.length, 'the reference brief should exercise the strip')
  assert.ok(
    brief.learned.some((l) => l.kind === 'rule'),
    'a rule is the entry that changes behaviour — the fixture must cover it',
  )
})

test('a brief that learned nothing carries no strip', () => {
  const { learned, ...rest } = briefExternal('brief-data') as Record<string, unknown>
  assert.deepEqual(BriefData.parse(rest).learned, [], 'absent learned must parse to an empty list, not undefined')
})

test('memory carries the three headings the skill writes into', () => {
  const memory = readFileSync(
    fileURLToPath(new URL('../../../daily-brief/__external/memory/index.md', import.meta.url)), 'utf8')
  for (const heading of ['## Rules', '## Observations', '## References']) {
    assert.ok(memory.includes(heading), `memory/index.md lost "${heading}"`)
  }
})

// Memory quotes private material — the reason it is safe to keep beside the data
// is that nothing reads it into the page. That is a property of `build.mjs`'s
// argument list, which is exactly the kind of thing a later flag quietly breaks.
test('memory never reaches a published brief', () => {
  const marker = 'MEMORY-MUST-NOT-SHIP'
  const index = fileURLToPath(new URL('../../../daily-brief/__external/memory/index.md', import.meta.url))
  const original = readFileSync(index, 'utf8')
  const out = join(mkdtempSync(join(tmpdir(), 'leak-')), 'brief.html')
  try {
    writeFileSync(index, `${original}\n<!-- ${marker} -->\n`)
    execFileSync('node', [fileURLToPath(new URL('../../scripts/build.mjs', import.meta.url)), 'brief', '--out', out],
      { stdio: 'ignore' })
    const html = readFileSync(out, 'utf8')
    assert.ok(html.includes('Dependabot PRs are never to-dos.'), 'the built page is not being read — the leak check would pass vacuously')
    assert.ok(!html.includes(marker), 'memory content reached the published brief')
  } finally {
    writeFileSync(index, original)
  }
})
