#!/usr/bin/env node
/* project-doc coverage reporter — LOCKED.
   Usage: node doc-coverage.mjs <index.html | doc-data.json> [--init] [--json]

   check.mjs asks "is this document well-formed?". This asks "is it worth
   reading?" — the question that structural validation cannot answer and that a
   thin init passes cleanly today.

   It reports density: events by kind and by month, cite coverage and join depth,
   disclosure depth, glossary and question counts, and which configured sources
   actually contributed a citation. Advisory on a refresh (always exit 0); under
   --init the floors are a hard gate (exit 1 when one is missed), because init is
   the only run that can still fix them.

   Floors scale with nothing — they are absolute, and a young project will miss
   them legitimately. That is why a miss prints WHY it missed and what to re-read,
   rather than just failing: the run decides whether the project genuinely has no
   more material, and says so to the user either way. Never pad to pass. */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FLOORS = {
  events: 40,
  glossary: 25,
  primer: 8,
  questions: 10,
  stages: 3,
  goalShifts: 1,
  stateRows: 8,
};

/* Share of items in cited sections that carry at least one cite, and share of
   timeline events that carry a disclosure. Both are ratios, not counts, so they
   stay meaningful on a small project. */
const CITE_COVERAGE = 0.95;
const DISC_COVERAGE = 0.5;
/* A joined event carries evidence from more than one source. Below this share,
   the run read its sources in isolation and never correlated them. */
const JOIN_SHARE = 0.25;

const KINDS = ['decision', 'pivot', 'incident', 'milestone', 'build', 'meeting'];

export function coverage(data, config = null) {
  const sections = (data && data.sections) || [];
  const by = (layout) => sections.filter((s) => s && s.layout === layout);
  const first = (layout) => by(layout)[0] || null;
  const arr = (v) => (Array.isArray(v) ? v : []);

  const findings = [];
  const note = (level, msg, hint) => findings.push({ level, msg, hint });

  // {TIMELINE}
  const tl = first('timeline');
  const events = tl ? arr(tl.blocks) : [];
  const kinds = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const months = new Map();
  let withCites = 0, withDisc = 0, joined = 0;
  const sourceKinds = new Set();

  for (const e of events) {
    if (e.kind in kinds) kinds[e.kind]++;
    const m = String(e.iso || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(m)) months.set(m, (months.get(m) || 0) + 1);
    const cites = arr(e.cites);
    if (cites.length) withCites++;
    if (e.body) withDisc++;
    const distinct = new Set(cites.map((c) => c && c.kind).filter(Boolean));
    for (const k of distinct) sourceKinds.add(k);
    if (distinct.size > 1) joined++;
  }

  // every calendar month between the first and last event, so a gap is visible
  const span = [...months.keys()].sort();
  const gaps = [];
  if (span.length > 1) {
    let [y, mo] = span[0].split('-').map(Number);
    const [ey, emo] = span[span.length - 1].split('-').map(Number);
    while (y < ey || (y === ey && mo <= emo)) {
      const key = `${y}-${String(mo).padStart(2, '0')}`;
      if (!months.has(key)) gaps.push(key);
      mo++; if (mo > 12) { mo = 1; y++; }
    }
  }

  // {OTHER SECTIONS}
  const glossary = by('glossary').reduce((n, s) => n + arr(s.blocks)
    .reduce((m, c) => m + arr(c.terms).length, 0), 0);
  const primer = by('primer').reduce((n, s) => n + arr(s.blocks).length, 0);
  const stages = by('pipeline').reduce((n, s) => n + arr(s.blocks).length, 0);

  const ask = first('ask');
  const open = ask && ask.blocks ? arr(ask.blocks.open).length : 0;
  const done = ask && ask.blocks ? arr(ask.blocks.done).length : 0;

  const goal = first('goal');
  const shifts = goal && goal.blocks ? arr(goal.blocks.shifts).length : 0;

  const st = first('state');
  const groups = st ? arr(st.blocks) : [];
  const stateRows = groups.reduce((n, g) => n + arr(g.rows).length, 0);
  let statedCited = 0;
  for (const g of groups) for (const r of arr(g.rows)) if (arr(r.cites).length) statedCited++;

  const wn = first('whatsnew');
  const runs = wn && wn.blocks ? arr(wn.blocks.runs) : [];
  const bullets = runs.reduce((n, r) => n + arr(r.bullets).length, 0);

  // {FLOORS}
  const check = (name, got, floor, hint) => {
    if (got < floor) note('FLOOR', `${name}: ${got} (floor ${floor})`, hint);
  };
  check('timeline events', events.length, FLOORS.events,
    'sweep the sources that contributed fewest events — usually threads, PR bodies and meeting notes');
  check('glossary terms', glossary, FLOORS.glossary,
    'the terms runs miss are the ones so familiar to the team that nobody defines them');
  check('primer cards', primer, FLOORS.primer, 'one card per idea a newcomer would stumble on');
  check('open questions', open, FLOORS.questions,
    'see "Finding the questions" in sections.md §11 — unanswered threads, decisions with no rationale, contradictions');
  check('pipeline stages', stages, FLOORS.stages, 'read the code the pipeline actually runs, not the README');
  check('goal shifts', shifts, FLOORS.goalShifts,
    'reconstruct the goal backwards from the earliest sources — the first framing is the most orienting thing in the document');
  check('state rows', stateRows, FLOORS.stateRows, 'every open thread the sources show belongs in a group');

  // {KIND COVERAGE}
  const missing = KINDS.filter((k) => !kinds[k]);
  for (const k of missing) {
    const hint = k === 'pivot'
      ? 'reversals never announce themselves — re-read for "actually", abandoned work, reopened tracker items'
      : k === 'incident'
        ? 'incidents get fixed and the channel moves on; the fix is not the record, the break is'
        : 'if the project genuinely had none, say so to the user';
    note(events.length ? 'GAP' : 'INFO', `no "${k}" events on the rail`, hint);
  }

  // {RATIOS}
  if (events.length) {
    const cc = withCites / events.length;
    if (cc < CITE_COVERAGE) {
      note('FLOOR', `cited events: ${(cc * 100).toFixed(0)}% (floor ${CITE_COVERAGE * 100}%)`,
        'an item you cannot cite does not go in a cited section — cite it or mark it inferred');
    }
    const dc = withDisc / events.length;
    if (dc < DISC_COVERAGE) {
      note('GAP', `events with a disclosure: ${(dc * 100).toFixed(0)}% (want ${DISC_COVERAGE * 100}%)`,
        'the argument was read and discarded — capture verbatim into init-notes.md while sweeping');
    }
    const js = joined / events.length;
    if (js < JOIN_SHARE) {
      note('GAP', `events joined across sources: ${(js * 100).toFixed(0)}% (want ${JOIN_SHARE * 100}%)`,
        'the same decision is argued in Slack, recorded in notes, built in a PR and tracked on the board — merge them into one event');
    }
  }
  if (stateRows && statedCited < stateRows) {
    note('FLOOR', `state rows without a cite: ${stateRows - statedCited}`,
      'Current state is a cited section');
  }

  // {SOURCE CONTRIBUTION}
  /* Which citation kinds prove a configured source was actually read. Figma is
     absent on purpose: it has no cursor and is only ever read on reference (see
     source-contract.md), so contributing nothing is a legitimate outcome, not a
     source that was skipped. */
  const CITE_FOR = {
    slack: ['slack', 'thread'], github: ['pr', 'commit'], gmail: ['gmail'],
    calendar: ['cal'], drive: ['drive'], repo: ['path', 'commit'],
    tracker: ['tracker', 'bead'], pact: ['tracker', 'bead'],
  };
  const silent = [];
  if (config && config.sources) {
    for (const [id, block] of Object.entries(config.sources)) {
      if (id === 'custom' || !block || block.enabled === false) continue;
      const kinds_ = CITE_FOR[id];
      if (!kinds_) continue;
      if (!kinds_.some((k) => sourceKinds.has(k))) silent.push(id);
    }
    for (const c of arr(config.sources.custom)) {
      if (c && c.id && !sourceKinds.has(c.citationKind)) silent.push(c.id);
    }
  }
  for (const id of silent) {
    note('GAP', `source "${id}" is configured but contributed no citation`,
      'either it was never read, or it was unreachable and that must be said out loud');
  }

  // {WHAT'S NEW}
  if (!runs.length) note('FLOOR', 'no What\'s New runs', 'init writes the first entry too');
  else if (runs[0] && !arr(runs[0].bullets).some((b) => b && b.goto)) {
    note('GAP', 'newest changelog entry has no goto', 'a bullet with no goto patched nothing');
  }

  const stats = {
    events: events.length, kinds, months: months.size, monthGaps: gaps,
    citedEvents: withCites, eventsWithBody: withDisc, joinedEvents: joined,
    glossary, primer, stages, questionsOpen: open, questionsSettled: done,
    goalShifts: shifts, stateRows, runs: runs.length, bullets,
    sourceKinds: [...sourceKinds].sort(), silentSources: silent,
  };
  return { stats, findings };
}

/* ---- CLI ---- */

function extract(path) {
  const raw = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) {
    const v = JSON.parse(raw);
    return { data: v.sections ? v : v.data || null, config: v.config || null };
  }
  const grab = (id) => {
    const m = raw.match(new RegExp(
      `<script type="application/json" id="${id}">([\\s\\S]*?)</script>`));
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch { return null; }
  };
  return { data: grab('doc-data'), config: grab('doc-config') };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: node doc-coverage.mjs <index.html|doc-data.json> [--init] [--json]');
    process.exit(2);
  }
  const init = process.argv.includes('--init');
  const asJson = process.argv.includes('--json');
  const { data, config } = extract(path);
  if (!data) {
    console.error(`no #doc-data in ${path} — a format-2 document must be migrated first`);
    process.exit(2);
  }
  const { stats, findings } = coverage(data, config);

  if (asJson) {
    console.log(JSON.stringify({ stats, findings }, null, 2));
  } else {
    const k = stats.kinds;
    console.log(`events      ${stats.events}  (` +
      KINDS.map((x) => `${x.slice(0, 4)} ${k[x]}`).join(' · ') + ')');
    console.log(`             ${stats.citedEvents} cited · ${stats.eventsWithBody} with depth · ${stats.joinedEvents} joined across sources`);
    console.log(`months      ${stats.months} covered` +
      (stats.monthGaps.length ? `, ${stats.monthGaps.length} empty: ${stats.monthGaps.join(', ')}` : ''));
    console.log(`glossary    ${stats.glossary} terms`);
    console.log(`primer      ${stats.primer} cards`);
    console.log(`pipeline    ${stats.stages} stages`);
    console.log(`state       ${stats.stateRows} rows`);
    console.log(`goal        ${stats.goalShifts} shifts`);
    console.log(`ask         ${stats.questionsOpen} open · ${stats.questionsSettled} settled`);
    console.log(`whatsnew    ${stats.runs} runs · ${stats.bullets} bullets`);
    console.log(`sources     ${stats.sourceKinds.join(' · ') || '(none)'}`);
    console.log('');
    for (const f of findings) {
      console.log(`${f.level.padEnd(5)} ${f.msg}`);
      if (f.hint) console.log(`      ↳ ${f.hint}`);
    }
    const floors = findings.filter((f) => f.level === 'FLOOR').length;
    const gaps = findings.filter((f) => f.level === 'GAP').length;
    if (!findings.length) console.log('coverage clean');
    else console.log(`\n${floors} floor(s) missed, ${gaps} gap(s)`);
    if (floors && !init) console.log('advisory (refresh) — floors are enforced only under --init');
    if (floors && init) {
      console.log('\nGo back to the sweep. Do not pad a section to clear a floor:\n' +
        'a fabricated event is worse than a missing one. If the project genuinely\n' +
        'has no more material, say which floor is unmet and why.');
    }
  }
  process.exit(init && findings.some((f) => f.level === 'FLOOR') ? 1 : 0);
}
