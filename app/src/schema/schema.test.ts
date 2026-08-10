import { test } from 'node:test'
import assert from 'node:assert/strict'

import { DocData, Cite, SectionNode } from './doc-data.ts'
import { validate } from './validate.ts'
import { isAllowed } from './doc-config.ts'

const meta = { project: 'Demo', tagline: 'A tagline.', timezone: 'UTC', updatedAt: '2026-08-08' }
const doc = (sections: unknown[]) => ({ meta, sections })

test('bead is normalised to tracker, unknown kinds degrade to link', () => {
  assert.equal(Cite.parse({ key: 'a', kind: 'bead', raw: 'BEAD-1' }).kind, 'tracker')
  assert.equal(Cite.parse({ key: 'b', kind: 'notion', raw: 'Notes' }).kind, 'link')
  assert.equal(Cite.parse({ key: 'c', kind: 'pr', raw: 'PR #1' }).kind, 'pr')
})

test('an unknown layout renders as prose rather than failing', () => {
  const s = SectionNode.parse({
    id: 'x', tab: 'project', title: 'Novel', layout: 'sankey',
    blocks: [{ type: 'p', text: 'hello' }],
  })
  assert.equal(s.layout, 'prose')
})

test('an unknown layout with unusable blocks still parses, empty', () => {
  const s = SectionNode.parse({ id: 'x', tab: 'project', title: 'Novel', layout: 'sankey', blocks: { odd: 1 } })
  assert.equal(s.layout, 'prose')
  assert.deepEqual(s.blocks, [])
})

test('a KNOWN layout with malformed blocks fails loudly', () => {
  // The whole point of preprocessing rather than using a union fallback: this
  // must not silently become a prose section.
  const r = DocData.safeParse(doc([
    { id: 't', tab: 'timeline', title: 'T', layout: 'timeline', blocks: [{ kind: 'nope', iso: 'x', title: '' }] },
  ]))
  assert.equal(r.success, false)
})

test('a gantt bar must target a real lane item', () => {
  const gantt = {
    id: 'g', tab: 'you', title: 'Lane', layout: 'gantt',
    blocks: { window: { start: '2026-07-06', unit: 'week', cols: 12 }, rows: [{ title: 'A', laneId: 'item-ghost', status: 'flight', c1: 1, span: 2 }] },
  }
  const missing = validate(doc([gantt]))
  assert.equal(missing.ok, false)
  assert.match(missing.errors.join('\n'), /matches no lane item/)

  const lane = { id: 'l', tab: 'you', title: 'Items', layout: 'lane', blocks: [{ id: 'item-ghost', title: 'A', d: 'does a thing' }] }
  assert.equal(validate(doc([gantt, lane])).ok, true)
})

test('exactly one What\'s New run is marked latest', () => {
  const run = (iso: string, latest?: boolean) => ({ iso, date: iso, time: '09:00', sources: 'Slack', latest, bullets: [] })
  const wn = (runs: unknown[]) => doc([{ id: 'w', tab: 'whatsnew', title: 'New', layout: 'whatsnew', blocks: { runs } }])
  assert.equal(validate(wn([run('2026-08-08', true), run('2026-08-07')])).ok, true)
  assert.equal(validate(wn([run('2026-08-08', true), run('2026-08-07', true)])).ok, false)
  assert.equal(validate(wn([run('2026-08-08')])).ok, false)
})

test('a cite promising a preview needs a payload in #doc-previews', () => {
  const withPreview = doc([{
    id: 'l', tab: 'you', title: 'Items', layout: 'lane',
    blocks: [{ id: 'i1', title: 'A', d: 'x', cites: [{ key: 'pr-53', kind: 'pr', raw: 'PR #53', preview: { title: 'x' } }] }],
  }])
  assert.equal(validate(withPreview).ok, false)
  assert.equal(validate(withPreview, { 'pr-53': {} }).ok, true)
})

test('the allowlist matches hosts and subdomains, and only http(s)', () => {
  const list = ['github.com', 'slack.com']
  assert.equal(isAllowed('https://github.com/a/b/pull/1', list), true)
  assert.equal(isAllowed('https://avatars.github.com/x', list), true)
  assert.equal(isAllowed('https://notgithub.com/x', list), false)
  assert.equal(isAllowed('https://evil.com/?q=github.com', list), false)
  assert.equal(isAllowed('javascript:alert(1)', list), false)
  assert.equal(isAllowed(undefined, list), false)
})
