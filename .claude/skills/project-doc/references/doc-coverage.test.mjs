import { coverage } from './doc-coverage.mjs';

let pass = 0, fail = 0;
function expect(name, got, want) {
  if (got === want) { pass++; console.log('PASS', name); return; }
  fail++;
  console.log('FAIL', name, '\n  wanted:', want, '\n  got   :', got);
}
const has = (findings, sub) => findings.some((f) => f.msg.includes(sub));
const KINDS = ['decision', 'pivot', 'incident', 'milestone', 'build', 'meeting'];

/* A document that clears every floor: 42 events spread over 4 months, every kind
   present, all cited, half with depth, a third joined across two sources. */
function richDoc() {
  const events = [];
  for (let i = 0; i < 42; i++) {
    const month = 4 + (i % 4);              // 2026-04 … 2026-07, no gaps
    const day = String((i % 27) + 1).padStart(2, '0');
    const cites = [{ key: `slack-${i}`, kind: 'slack', raw: 's' }];
    if (i % 3 === 0) cites.push({ key: `pr-${i}`, kind: 'pr', raw: 'PR' });
    events.push({
      kind: KINDS[i % KINDS.length],
      iso: `2026-0${month}-${day}`, date: 'd', title: `t${i}`, gist: 'g',
      body: i % 2 === 0 ? 'the argument' : undefined,
      cites,
    });
  }
  return {
    meta: { project: 'X' },
    sections: [
      { id: 'whatsnew', title: 'wn', layout: 'whatsnew', blocks: { runs: [{
        iso: '2026-07-24', latest: true,
        bullets: [{ kind: 'dec', text: 'shipped a thing', goto: { target: 'timeline', label: 'T' } }] }] } },
      { id: 'timeline', title: 'tl', layout: 'timeline', blocks: events },
      { id: 'glossary', title: 'gl', layout: 'glossary', blocks: [
        { name: 'c', terms: Array.from({ length: 26 }, (_, i) => ({ term: `t${i}`, def: 'd' })) }] },
      { id: 'primer', title: 'pr', layout: 'primer',
        blocks: Array.from({ length: 9 }, (_, i) => ({ q: `q${i}`, a: 'a', body: 'b' })) },
      { id: 'architecture', title: 'ar', layout: 'pipeline',
        blocks: [{ title: 'a' }, { title: 'b' }, { title: 'c' }, { title: 'd' }] },
      { id: 'state', title: 'st', layout: 'state', blocks: [
        { state: 'flight', rows: Array.from({ length: 9 }, (_, i) => ({
          title: `r${i}`, cites: [{ key: `bead-${i}`, kind: 'bead', raw: 'B' }] })) }] },
      { id: 'goal', title: 'go', layout: 'goal', blocks: {
        current: 'now', shifts: [{ date: 'Jun 23', kind: 'pivot', title: 'narrowed', verdict: 'v' }] } },
      { id: 'ask', title: 'ask', layout: 'ask', blocks: {
        open: Array.from({ length: 11 }, (_, i) => ({ q: `q${i}?` })), done: [] } },
    ],
  };
}
const clone = (d) => JSON.parse(JSON.stringify(d));

// {THE HAPPY PATH}
const rich = coverage(richDoc());
expect('rich doc: no floors missed', rich.findings.filter((f) => f.level === 'FLOOR').length, 0);
expect('rich doc: 42 events counted', rich.stats.events, 42);
expect('rich doc: every kind present', rich.stats.kinds.pivot > 0, true);
expect('rich doc: no month gaps', rich.stats.monthGaps.length, 0);
expect('rich doc: joins detected', rich.stats.joinedEvents > 0, true);

// {THE FAILURE THIS TOOL EXISTS FOR — a well-formed but thin document}
const thin = {
  meta: { project: 'X' },
  sections: [
    { id: 'whatsnew', title: 'wn', layout: 'whatsnew', blocks: { runs: [{
      iso: '2026-07-24', latest: true,
      bullets: [{ kind: 'upd', text: 'living document created' }] }] } },
    { id: 'timeline', title: 'tl', layout: 'timeline', blocks: [
      { kind: 'build', iso: '2026-07-01', date: 'd', title: 'a', cites: [{ key: 'pr-1', kind: 'pr' }] },
      { kind: 'build', iso: '2026-07-02', date: 'd', title: 'b', cites: [{ key: 'pr-2', kind: 'pr' }] }] },
  ],
};
const t = coverage(thin);
expect('thin doc: events floor missed', has(t.findings, 'timeline events: 2'), true);
expect('thin doc: glossary floor missed', has(t.findings, 'glossary terms: 0'), true);
expect('thin doc: questions floor missed', has(t.findings, 'open questions: 0'), true);
expect('thin doc: goal archaeology missing', has(t.findings, 'goal shifts: 0'), true);
expect('thin doc: no pivots flagged', has(t.findings, 'no "pivot" events'), true);
expect('thin doc: no joins flagged', has(t.findings, 'joined across sources'), true);
expect('thin doc: changelog has no goto', has(t.findings, 'no goto'), true);

// {MONTH GAPS — a run that only read recent activity}
let d = clone(richDoc());
d.sections[1].blocks = d.sections[1].blocks.filter((e) => !e.iso.startsWith('2026-05'));
expect('month gap detected', coverage(d).stats.monthGaps.includes('2026-05'), true);

// {UNCITED ITEMS}
d = clone(richDoc());
for (const e of d.sections[1].blocks) delete e.cites;
expect('uncited events flagged', has(coverage(d).findings, 'cited events'), true);

d = clone(richDoc());
delete d.sections[5].blocks[0].rows[0].cites;
expect('uncited state row flagged', has(coverage(d).findings, 'state rows without a cite: 1'), true);

// {SILENT SOURCES — configured but never read}
const cfg = { sources: { slack: {}, github: {}, drive: {}, gmail: { enabled: false } } };
const s = coverage(richDoc(), cfg);
expect('silent source flagged', has(s.findings, 'source "drive"'), true);
expect('contributing source not flagged', has(s.findings, 'source "slack"'), false);
expect('disabled source not flagged', has(s.findings, 'source "gmail"'), false);

// {TRACKER — pluggable, and the legacy "bead" kind still counts as read}
d = clone(richDoc());
d.sections[1].blocks[0].cites.push({ key: 'lat-241', kind: 'tracker', raw: 'LAT-241' });
expect('tracker cite satisfies a tracker source',
  has(coverage(d, { sources: { tracker: { kind: 'linear' } } }).findings, 'source "tracker"'), false);
d = clone(richDoc());
d.sections[1].blocks[0].cites.push({ key: 'bead-1', kind: 'bead', raw: 'BEAD-0001' });
expect('legacy bead cite still satisfies the tracker source',
  has(coverage(d, { sources: { tracker: { kind: 'pact' } } }).findings, 'source "tracker"'), false);
expect('tracker with no cites is flagged',
  has(coverage(richDoc(), { sources: { tracker: { kind: 'jira' } } }).findings, 'source "tracker"'), true);

// {FIGMA — read-on-reference, so contributing nothing is never "silent"}
expect('figma is never flagged as a silent source',
  has(coverage(richDoc(), { sources: { figma: { files: [] } } }).findings, 'source "figma"'), false);

// {DEGRADES, NEVER THROWS}
expect('empty data does not throw', coverage({}).stats.events, 0);
expect('null data does not throw', coverage(null).findings.length > 0, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
