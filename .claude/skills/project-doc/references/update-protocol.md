# The refresh protocol

**Surgical refresh**: append one changelog entry, patch only what it cites, leave everything
else byte-identical. A refresh that rewrites the whole document has destroyed the record it
existed to keep — old sections drift, links rot, and nobody notices because the output still
looks plausible. This is now visible rather than trusted — a section rewritten without a
citation shows up in `git diff` and can be reverted.

Work through the steps in order.

---

## The repo is the state

The repo is the **single source of truth**. Everything a run needs — the content
(`doc-data.json`), the cursors and `artifactUrl` (`doc-state.json`), the scope
and sources (`config.json`), the citation previews (`doc-previews.json`) — lives
in `project-docs/<name>/__external/`. A run reads those files, patches them,
rebuilds with `build.mjs`, and republishes to the existing `artifactUrl`. This is
what lets the refresh run in a Claude Code cloud routine, where the repo is
cloned fresh every time: [`scripts/persist.mjs`](../../../../scripts/persist.mjs)
commits the patched files back before the run ends, so the next clone picks up
exactly where this one left off.

There is nothing to back up. The last good state is committed; `git diff` shows
exactly what this run changed and `git checkout --` discards it. The publishing
mechanics are in [`publishing.md`](publishing.md); this file is the editorial
protocol.

## Two cadence tiers, one routine

The document is meant to run **on a schedule** so it is genuinely current —
**daily by default, hourly at most**, which is the shortest interval a Claude Code
routine accepts (see [`scheduling.md`](../../project-doc-setup/references/scheduling.md)).
Most of the per-run cost is synthesis that does not change within a day. So a run
does two tiers of work, and self-paces the expensive one — there is **one**
routine, not two schedules:

- **Every run (cheap, mechanical):** advance cursors for succeeded sources;
  **auto-check watched todos** (below); append genuinely new events and lane items
  from the window; patch the sections those cite. This is pure data patching —
  a handful of field flips and array appends — so it is fast and near-free in
  tokens. Most runs are a no-op and publish nothing.
- **Once a day (expensive, synthetic):** regenerate the Today brief and its
  painting, re-evaluate `#goal`, and refresh the synthesis sections (`tldr`,
  `primer`, `glossary`). Gate this on `doc-state.json`'s `lastDaily`: do it only when the
  calendar day (in the document's `timezone`) has rolled over since `lastDaily`,
  then set `lastDaily` to now. A run that is not the day's first skips all of it.

`#panel-today` is only rebuilt on the daily tier — a run that is not the day's
first leaves the existing brief in place (it is the day's brief).

### Auto-checking watched todos

A lane item may carry `watch: { kind, ref }` (see [`data-model.md`](data-model.md)).
On every run, for each watched item, look in the new activity you already fetched:
if its PR merged or its tracker item closed, **flip its linked gantt row to
`status: "shipped"`** and write one `res` (Resolved) changelog bullet citing the
merge/close. Never invent completion — only a real merge/close checks the box. An
item whose watch has not resolved is left exactly as it is.

**Adding todos intraday** is the same mechanism in reverse: when the window brings
a new PR assigned to you or a new tracker item, append a lane item (and its gantt
row) — that is an ordinary cheap-tier data patch, no daily pass required.

## Refresh runs unattended

A refresh runs **detached, on a schedule, with no one watching**. So it **never
prompts, never blocks, never waits for confirmation.** Every branch has an
autonomous default; anything genuinely undecidable is left untouched and noted.

Two failure classes, handled differently — the whole safety model:

- **An integrity failure** — `assemble.mjs` fails on the patched document, or
  `doc-state.json`'s `format` is newer than this skill — means *the document
  would be wrong.* **Do not publish, do not commit.** The previously published
  Artifact stays live untouched, cursors are not advanced (they are in
  `doc-state.json`, which stays uncommitted), the failure is notified per
  [`publishing.md`](publishing.md), and the run exits non-zero. Never publish a
  broken or half-patched document.
- **A source outage** — one tool times out, a connector is missing in this
  environment, an API 500s — is normal for a background job. **Skip that source,
  leave its cursor exactly where it was, add one `inferred` bullet noting the gap
  ("couldn't reach Slack this run"), and carry on with the healthy sources.** The
  source self-heals next run when it is back.

The hard line under both: **a cursor is advanced only for a source that actually
succeeded this run** — and because cursors live in `doc-state.json`, they advance
only when that file is committed. A skipped or failed source keeps its old cursor, always.

## 1. Read the document's files — not the published page

The run is handed one thing: the project name. **Do not fetch the published
Artifact to find out what is in it** — its state is `project-docs/<name>/__external/`,
files on disk (see [`publishing.md`](publishing.md)):

```
project-docs/<name>/__external/doc-state.json   # cursors, lastRun, lastDaily, artifactUrl
project-docs/<name>/__external/doc-data.json    # the content you patch
```

This is what keeps even an hourly cadence cheap: per-run cost scales with
`doc-data.json` size, not the size of the published page.

If there is **no `__external/` directory**: stop. There is nothing to refresh;
`init` (via `project-doc-setup`) builds the first one. Do not fabricate a
document here.

Check `doc-state.json`'s `format` is **4**; a higher number was written by a
newer skill — stop rather than patch data you do not understand.

Read the document's other files as needed — `config.json` (scope, sources,
allowlist), `doc-previews.json` (citation hover payloads). You patch the JSON,
never the rendered markup.

## 2. The rollback point is already committed

There is nothing to back up. The last good state is committed; `git diff` shows
exactly what this run changed and `git checkout --` discards it. Patch the
`doc-data.json` you just read; it is the base.

## 3. Read the cursors

They are in `doc-state.json`.

**The cursors are the refresh window, not the calendar.** Query each source for activity
strictly after its own cursor — never "the last 24 hours", never "since yesterday". A run
that was skipped for nine days then picks up nine days of activity and self-heals. A run that
asks for "yesterday" loses eight days silently.

Cursor per source: Slack — newest `ts` per channel (and remember `includeThreads`: thread
replies to older parents never appear in channel history after the cursor — query threads
with activity after the cursor separately, per `config.md`). GitHub — highest PR number per
repo and newest commit sha **per tracked branch**. Gmail — newest `internalDate`.
Calendar — newest event end. Drive — newest `modifiedTime` per folder. Tracker — newest
item-update time, under `cursors.tracker` whatever the tracker's `kind` is.

**Figma has no cursor and is never polled.** The connector exposes no history query, so a
refresh does not ask Figma what changed. What it does instead is resolve Figma URLs that
*other* sources bring in this window — a link in a message, a PR body, a tracker item —
into real `figma` citations. A design that changed and was never mentioned anywhere does
not enter the document, and that limit is stated at setup rather than papered over.

## 4. Query each source, then decide whether anything happened

Fetch, then judge. Activity is not news: a rebase, a lint commit, a "thanks!" reply and a
calendar invite that nobody accepted are all *activity*, and none of them change a section.

**A source scoped by "decide for me" may refine its own scope.** A Gmail block with
`"auto": true` (setup derived the query rather than the user authoring it) is a starting
point, not a fixed query: when a run sees which senders and threads actually belong to the
project, it may add terms to the query — or create a Gmail label and switch to it — and
write the improved query back into `config.json`, so future reads are tighter. A block with
`"auto": false` was the user's own and is never rewritten. The same principle applies to any
source whose scope setup defaulted: sharpen it from real data, never silently narrow it in a
way that would drop already-reported items.

Custom sources are queried exactly like built-ins: call the source's `tool`, take everything
whose `cursorField` is newer than `cursors.<id>`. A source whose tool is **absent or errors
in this environment** is not a failure of the run — apply the source-outage rule from
"Refresh runs unattended": skip it, leave its cursor, note the gap with an `inferred` bullet,
and continue. Only a source that succeeded gets its cursor advanced in step 8.

**If nothing new is worth reporting:** do not republish. Advancing cursors past unreported
activity would mean republishing the document, and a republish with no changelog entry is
noise — so leave the Artifact exactly as it is. The cursors stay where they were; next run
re-reads the same small window, finds the same nothing, and is cheap. Notify nothing on a
no-change run for the doc (see the on-change rule in [`publishing.md`](publishing.md)). The
today line and relative ages stay honest regardless: the components compute them at open
time from the already-published document.

## The unit of a patch is a data node, not markup

From here on you edit **`doc-data.json`**, never HTML. The renderer
(the components) turns the patched data into markup at publish
(step 8), so a patch is an array append or a field change — the spark strip, the
filter chips, the legend, the tile counts, the gantt axis and every id are
**derived** and never touched by hand. Find the section by its `id` in
`data.sections`, edit its `blocks`, done. Block shapes are in
[`data-model.md`](data-model.md).

## 5. Append one run to What's New

Push one run object to the front of the `whatsnew` section's `blocks.runs`, set its
`latest: true`, and clear `latest` on the run that had it:

```json
{ "iso": "2026-07-24", "date": "24 July", "time": "09:26 NPT",
  "sources": "slack · github · linear", "latest": true, "bullets": [ … ] }
```

Each bullet is `{ kind, strong?, text, cites?, goto? }`:

- `kind` ∈ `dec|risk|res|add|upd|watch`; `strong` is the bold lead clause, `text` the
  rest — **two lines at most** once rendered;
- `cites: [Cite]` names where you learned it — PR, Slack permalink, doc URL, tracker item id. No
  URL is fine (the chip renders unlinked);
- `goto: { target, label }` links to the section it changed — exactly one.

A bullet with no `goto` patched nothing: find its section or cut it. A claim you inferred
rather than read carries a cite with `"kind": "link"` and hedged phrasing **or**, if there
is no artifact at all, an `inferred` mark — represent that by giving the bullet **no
`cites`** and phrasing it as a reading; the renderer/skill treats a cite-less bullet as
inferred. Every bullet is either cited or inferred; neither means it does not ship.

If a bullet needs depth, that depth lives in the block it patches (a `body`/`disc` field),
never as a second card in the changelog.

## 6. Patch only the cited data nodes

For each section the entry's `goto`s name, edit that section's `blocks` and nothing else:

- **Timeline event / decision** → push an `Event` to the `timeline` section's `blocks`:
  `{ kind, iso, date, title, gist, body?, cites?, flag? }`. A decision or pivot is just an
  event with that `kind` — the timeline **is** the decision log; `title` is the fork,
  `gist` the verdict, `body` the Why/Rejected/Consequences. The renderer re-derives the
  month cluster, the spark height, the filter chip and the legend entry — you add none of
  them.
- **State change** → edit or add a `Row` in the right group's `rows` (or add the group).
  The tile count is derived from the rows; never write it.
- **Architecture change** → edit a stage's `detail`, or add a `{ title, gist, detail }` to
  the `pipeline` blocks. Numbers, ids and arrows are derived.
- **Lane change** → edit the `lane` item **and its `gantt` row**: `status`, integer
  `c1`/`span`, and the `vh` sentence must still agree. If the window scrolled past its
  first column, re-base every row's `c1` **and set `window.start`** to the new column-1
  date. The today line is derived — never patch it.
- **Question answered** → move the item from the `ask` block's `open` array to `done`,
  adding `answer` and `cites`. Never delete the question.
- **New jargon** → add a `{ term, def, code? }` to the right glossary category's `terms`.

**The disclosure rule still governs.** When new information would make a visible line long,
the visible field (`title`/`gist`) stays one line and the detail goes into the block's
`body`/`disc` field, appended to what is there. Never shorten a visible line by dropping the
prose — move it.

Sections nobody cited are left untouched **unless** a bullet cites them, in which case fix
the wrong field rather than rewriting the section. A contradiction between an old fact and
new activity *is* a `upd` bullet: cite the section and fix the field.

**`#goal` is re-evaluated on the daily tier** (see "Two cadence tiers"), not only
when cited — append-only and confidence-gated:

- **Hard signal** — a decided change (a call, a written scope change, a milestone
  hit/missed): set the `goal` block's `current` to the new framing, push the prior framing
  as a dated `shift` (`{ date, kind, title, verdict, why?, cites }`), and write one `upd`
  bullet citing the evidence and `goto`-ing `goal`. The old framing is **never deleted** —
  it becomes the shift record.
- **Soft drift** — trending away but nothing decided: do **not** change `current`. Set the
  `goal` block's `historical` (or add a drift note) as an inferred reading, and write one
  `watch` bullet. A later run promotes it if a decision confirms, or drops it if the drift
  reverses.

Only a decision changes `current`; everything else is a visible, reversible note.

The `today` tab is not in `#doc-data` — it is the daily-brief fragment, rebuilt on the
**daily tier** and passed to `renderBody`; a run that is not the day's first leaves the
existing brief in place.
It is the day's brief, not part of the record.

## 7. Move the new flags

Flags are data: set `flag: true` on each node this entry touched, and clear `flag` on every
other node. The renderer emits the `new` pill from that field, so the badge always means
"changed in the newest entry", never "changed at some point". `assemble.mjs` need not count
markup — the flag lives on the data it belongs to.

## 8. Advance cursors, render, validate, publish

In the patched **files** — `doc-data.json` and `doc-state.json`, never the built page's
`#doc-data`/`#doc-state` blocks, which the build below regenerates from them: set each
cursor to the newest item you actually **processed from a source that succeeded** — not to
"now" (that swallows anything that arrived mid-run), and never for a source you skipped. Set
`lastRun` to the current timestamp with offset, and `doc-data.json`'s `meta.updatedAt` (the
renderer puts it in the dial).

**Build.** `node app/scripts/build.mjs <name>` renders the patched `doc-data.json`
(with the fresh Today fragment) into the document — skeleton, style, sprites,
body, the inline state blocks, the scripts — and validates it in the same step,
both passes: the `#doc-data` schema/cross-refs and the rendered-HTML sanity. The
markup is generated — you never hand-edit it.

Fix every error and re-run until clean. **If it cannot be made clean, do not publish** — the
previously published Artifact stays live, cursors are not advanced (they are in
`doc-state.json`, which is not touched until a clean build is committed), notify
the failure, exit non-zero. This is the integrity-failure branch: rollback is
simply *not committing*.

When clean, **publish and persist** per [`publishing.md`](publishing.md): republish to the
existing `artifactUrl` (updating it in place), commit with `scripts/persist.mjs`, then notify
only if this run produced a changelog entry. If a human is present, confirm what changed and
the doc's URL; unattended, the notify is the report.

---

## Rollback

There is nothing to back up. The last good state is committed; `git diff` shows
exactly what this run changed and `git checkout --` discards it. If a
*published* document is later found wrong after that run's commit landed,
`git revert` the commit and re-run from step 1 — the revert restores
`doc-data.json`/`doc-state.json`, and the next run's build republishes them.

## Re-shell

Upgrading a document's locked assets (`app.js`, `app.css`, `prerender.mjs`,
`assemble.mjs`, `mint-icons.mjs`, `doc-coverage.mjs`) is a **re-shell** — see
"What is locked, and what re-shell now means" in `SKILL.md`. It is a one-off,
separately-named run, never part of a refresh.

## Compaction — when the record outgrows the file

Depth accumulates by design, but a document too big to read is a record nobody keeps —
and an Artifact has a size ceiling of its own. When the document passes ~400 KB or
`#whatsnew` holds more than ~24 runs:

- move the `.wn-run`s beyond the newest 12, verbatim, into an **archive document** — the
  same skeleton, style and sprite blocks, one `#whatsnew`-shaped section, newest first;
- **publish the archive as its own Artifact** and store its URL in `doc-state.json`'s
  `archiveArtifactUrl` — the file, so it survives the next build;
- leave one plain link at the bottom of `.wn`: `<a class="goto" href="{{archive url}}">Older runs</a>` —
  the **absolute archive Artifact URL** when the document is hosted (a relative
  `archive.html` would be a dead link on a single hosted page), and a relative
  `archive.html` only for a purely-local, unpublished document;
- prune `#doc-previews` of keys no remaining chip references.

Sections other than What's New are never compacted — their depth is the record. Timeline
months (decision events included) and settled questions stay.

## The two gates before publishing

**Structure — `assemble.mjs`.** One command, two passes: it validates `#doc-data`
against the schema and its cross-references (via the schema, unit-tested
in the app), then the rendered-and-assembled HTML — sprites
resolve, hosts allowlisted, in-document links land, no duplicate ids, JSON blocks
parse, exactly one `latest` run, every gantt bar targeting a real lane item, every
promised preview payload present.

The invariants a run used to be asked to eyeball — tile counts, gantt integers,
disclosure bodies, filter and legend coverage, the glyph ban, the mono ration — are
**guaranteed by the components**: the renderer cannot emit them wrong, so they
are not restated here. `assemble.mjs` is the contract; this file does not keep a
second copy of it to drift from.

**Substance — `doc-coverage.mjs`.** Structure passing says the document is
well-formed, not that it is worth reading. `doc-coverage.mjs` reports density —
events by kind and by month, cite coverage and join depth, disclosure depth,
glossary and question counts, which configured sources actually contributed. On a
refresh it is advisory. At `init` it runs with `--init` and is a hard gate; see
[`init-protocol.md`](init-protocol.md).

Both apply to `init` exactly as they apply to `refresh` — a defect baked in at init
survives every surgical refresh after it.
