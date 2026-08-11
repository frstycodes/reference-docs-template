---
name: daily-brief
description: Build the Daily Brief — a hand-designed HTML brief of the day's calendar, inbox, to-dos and updates. Use when the user asks for their daily brief or morning brief, or when another skill needs a brief scoped to one project.
---

You write **data**, never markup. The brief is `#brief-data` — structured JSON —
and a React app renders it. Your freedom is **editorial**: which sections run, in
what order and under what names; how many items each holds and what they say; the
painting, the blurb, the pun. The design is not yours to change.

`references/app.js`, `references/app.css` and `references/prerender.mjs` are
**vendored build artifacts**. Do not edit them, and do not hand-patch the HTML
they produce. They are built from **`app/` at the repo root** — the components
live there, shared with `project-doc`, and this skill vendors what that app
builds. That inverts the old arrangement, where this skill owned the shell and
`project-doc` inlined its CSS: the app is now upstream of both skills. Rebuilding
them is `npm run vendor` in `app/`, a deliberate re-shell on a version bump, never
something a daily run does.

What this skill still owns: `references/components.md` (what each part is for)
and `references/voice.md` (how it reads). Those are the spec. A design change
means changing the components in `app/src/components/brief/` and the catalog here
together.

Dark-only is deliberate. There is no light theme and no theme toggle — do not add
one.

## Inputs

| Input | Default | Meaning |
|---|---|---|
| `scope` | `all` | `all` or `project` — see below |
| `out` | `.ignored/build/brief/brief.html` | Output path (`build.mjs --out`) |
| `filter` | — | Required under `scope: project`; optional under `all`, applied whenever present |

`filter` is a config the caller supplies — the `brief` block of a project's
`config.json`, or of the standalone brief's; its keys are defined in
[`project-doc/references/config.md`](../project-doc/references/config.md). An item
matching **none** of them is excluded.

The two inputs decide different things and never overlap. **`scope` decides page
or fragment**; **`filter` decides what is in it.** So a standalone brief the user
asked to narrow — "only these channels" — is `scope: all` *with* a filter, and
that filter is applied, not discarded.

## Setup and scheduling

First-time configuration of the **standalone** brief and putting it on a morning
schedule belong to the sibling `daily-brief-setup` skill — it interviews the user,
writes `daily-brief/__external/config.json`, builds the first brief, and creates a
Claude Code cloud routine. This skill stays a pure builder.

A scheduled/unattended run reads that config, passes its `brief` block into the
build order below as `scope` and `filter` — a full rebuild, never a patch — then
**publishes to the config's `artifactUrl`** (a Claude Artifact, redeployed in
place) and sends the link to the config's `notify` channel. **Unattended runs
degrade softly:** a source that is unreachable produces a thinner brief with the
gap noted, never a failed run; a publish that fails keeps the last good Artifact
and notifies. The brief is a snapshot — tomorrow's run overwrites today's — so
there is nothing to back up, fetch back, or roll back.

## Scope

Both modes produce the same JSON, in the same schema, rendered by the same
components. `meta.scope` is the only field that differs, and all it changes is
what surrounds the brief. What differs is what you do with the JSON:

- **`scope: all`** — the standalone brief: every calendar event, inbox item,
  to-do and update, spanning every project rather than one. A `filter`, when the
  config carries one, narrows what lands inside that span; it never makes the
  brief a fragment. Set `meta.scope: "all"` and build the page:

  ```
  node app/scripts/build.mjs brief [--standalone]
  ```

  Run from the repo root. The standalone brief registers no preview cards, so
  this needs no toolchain at all — it assembles from the bundles vendored under
  `references/`. Output is the **Artifact form** — a `<title>`, the styles, the
  prerendered body and the inline JSON, with no document skeleton, because the
  Artifact runtime supplies one. Pass `--standalone` for a file you can open in
  a browser.

  `artifactUrl` is read from `daily-brief/__external/config.json` and written
  back there on a first publish.

  A brief that does not validate is **never written**. That is the rollback:
  the absence of a new file leaves yesterday's Artifact live, which is a day
  stale but is at least a brief.

- **`scope: project`** — a fragment of someone else's document, filtered through
  `filter`, which is **required** here. Set
  `meta.scope: "project"` and **return the JSON**; do not build anything.
  `project-doc` renders it inside its Today tab, and `brief-assemble.mjs` refuses
  a `project` payload on purpose. **Return the preview payloads alongside it** so
  the caller can merge them into its own `#doc-previews` — there is exactly one
  such block per document, so the brief cannot emit its own.

The schema is
[`app/src/schema/brief-data.ts`](../../../app/src/schema/brief-data.ts)
and it is authoritative. Two things it demands that the old markup did not:

- Prose carrying emphasis, links or avatar chips mid-sentence is a list of typed
  **runs** — `{t:'b'}`, `{t:'link'}`, `{t:'people'}` — never a string of HTML.
  Same rule, expressed in the data instead of trusted in the output.
- Every section list is non-empty. "A section with no items does not exist" is
  enforced rather than remembered, so a zero-state cannot be published.

## Citations

Every item that came from somewhere carries a **cite chip** — the same one
`project-doc` uses in its tabs, so the Today tab and the Timeline tab cite things
identically. The chip renders from the citation's **kind**, so an item you can
name but not link still gets its icon, unlinked, rather than a fabricated `href`.
Kinds, the resolution rules and the per-kind preview fields are the "Citations"
section of
[`project-doc/references/sections.md`](../project-doc/references/sections.md) —
one spec, both skills.

A chip whose key has a **preview payload** opens a hover card. Nothing is fetched
when a card opens, so the brief still works offline and under a strict CSP. Emit
a payload for every chip that has one, and no payload no chip references.

`.sico` — the brief's older source-icon anchor — is **retired**. It did the same
job with a hand-picked icon, no kind, no unlinked fallback and no card.

## Build order

0. **Read the memory** — `daily-brief/__external/memory/index.md`, before you
   gather anything. Its rules outrank the defaults in this skill and in
   `references/components.md`; a rule like "ignore Dependabot" has to be in hand
   before the fetch, not after, or you have already paid for the thing you were
   told to skip. See [`references/memory.md`](references/memory.md).
1. **Gather** — Slack, Gmail, Calendar, GitHub, Drive. Get real permalinks and
   real avatar URLs; you need both to build items. Apply `filter` here, once,
   before anything is drafted — **whenever there is one**, under either scope. It
   is always there under `scope: project` and only sometimes under `all`; a
   filter dropped here is a user's narrowing silently ignored.

   One day across five sources is a handful of calls, so gather inline. Delegate
   only when a source comes back huge — a busy channel, a hundred-message inbox
   — and then to a subagent on the cheapest model that returns items and
   permalinks, never a judgement about what belongs in the brief. The split is
   [`project-doc/references/delegation.md`](../project-doc/references/delegation.md);
   the editorial work in steps 4–6 is never delegated.
2. **Pick the painting** per `references/voice.md`, download it, base64-encode it.
3. **Fetch the faces.** Every avatar URL gathered in step 1 is downloaded and
   base64-encoded, rewriting Slack's `…_original.png` to `…_72.png` first — 250 kB
   against 6 kB, and the bytes now live in the file. A URL you cannot fetch is
   dropped, not carried: the chip falls back to its monogram either way, and a
   surviving remote URL only adds a request that fails. Someone with no picture
   at all is a monogram by design, not a gap to apologise for.
4. **Choose sections** and draft content in the voice rules of
   `references/voice.md`, against the parts in `references/components.md`.
5. **Write what you learned.** Compare the last few briefs —
   `git log -p daily-brief/__external/brief-data.json` — against what today's
   sources show actually moved. A to-do regenerated morning after morning while
   other work ships is the signal; checkbox state is not recoverable, so this is
   the only one there is. Record a Rule or an Observation per
   [`references/memory.md`](references/memory.md), retire any of your own rules
   the evidence now contradicts, and carry **every** change into the `learned`
   entries you write in the next step. This runs before the JSON, not after: the
   page is rendered from that JSON once, so a change disclosed later reaches git
   and nothing the reader opens. A change you do not disclose is a change the
   reader cannot correct.
6. **Write the JSON**, including a `learned` entry for every memory change made
   in step 5. Under `scope: all` it goes to
   **`daily-brief/__external/brief-data.json`** — that exact path, because it is
   the file the build reads. Write today's brief anywhere else and the build
   quietly rebuilds and republishes **yesterday's committed one**; the brief's
   failure posture is soft, so nothing will say so. Under `scope: project` you
   write no file at all — the JSON is returned to the caller, which owns its own
   `__external/`. Fill `hero.art.src` **last** — write every other field first,
   then substitute the base64 in one edit, or every edit in between drags a
   quarter of a megabyte through it.
7. **Build or return**, per the scope above.

## Hard don'ts

Full list in `references/voice.md`; these are non-negotiable and apply to any
code you write around the brief:

- Never write markup. Prose with emphasis or links is typed runs; that is the
  whole reason the contract is data.
- Every URL is host-allowlisted at render, against the `allowlist` in
  `daily-brief/__external/config.json`. Write real permalinks anyway — a URL that
  does not clear the allowlist comes out as plain text. A config with no
  `allowlist` blocks every URL and still publishes; `build.mjs` warns, and that
  warning is the only signal.
- No `localStorage` — in-memory state only.
- Never reuse Dia's wordmark, dot mark, sign-off, or `dia-report://` scheme.

## Token layer

The `:root` custom properties are the canonical token layer for a family of
related documents, and they now live in
`app/src/styles/shell.css`. Do not rename, remove, or reorder:
`--page --card --hairline --ink --ink-2 --ink-3 --ink-4 --accent --accent-ink
--ease --spring --serif --sans --mono`.
