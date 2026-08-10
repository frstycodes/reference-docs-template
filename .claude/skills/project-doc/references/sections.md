# The eleven sections

> **You write data, never markup.** The locked renderer
> The components own every tag in the document — the panels,
> the dial, the no-JS nav, the spark strip, the filters, the legend, the tiles, the
> Gantt axis, the ids. You write `#doc-data` (schema in
> [`data-model.md`](data-model.md)) and it emits the HTML, golden-tested in
> the component tests.
>
> This file is therefore about **content**: what each section is for, how deep it
> goes, its voice, and the rules a renderer cannot enforce. Field names below are
> `#doc-data` fields. Where a rule names a CSS class, it is naming a thing the
> renderer produces so you know what your data becomes — not something to type.

One panel per tab; sections nest inside panels, in `sections` array order. Every
section carries an `eyebrow`, a `title` and a `lead` — one line, not three — that
says what the section is for. A returning reader must be able to tell from that
line whether this section answers their question.

**There is no masthead.** The document opens straight into Today's painting. The
project name and updated-at live in the dial's popover, which the renderer emits
from `meta.project` and `meta.updatedAt`. Emit no header, no title bar, no meta
strip, and do not reintroduce the project name anywhere in the body.

---

# The disclosure rule

**This rule outranks every other instruction in this file, including every
instruction to be sparser. Read it before writing a single section.**

No content may be deleted to make a section sparse. The page reads sparse because
depth is *folded*, not because depth was *cut*.

Every unit of content is written in two parts:

1. **The visible line** — a headline (`title`) plus a one-line gist (`gist`). This
   is all the reader sees by default. One line. Not a paragraph that happens to be
   short.
2. **The disclosure** — the `body` / `disc` field, holding the **full original
   prose, verbatim**: the reasoning, the alternatives, the caveats, the names, the
   numbers, the links.

Consequences, stated plainly because runs get this wrong:

- A run that shortens a visible line **must move the full text into the
  disclosure**. Never drop it, never paraphrase it into oblivion, never "the gist
  is enough". Summarising away detail is a defect, not a style choice.
- On refresh, if a visible line changes, the disclosure keeps the prior prose plus
  the new. Depth accumulates; the surface stays one line.
- If a unit genuinely has no depth, it has no disclosure. An empty one is worse
  than none.
- The prose comes from `init-notes.md` at init (see
  [`init-protocol.md`](init-protocol.md)) and from the fetched source at refresh.
  A disclosure you have to invent is a disclosure whose source you discarded too
  early.

---

# Density — folding is not fewer items

The disclosure rule is about **how much text is visible per item**. It says
nothing about **how many items there are**, and confusing the two is the single
most common way this document comes out thin.

- **Sparse surface, dense record.** Forty timeline events each showing one line is
  correct. Twelve events each showing one line is a document that missed
  twenty-eight things.
- **Today is the tone, not the volume.** The other tabs match the brief's *visual
  calm* — one level of surface, one line per item, depth folded. They do not match
  its length. Today covers one day; Timeline covers the project.
- **Cutting an item is never a way to make a section read better.** If a section
  feels heavy, its items are showing too much each — fold them. The item stays.

Per-section floors are in [`init-protocol.md`](init-protocol.md) and are reported
by `doc-coverage.mjs`. They scale with what the project actually has; they are
never met by padding.

---

# Type policy

| Family | Allowed | A bug |
|---|---|---|
| `--serif` | section titles, the dial's project name, the newest What's New date, timeline month labels | body copy, labels, any paragraph |
| `--mono` | machine tokens only — PR numbers, tracker ids, commit shas, identifiers | dates, source names, eyebrows, pills, tile numbers, meta |
| `--sans` | everything else, including every large number | — |

The renderer places the families; what you control is **what you call a token**.
A real identifier (`t1ExplicitGw`, `packages/db`) is a token; a phrase is not. A
mono date is a bug.

# Colour policy

The document has exactly **two** hues, and neither is ever the only channel.

| Token | Value | Means |
|---|---|---|
| `--accent` | `#FFE501` | a choice was made, or this is where you are |
| `--alert` | `#FF6B5A` | this needs a response — at risk, blocked, incident |

**Status is never colour alone.** Every coloured mark keeps its icon and its word;
the renderer guarantees this as long as you use the documented `kind` and `status`
values. A third hue is a spec change, not a run's decision.

One fenced exception, inside preview cards only: a GitHub card speaks Primer's own
state colours (merged purple, open green, closed red, draft grey, additions green,
deletions red), because recolouring them to our accent would misreport what they
mean to anyone who uses the site.

---

# Citations — an icon chip on every cited item

Every cited item carries a source chip, rendered from the citation's `kind`, so a
plain-text citation with no URL still gets its icon — as a `<span>`, never as a
fabricated link.

| Kind | Used for | Label |
|---|---|---|
| `slack` | a message or thread | the channel |
| `pr` | a GitHub PR | `PR #53` |
| `commit` | a repo commit | the short sha |
| `gmail` | a mail thread | sender or subject |
| `cal` | one sitting of a meeting | the meeting |
| `drive` | a doc | the doc title |
| `tracker` | a task/issue tracker item, whichever tracker the project uses | its real id — `BEAD-0082`, `LAT-241`, `#412` |
| `figma` | a design file or frame | the frame name |
| `path` | a repo path | the path |
| `thread` | something said with no permalink | where it was said |
| `link` | anything else with a URL | the host or title |

**Never invent a kind string** — an unknown kind falls back to the generic `link`
chip, so inventing one silently loses specificity. `bead` still renders as
`tracker` for documents built before the tracker was made pluggable; write
`tracker` in new data.

**The chip's label is the team's own vocabulary.** The wire kind is `tracker` for
every team, but `raw` carries the item's real id in the team's scheme, and prose
around it uses the tracker's `itemNoun` — `bead`, `issue`, `ticket`, `story`. A
document that says "bead" to a Jira shop reads as though it were written for
somebody else.

## Resolving a citation

**A chip is a link.** Every chip a run can resolve becomes an anchor that opens the
thing it names; a chip that only looks like a citation and goes nowhere is the
document lying about its own sourcing.

There is no separate resolution pass or sidecar file: you write `url`, `preview`
and `icon` straight onto the `Cite` object in `#doc-data` while composing it
(schema in [`data-model.md`](data-model.md)).

**Deriving the key**, in this order:

1. Normalise the raw citation text to a key — `PR #53` → `pr-53`, `BEAD-0082` →
   `bead-0082`, a Slack permalink → `slack-{channel}-{ts}`, a Drive file id →
   `drive-{id}`, a Calendar event id → `cal-{id}` (use the **instance** id,
   `…_20260701T160000Z`, never the recurring-series id — a citation names one
   sitting of a meeting, not the series), a repo path → `path-{slugified path}`.
   Lowercase, hyphens, no other punctuation; a provider id keeps its own case.
2. No real URL for it → leave `url` unset. Never invent one, never guess the org
   or repo from context, never reuse a URL from a similar-looking citation — the
   chip still renders, with its icon, as an unlinked `<span>`.
3. A `url` whose host passes `#doc-allowlist` renders linked; any other `url`
   (missing, or its host not allowlisted) renders unlinked, with the URL kept
   nearby as plain text if it is worth copying.
4. Not confident enough to link at all — mark the claim `inferred` (see "Shared
   vocabulary" below) instead of writing a tentative `url`. A probable link is
   not a fact.
5. If you have a preview payload for it, add it to `#doc-previews` under the same
   `key` and it binds to the chip automatically.

A citation with no `url` is not a failure — it renders unlinked with its source
icon, and the document is still correct.

## The preview payload

The components build the hover card from `#doc-previews` — you emit no
markup for it and **no card ever makes a request**. What you supply is the payload:

| Kind | `preview` fields |
|---|---|
| `pr` | `number, repo, title, state` (`open`/`closed`/`merged`/`draft`), `author, authorAvatarUrl, additions, deletions, changedFiles, createdAt, mergedAt, closedAt, branch` — `closedAt` so a closed PR's age names its close, not its creation |
| `slack` | `channel, author, authorAvatarUrl, text, ts, permalink` |
| `tracker` | `id, title, status, assignee, due` (`bead` is the legacy kind name for the same payload) |
| `figma` | `file, node, page` — names only. Figma exposes no modified time and no author, so the card claims neither; do not fabricate them |
| `cal` | `title, start, end` (ISO **with the doc timezone's offset**), `day, dateNum, month, time` (pre-formatted in the doc timezone — a *range* has no single ISO field to format from), `attendees: [{ name, avatarUrl }], attendeeCount, conferenceUrl, location, organizer` |
| `drive` | `title, mimeType, modified, owner, ownerAvatarUrl` |
| `path` | `path, exists, lines` |

Rules: drop `permalink`/`url` from the payload (the chip's own href carries them);
include a citation **only if a chip references it** — never write a payload for
everything you resolved, only what a chip actually cites; a band with nothing to
say is omitted by the renderer, never left empty.

Avatars are the only thing a card can fetch, and only from an allowlisted host —
otherwise a monogram, which is also the load-error fallback. `authorAvatarUrl` also
accepts a **`data:image/{png|jpeg|gif|webp};base64,…` URI**, which needs no
allowlist entry. Prefer it: Slack's API commonly returns no avatar URL at all, and
a face inlined at build time survives an expired CDN link. Roughly 4 KB per 48px
JPEG. Match a face to a message by **given name only, normalised** —
`String(n).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()` on both sides, so
`Ivan Reyes` finds the face filed under `Iván`. No match is not a failure.

# The dial

Navigation is one floating button, bottom-right, whose popover holds the six tabs.
**The renderer emits all of it** — markup, ids, roles, `data-short`, tab icons —
from your `sections` array and `meta`. Proximity-open, arrow keys, Escape, outside
click, the sound and the motion are all in the components, and all of it is off
under `prefers-reduced-motion`. There is nothing here for you to write.

---

## 1. Today — `#panel-today`

**You do not write this section.** Invoke the sibling `daily-brief` skill with
`scope: project` plus the project's `brief` block from [`config.md`](config.md).
It returns a markup **fragment** — no doctype, head, style, script or sprite —
which you pass to `renderBody` to drop inside `#panel-today` unmodified.

It also returns **the fragment's citation preview payloads**, which you merge
into `#doc-previews` alongside your own. A fragment cannot carry that block —
there is exactly one per document, and it is yours. Merge them and Today's chips
open the same hover cards as every other tab; drop them and Today is the one tab
whose citations go nowhere, which is the state this contract exists to prevent.
Keys collide harmlessly: the same PR cited in Today and in Timeline is one entry.

If the sibling skill is unavailable, `#panel-today` becomes a single quiet callout
saying the brief could not be generated, and the other six tabs carry on.

With the masthead gone, **the painting hero is the document's opening**. Nothing
goes above it. `daily-brief` also renders a standalone all-projects brief; that
output is never embedded here.

## 2. What's New — `#whatsnew`

A dated spine: one rail, each run hanging off it, newest first and unmistakable.
Older runs recede by type size and ink, never by being hidden.

One run object per refresh — never an entry for a run that found nothing, exactly
one carrying `latest: true`. Each bullet is `{ kind, strong, text, cites, goto }`:

| `kind` | Word | Means |
|---|---|---|
| `dec` | Decision | a choice made or reversed |
| `add` | Shipped | merged, deployed, done |
| `upd` | Updated | progress, scope, dates |
| `risk` | Risk | a new blocker or incident |
| `res` | Resolved | a blocker cleared, a question answered |
| `watch` | Watch | an upcoming gate or session |

**Bullets are project news, never document meta.** "Clerk secret fixed — pre-alpha
demo unblocked" is a bullet; "updated the timeline section" is not. This holds for
the **first** entry as much as every later one: init's opening entry is the short
version of the project's history so far, not a note that a document was created.

`strong` + `text` is **two lines at most** once rendered; a bullet that wants a
third wants to be two bullets, or wants its depth in the section it patches. Every
bullet carries at least one cite and **exactly one `goto`** — a bullet with no
`goto` patched nothing, which means it did not belong here. A claim with no
artefact at all ships with no `cites` and hedged phrasing; the renderer treats a
cite-less bullet as inferred.

`srcNote` — the "compiled from" line — appears **exactly once in the document**, as
the last element of this section. Never under `#ask`, never in the You tab.

## 3. TL;DR — `#tldr`

**Fifteen seconds, and the numbers do the work.** Three to five tiles, then the one
sentence a reader must not miss (`key`). That is the whole visible surface; the
paragraph goes in `long` / `longGist`, folded.

A tile is a **real number with a unit**, never a word dressed as a metric. If you
cannot put a figure in `n`, it is not a tile — it is a sentence, and sentences live
in the disclosure. At most one `risk` tile: it is the loud rung, and two loud tiles
are none.

Synthesis, no citations.

## 4. The goal — `#goal`

The goal as it stands (`current`), **and every framing it has had** (`shifts`),
with dates and who moved it. The now-historical framing goes in `historical`.

This is the decision log's one home for scope: the Decisions tab is retired, and
project decisions live on the timeline. What belongs here is specifically the
**goal moving**.

Each shift is `{ date, kind, title, verdict, why, cites }`, `kind ∈ decision |
pivot | milestone`. `title` is what moved; `verdict` is a **statement about the
present** — what the goal now says — never a restatement of the title. `why` names
who moved it and on what evidence.

At init this section is archaeology, reconstructed backwards from the earliest
sources — see "Goal archaeology" in [`init-protocol.md`](init-protocol.md). On
refresh it is append-only and confidence-gated: only a decision changes `current`,
and prior framings are never deleted.

## 5. Primer — `#primer`

**Question-and-answer cards**: `{ q, a, body }`. One question per card, a short
answer in view, the full explanation folded. Never a wall of explanatory prose.

Write the questions in the words a newcomer would actually use ("what is a demand
ratchet?"), not in the words the team uses to answer them. The glossary defines the
shorthand; the primer explains the **ideas underneath it**. Eight to fourteen
cards. Synthesis, no citations.

## 6. Glossary — `#glossary`

A scannable term grid, grouped into categories, with search and a letter rail the
renderer derives from the terms present.

A definition is **one sentence** — anything longer is a Primer card. Terms are the
words the team actually says, taken from how they talk in the channel, not from a
dictionary of the domain. A term that is a real identifier goes in `code` (that is
the mono ration); a term that is a phrase does not.

Twenty-five terms is a thin glossary for a real project. Every acronym in the
channel, every table and field name that comes up in review, every bit of domain
vocabulary the team uses without explaining — those are the entries, and the ones
runs miss are the ones so familiar to the team that nobody ever defines them.
Synthesis, no citations.

## 7. Architecture — `#architecture`

A left-to-right pipeline of stages, `{ title, gist, detail }`, with an inspector
beneath. The renderer derives the numbering, the ids and the arrows.

`gist` is one short clause. `detail` says what actually runs and where, **named as
the repo names it**, with identifiers as tokens. Component names come from the
code, not from how the channel describes them.

Anything genuinely not a stage — deploy topology, environments, the auth model —
goes below the diagram as generic blocks, not as a fake stage.

## 8. Current state — `#state`

Groups, in this order, only the ones with items: **risk · blocked · flight ·
shipped**. What is stuck reads before what is finished. Tile counts are derived
from the rows — you never write a count.

Each `Row` is `{ title, status, gist, cites }`. `status` ∈ `done | progress |
notstarted | review`. **Cited section**: every row carries a cite or an `inferred`
mark. `gist` is one line; depth folds into the row's disclosure.

### Contradictions

Any project of a few months' standing has a record that disagrees with itself: a
tracker item marked done whose PR never merged, a decision the meeting notes reverse, a
README describing a pipeline the code no longer runs, two dates for one launch, a
metric defined twice with different meanings.

**Surface these as their own group of rows.** They are among the most valuable
things in the document, and they are invisible to a refresh — a refresh sees one
hour and cannot know it disagrees with March. Each contradiction row states what
each source claims, carries **both** cites, and offers — as an `inferred` reading,
never as fact — which one the run believes and why.

**Do not pick a winner and quietly drop the loser.** The reader needs to know the
record is contested; that is what stops them acting on the wrong half of it. An
unresolved contradiction usually also becomes a question in `#ask`.

## 9. Timeline — `#timeline`

**Denser in information, lighter in text.** Events cluster by month; the renderer
derives the month clusters, the activity strip, the filter chips, the legend, the
dots and the ORDER. Supply events in any order — chronological is easiest to
write — and the reader chooses: newest first by default, because someone opening
this document is catching up, with an oldest-first toggle beside the filters for
reading the project forward.

**So the `lead` must not name an order.** It is a control now, not a property of
the data, and a lead that says "oldest first" is wrong half the time.

`Event = { kind, iso, date, title, gist, body, bodyHead, cites, flag }`.

| `kind` | Means |
|---|---|
| `decision` | a choice was made |
| `pivot` | a choice was **reversed** |
| `incident` | something broke or blocked people |
| `milestone` | a commitment made, hit or missed |
| `build` | something shipped |
| `meeting` | people met and it mattered |

`title` is the thing that happened — for a decision, the fork ("Airtable ruled
out; AWS chosen"). `gist` is **what is true now because of it**, one line, never a
restatement of the title. **Cited section.**

**A decision is an event here — the timeline is the decision log.** There is no
Decisions tab. A `decision` or `pivot` event carries its full record in place:
rationale, alternatives and consequences fold into `body` under `Why` / `Rejected`
/ `Consequences`. A decision whose body does not say **who decided** is missing its
most useful fact. The `decision` filter *is* the decision-log view — one press and
the rail shows only the forks, in order.

`decision` and `pivot` are different events and are told apart on two channels
that are not colour: the icon (fork vs pivot) and the dot (filled disc vs dashed
ring). `incident` is the one place the timeline uses `--alert`, and it still
carries its icon and its word.

What goes on the rail — and how to hunt the kinds runs always miss — is "The event
bar" in [`init-protocol.md`](init-protocol.md). The short version: **anything a
returning teammate would be annoyed not to have been told**, which is a much lower
bar than "significant".

## 10. Your lane — `#lane`

Two halves: a **Gantt of your work across time** (`gantt`), then the same items in
full (`lane`). Every bar links to its item, so the two never disagree.

**The chart's data contract**, per row: `title`, `laneId` (the item it links to),
`status` ∈ `shipped | flight | blocked | risk`, integer `c1` and `span` inside
`1…cols`, an optional `dep` naming a predecessor, and a `vh` sentence naming the
item, its status, its span and its dependency — that sentence is the chart's
accessible equivalent.

Geometry rules, because a wrong integer silently lies:

- Choose the window first — **twelve to sixteen columns**, one week or one month
  each — and put `start` (the ISO date column 1 begins on), `unit` and `cols` in
  `window`. Those let the runtime keep the today line honest between refreshes.
- An item starting before the window starts at column 1; an item with no end date
  spans to the last column.
- The today line is **derived** — never patch it. The components recompute its
  column from `start`/`unit` on every open and removes it when today leaves the
  window, so a document that sat unrefreshed for a month still draws today where
  today is.
- If the window scrolls past its first column on a refresh, re-base every row's
  `c1` **and** set `window.start` to the new column-1 date.

**If you cannot supply real start and end dates for at least three items, do not
draw a chart.** Ship the lane list alone and say so in the section's `lead`. A
Gantt drawn from guessed dates is the worst thing this document could do; a single
estimated bar is allowed and says so in its own text.

**The list** is `{ id, title, href, tag, d, cites, disc, watch }`. `d` is one line;
everything else folds. `watch` is `{ kind: "pr"|"tracker", ref }` — the renderer
ignores it, and the every-run auto-check reads it to flip the item to `shipped` when
that PR merges or that tracker item closes. That is how a todo checks itself; set
it on every item that has a PR or a tracker item behind it.

Order by what actually blocks what, not by date.

## 11. Ask — `#ask`

**An open ledger of what is still owed.** The section's idea is the *debt*: a
running tally of unanswered questions, then the questions themselves, with
answered ones settling into a folded tray rather than disappearing. `blocks: {
open: [Q], done: [Q] }`, `Q = { q, who, ctx, answer, cites }`. Counts are computed
at runtime — ship `0`.

### Finding the questions

This is not a list of things the run happened not to understand. It is what the
project owes the reader, and it is generated deliberately:

- a thread that **ended without an answer** — someone asked, nobody replied;
- a decision recorded with **no rationale** — the fork is visible, the reasoning is
  not, and only a person has it;
- a **contradiction** from §8 that the record cannot settle;
- work **blocked on a person** — a review not given, an approval not granted, an
  access request not filled;
- a `TODO`/`FIXME` naming a decision nobody has made;
- something everyone clearly knows that **nobody ever wrote down** — a convention
  the code follows with no discussion behind it. The highest-value questions and
  the hardest to notice, because their absence is what makes them invisible;
- a date or scope in the record that is **already impossible**.

### Writing them

`q` is **written as a question**, in the words the person asking would actually
use, ending in a question mark, one line where possible. `who` names who holds the
answer and what it is holding up — those two facts are what turn a question into
work; omit only if neither is known. `ctx` is one line; a paragraph folds.

Order open questions by what they block, hardest first; the tray newest-answered
first. An answered question is **never deleted** — it moves to `done` with its
`answer` and its cites. `#ask` carries no source note.

---

## Shared vocabulary

- The **`new` flag** (`flag: true`) is the only "new" badge. It means "changed in
  the newest changelog entry" — set it on what this run touched, clear it
  everywhere else.
- **`inferred`** marks a claim you concluded rather than read. It is the
  alternative to *omitting* the item, never to *citing* one. Phrase such claims as
  a reading, never as fact.
- **Callouts**: plain, `key` (must be read), `crit` (something is wrong), `quiet`
  (an aside). At most one `key` per section — two shouting lines are none.
- **Cards are never nested.** The renderer handles this; it matters to you only in
  that a disclosure inside a grouped surface is still one disclosure, not a card in
  a card.
- **No unicode glyph where an icon belongs.** Every marker in the document comes
  from one of the two sprites, and the renderer sees to that — but a `→`, `✓` or
  `·`-as-a-bullet typed inside a `title`, `gist` or `body` string is content the
  renderer will faithfully print. Write words there, not symbols.

## Affordances

**A hover state is a promise that something will happen if you click.** The
renderer and `app.css` enforce this: only genuinely interactive things
lift, tint or take a pointer cursor, and `:focus-visible` stays on everything
focusable. Nothing you write can change it — the note is here so you do not try.
