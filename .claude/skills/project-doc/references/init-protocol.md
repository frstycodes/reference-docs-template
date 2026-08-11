# The init protocol

**Init is the only run that reads the whole project.** Every refresh after it
patches a window of hours. So the depth a reader ever gets is the depth init
reached — a thin init is not a slow start, it is a permanent ceiling, and no
number of surgical refreshes will fill it in.

Work through the steps in order. Where [`update-protocol.md`](update-protocol.md)
is about *not breaking* an existing record, this file is about *building one worth
keeping*.

---

## The bar

The document exists so that someone two weeks into the project reads it instead of
a teammate's memory, and comes out knowing what that teammate knows: what the
thing is for, every fork the team took and why, what broke and what it cost, which
claims in the record disagree with each other, and what they personally should do
on Monday.

That is the standard to write to. Not "a summary of the project" — a **transfer of
a senior colleague's mental model**, with every claim traceable to the message, PR
or doc it came from.

Concretely, on a project with a few months of history across the usual sources, a
good init lands near:

| Section | Floor | What thin looks like |
|---|---|---|
| `timeline` | **40+ events**, every kind present that the project actually had | 12 events, all `build`, no incidents, no pivots |
| `glossary` | **25+ terms** | 8 terms, all of them obvious from the repo name |
| `primer` | 8–14 cards | 4 cards restating the README |
| `state` | every open thread the sources show, grouped | 5 rows, all `shipped` |
| `ask` | **10+ genuine open questions** | 3, and none of them blocking |
| `architecture` | every stage the pipeline actually has | 3 stages, no detail |
| `goal` | current framing **plus every shift since the beginning** | current framing only |
| disclosures | most events and rows carry one | headlines with nothing behind them |
| cites | **every** item in a cited section, and the joined ones carry several | one cite per item, or none |

These are floors, not targets, and they are **scaled by what the project has** — a
three-week project with 40 Slack messages cannot produce 40 events and must not
invent them. `doc-coverage.mjs` (step 8) reports the real numbers against the real
volume of source material. A floor missed because the project is young is fine and
gets said out loud; a floor missed because the run skimmed is a defect.

**Never pad to hit a number.** A fabricated event is worse than a missing one — it
poisons a record whose whole value is that it is traceable. Everything in the
document is either cited or marked `inferred`; padding is neither.

## Three passes, in this order

Init fails when it tries to read and write at the same time — it reads one source,
writes the sections it can, then reads the next and finds it must rewrite what it
just wrote, so it stops reading early. Do the passes separately:

1. **Sweep** — read every source to the beginning, capturing verbatim into
   `init-notes.md`. Write no sections.
2. **Join** — correlate the notes across sources into one ordered list of things
   that happened. Still no sections.
3. **Compose** — write `#doc-data` from the joined list, then render, audit,
   validate, publish.

---

## 1. Sweep — read to the beginning, not to a page limit

The refresh window is a cursor. **Init has no cursor: its window is the project's
entire history**, and the run is not finished with a source until it has reached
that source's first item or the project's start date, whichever is later.

**Delegate this pass.** One subagent per source, on the cheapest model, each
writing its notes to its own file and returning a receipt rather than the text —
this is the single largest cost in a run, and it is mechanical.
[`delegation.md`](delegation.md) has the split, the model per job and what a
sweep subagent is and is not allowed to do. The join in step 2 and everything
after it stay on the main thread.

Paginate. Every one of these tools returns a page and a continuation token, and a
run that takes the first page and moves on has read the last few days of a
months-long project — which is exactly the failure mode that produces a document
about last week.

| Source | Read to the beginning means |
|---|---|
| Slack | every message in every configured channel back to the channel's **first message** — follow the `cursor`/`latest` pagination until it returns empty. **And every thread**: a channel listing gives you parents only, and the decisions are in the replies. Open every parent with a reply count. |
| GitHub | every PR (**open, closed and merged**, not just open) with its **body, its review conversation and its commits**; every commit on each tracked branch back to the first. A PR title is a label; the argument is in the description and the review thread. |
| Drive | every meeting note in the configured folders, read **end to end** — not the first paragraph. Meeting notes are the densest decision source most projects have, because they record what was said out loud and never written down anywhere else. |
| Gmail | every thread the query matches, from the beginning, including quoted replies. |
| Calendar | every past sitting, not just upcoming — a meeting series' history shows cadence changes, cancellations and the week everything stopped. |
| tracker | every item in the project, **including closed ones**, with notes and comments — closed items are the record of what was already decided and done. Whichever tracker the config names; use the team's own word for an item (`itemNoun`), never "bead" by reflex. |
| Figma | the configured files, once, for the surfaces and design system the project is building — and **every Figma URL any other source links**, resolved to a real citation. On a design-gated project the approval of a surface is a milestone; without this it is an unlinked mention. Figma has no history query, so this is a read, not a diff. |
| repo | `contextFiles`, then the full commit log, then the code the pipeline actually runs. `TODO`/`FIXME`/`HACK` comments are open questions someone already wrote down for you. |
| custom | per [`source-contract.md`](source-contract.md), read from the beginning the same way. |

A source that is unreachable in this environment follows the same rule as in a
refresh — skip it, note the gap, carry on (see "Refresh runs unattended" in
[`update-protocol.md`](update-protocol.md)) — but at init, say so **to the user**
as well: a document built without GitHub is missing a third of its record, and
that is worth knowing before it becomes the baseline.

### Capture verbatim, and capture as you go

`.ignored/project-doc/<name>/notes-*.md` is not a crash-recovery file. It lives
under `.ignored/`, not `__external/`, because it is scratch for this run alone —
verbatim quotes from private sources, read by no schema and by nobody after the
compose pass. It is the **reservoir every disclosure in the finished document is
poured from**, and it is the reason the disclosure rule can be satisfied at all.

One file per source — `notes-slack.md`, `notes-github.md` — because the sweep is
delegated and concurrent subagents appending to one file lose each other's
writes. `init-notes.md` is the main thread's own: what the join found, written
while reading the per-source files. Both are read the same way at compose time.

The failure this exists to prevent: a run reads a thread, understands it,
summarises it into one line, discards the thread, and moves on — and three hours
later the disclosure that should hold the argument holds nothing, because the
argument is gone and re-reading everything is too expensive to contemplate.

So: as each item is read, append to that source's notes file

- the **quote** — the message, PR description, review comment or notes paragraph,
  copied, not paraphrased;
- **who** said it and **when** (ISO);
- the **citation key** it will resolve to (`pr-53`, `slack-C08AB12CD-1753…`);
- one line on why it might matter.

Quote generously. Prose in the notes is cheap; prose you have to re-derive is not.
The compose pass then has the full text on hand for every `body`/`disc` field, and
the disclosure rule becomes a matter of *moving* text rather than *inventing* it.

## 2. Join — one event, several sources

**The same thing happening is one event, not four.** A decision is argued in
Slack, recorded in a meeting note, implemented in a PR and tracked as an item on
the board. A
run that reads sources in isolation emits four thin items; a run that joins emits
one event that carries the argument, the verdict, the implementation and the
tracking — with four cites on it.

That join is most of what separates a document that knows things from a document
that lists things. Do it explicitly, before composing: walk the notes in date
order and merge entries that name the same fork, incident, ship or meeting.
Signals that two entries are one — a PR that names a tracker id, a Slack message
linking a PR, a meeting note and a message within a day repeating the same
decision, a tracker item closing the day a PR merged.

When merged, keep **every** citation: the cite list is the evidence, and a reader
following it should land on the argument, not only on the outcome.

## 3. The event bar — what goes on the timeline

[`update-protocol.md`](update-protocol.md) says what is *not* news (a rebase, a
lint commit, a "thanks!"). Init needs the other half, because a run left to invent
its own bar sets it far too high and returns a dozen milestones.

**The bar: anything a returning teammate would be annoyed not to have been told.**
That is a much lower bar than "significant", and it is the right one.

Hunt for each kind deliberately — they do not surface evenly, and the ones runs
miss are always the same ones:

| Kind | What it is | How to find the ones runs miss |
|---|---|---|
| `decision` | a choice was made between options | search for the *argument*, not the conclusion: "should we", "or we could", "I'd rather", "let's go with", "any objection". A decision recorded only as its outcome still has a fork behind it — find it. |
| `pivot` | a choice was **reversed** | the rarest kind and the most valuable, because a reversal is where a document earns its keep. Look for a later statement contradicting an earlier one, work abandoned, a tracker item reopened or cancelled, "actually", "we're no longer", "scrap that". **Explicitly re-read the record for reversals** — they never announce themselves. |
| `incident` | something broke, or blocked people | outages, failing CI that stayed red, a bad deploy, a secret that expired, a dependency that broke. Runs under-report these because they get fixed and the channel moves on; the fix is not the record, the break is. |
| `milestone` | a commitment made, hit or **missed** | a date agreed, a demo given, a gate passed, an approval granted — and every date that slipped. A missed milestone is an event. |
| `build` | something shipped | merged PRs that changed behaviour. Not every commit; the unit is the shipped change, and its PR is its cite. |
| `meeting` | people met and it mattered | any sitting whose notes changed something. A recurring standup with nothing in it is not an event; the one where scope changed is. |

Each event's `title` is the fork or the thing that happened, `gist` is **what is
true now because of it** — never a restatement of the title — and `body` holds the
argument from the notes, under `Why` / `Rejected` / `Consequences` for decisions
and pivots. Depth is folded, never cut.

## 4. The cast

A newcomer's real question is usually "who do I ask about this". The record answers
it and the document should too: while sweeping, keep track of who recurs, what they
own, what they decide, and the vocabulary they use.

That knowledge lands in the sections rather than in a section of its own — names in
event bodies and decision rationales, ownership in `state` rows and `ask`'s `who`
field, their shorthand in the glossary. A `decision` event whose body does not say
**who decided** is missing its most useful fact.

## 5. Goal archaeology

`#goal` is not "the goal today". It is the goal **and every framing it has had**,
reconstructed backwards from the record — the first statement of intent in the
earliest messages or the kickoff notes, then each dated shift, with who moved it
and on what evidence.

Init is the only run that can do this: every later run only sees shifts as they
happen. Read the earliest sources for the original framing even when it is
embarrassing or obsolete — especially then, because the gap between the first
framing and the current one is the single most orienting thing in the document.

Each shift is a `DecisionRow` (`{ date, kind, title, verdict, why, cites }`).
Prior framings are never deleted; they become the record.

## 6. Contradictions — hunt them, do not resolve them

Any project of a few months' standing has a record that disagrees with itself: a
tracker item marked done whose PR was never merged, a decision in Slack the meeting notes
reverse, a README describing a pipeline the code no longer runs, two dates for the
same launch, a metric defined twice with different meanings.

**These are among the most valuable things in the document** and they are invisible
to every later refresh — a refresh sees one hour and cannot know it disagrees with
March. Init is where they get found.

While joining, note every place two sources disagree. Then surface them in `#state`
as their own group of rows: what the two sources each claim, both cites, and — as
an `inferred` reading, never as fact — which one the run believes and why.

**Do not pick a winner and quietly drop the loser.** The reader needs to know the
record is contested; that is what stops them acting on the wrong half of it. An
unresolved contradiction usually also becomes a question in `#ask`.

## 7. Questions — how to find the ones worth asking

`#ask` is not a list of things the run happened not to understand. It is what the
project owes the reader, and it is generated deliberately from the sweep:

- a thread that **ended without an answer** — someone asked, nobody replied;
- a decision recorded with **no rationale** — the fork is visible, the reasoning
  is not, and only a person has it;
- a **contradiction** from step 6 that the record cannot settle;
- work that is **blocked on a person** — a review not given, an approval not
  granted, an access request not filled;
- a `TODO`/`FIXME` in the code that names a decision nobody has made;
- something everyone clearly knows that **nobody ever wrote down** — a convention
  the code follows with no discussion behind it. These are the highest-value
  questions and the hardest to notice, because their absence is what makes them
  invisible;
- a date or scope in the record that is **already impossible**.

Each question names **who holds the answer** and **what it is blocking** — those
two facts are what turn a question into work. Order by what they block, hardest
first.

## 8. Compose, audit, publish

Write `#doc-data` per [`data-model.md`](data-model.md) and the section intents in
[`sections.md`](sections.md), then:

**The first What's New entry is project news, not document news.** The changelog
contract in [`update-protocol.md`](update-protocol.md) §5 applies from the first
entry: bullets say what happened *in the project*, each with a `goto` into the
section that holds it. "Living document created" is document meta and is exactly
what the contract bans. The first entry is the **short version of the project's
history so far** — the handful of bullets that most explain where things stand,
each pointing into the record — and its `sources` line names the sources actually
swept.

Seed the cursors in `doc-state.json` at the **newest item seen per source**, so the
first refresh picks up from the end of the sweep rather than re-reading history.
The file, not the built page's `#doc-state` block — that block is baked from the
file on every build, so a cursor written there is gone by the next run.

**Mint a mark for every source the skill has no symbol for.** This is init's job
and only init's — a refresh reads what init wrote and never fetches a logo. For
each source registered with `citationKind: "custom"`
([`source-contract.md`](source-contract.md), Tier 1½):

1. **Fetch its mark**, in order: `https://<host>/favicon.svg`, then whatever the
   site's own brand or press page serves as SVG. Take the `viewBox` and the
   drawing elements; drop everything else.
2. **A monogram if that fails.** One letter on a tile in a colour sampled from
   the site. **Never draw the logo yourself** — a model-drawn mark of a real
   product is confidently wrong in a way a monogram is not.
3. **Write `<project>/doc-icons.json`**, keyed `i-<slug>`, beside `doc-data.json`.
   It is committed with the rest of the project's data and reused by every later
   run; the document and everything it needs to render travel together.
4. **Name it on the citations** — `icon: "i-notion"` — and give each cited item a
   `custom` preview payload with up to six `rows`.

You do not sanitise it. `assemble.mjs` rebuilds every symbol against an
allowlist and drops what it cannot make safe, so a mark that would have been
dangerous costs a monogram rather than a document. Do not hand-clean the SVG to
"help" — write what you fetched and let the gate be the gate.

Then run both gates:

```
node <skill-dir>/references/doc-coverage.mjs <doc-data.json|assembled.html> --init
node <skill-dir>/references/assemble.mjs --data doc-data.json --icons doc-icons.json … --out <file>
```

`doc-coverage.mjs` reports density against the floors above — events by kind and
by month, cite coverage and join depth, disclosure depth, glossary and question
counts, and which configured sources actually contributed a citation. Under
`--init` it exits non-zero when a floor is missed. `assemble.mjs` is the structural
gate and is unchanged from a refresh.

**A coverage failure is a real failure.** The correct response is to go back to the
sweep — usually to the source that contributed nothing — not to lower the floor or
to pad the section. The two legitimate outcomes are: fix it, or tell the user
plainly which floor is unmet and why the project genuinely has no more material.
A defect baked in at init survives every surgical refresh after it.

Publish per [`publishing.md`](publishing.md) and store the returned URL in
`doc-state.json`'s `artifactUrl` — the file in `__external/`, which is the state.
Writing it into the built page's `#doc-state` block loses it: the next build
regenerates that block from the file, and the run publishes a **second** Artifact
instead of republishing this one in place.

---

## Done when

Every configured source was read to its beginning or is named as unreachable; the
timeline covers every month between the project's start and today, not just the
recent ones; every kind the project actually had is present on the rail; decisions
carry their argument and their author; the reversals were hunted for specifically;
the contradictions are surfaced rather than resolved away; the questions name who
owns them; the first changelog entry is project news; `doc-coverage.mjs --init`
and `assemble.mjs` both exit clean; and the document is published private with its
URL stored.
