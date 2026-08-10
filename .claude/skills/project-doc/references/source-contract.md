# The source contract

A source is anything the document reads to learn what happened: Slack, GitHub,
Gmail, Calendar, Drive, a task tracker, Figma and the repo are the built-ins, but
the set is **open**. Any tool the user has connected can become a source — a
Notion database, an RSS feed, a status page — as long as it can answer the one
question a refresh asks: *what changed since last time, and where can I link it?*

Two of the built-ins are deliberately not fixed to one product:

- **The tracker** is whichever one the team uses — Pact, Linear, Jira, GitHub
  issues, Asana, Shortcut. It is one source with one cursor and one citation kind
  (`tracker`); only its `kind`, its `itemNoun` and the tool it reads through
  change. See "The tracker" in [`config.md`](config.md). Nothing in this skill
  assumes a particular tracker, and setup asks rather than defaulting.
- **Figma** is the worked example of a source that **cannot meet the cursor
  requirement at all** — see "A source with no cursor" below.

There are **two tiers**, and a source declares which one it can reach by what it
supplies. Nothing else in the skill needs to change to add a source — the
rendering, the cursors and the citation chips are already generic. This file is
the checklist a source meets to register.

---

## Tier 1 — first-class

A first-class source gets a linked citation chip, a hover preview card, and its
own cursor. To qualify it must supply all of:

| Field | Meaning |
|---|---|
| `id` | the config key, lowercase (`linear`, `notion`) |
| `name` | display name (`Linear`) |
| `cursor` | the value that marks "everything up to here is already in the document", and the query that fetches **strictly after** it — an issue-updated timestamp, a monotonic id, a page-revision number. Stored per-source in the document's `doc-state.json`, exactly like the built-ins. |
| `citationKind` | one of the kinds in the citation table in [`sections.md`](sections.md), whose sprite icon already exists — or `link` (see Tier 2). A source that reuses `pr`/`tracker`/`slack`/`cal`/`drive` semantics reuses that kind and its card. |
| `allowlistHosts` | every host its permalinks live on, added to the document's allowlist at build so the chips resolve to real links. |

Optional, and worth it:

| Field | Meaning |
|---|---|
| `preview` | a payload shaped like one of the kinds in "The preview payload" in [`sections.md`](sections.md), baked into `#doc-previews` so the hover card renders with no fetch. If a source's shape matches an existing card (an issue reads like a `tracker` item: id, title, status, assignee), reuse that kind's preview fields verbatim. |

A first-class source that is **new** — not a reskin of an existing kind — needs a
sprite symbol and, if it wants a bespoke card, a `.cprev` layout. **That is a
locked-file change** (the app's sprites, components and `app.css`) and
therefore a skill-version bump, not a per-project addition. Until then, register
it as Tier 2.

## Tier 2 — generic link

A source that cannot meet Tier 1 — no stable permalink, no known card shape, an
unstructured feed — still belongs in the document. It registers with just:

| Field | Meaning |
|---|---|
| `id`, `name` | as above |
| `cursor` | as above — even a generic feed has a "newest seen" marker; without one it re-reports everything every run |
| `citationKind: "link"` | renders the `#i-link` chip. Linked if the URL's host is allowlisted, an unlinked `<span>` otherwise. |

A `link`-kind citation with a `preview` gets a **generic card**: the source name
on the band, whatever `title` it has, an optional `author` and `age`. No
fabricated fields, no fetch. A `link` citation with no preview is just the chip.
This is the floor, and it needs **no locked-file change** — the code already
renders it.

## Tier 1½ — a minted source

Between the two tiers sits a source that has real items and real permalinks but
no card shape the skill knows: Notion, Sentry, a status page, an internal tool.
It does not have to settle for the generic chip. **Init mints it a mark and a
card**, once, and every later run reuses them.

Use `citationKind: "custom"`. Two things then travel with the source:

**A mark.** `<project>/doc-icons.json`, one entry per minted source:

```json
{ "i-notion": { "viewBox": "0 0 24 24", "body": "<path d=\"…\"/>" } }
```

Init fetches it — `/favicon.svg`, then the site's own brand SVG — and falls back
to a monogram tile when nothing usable comes back. **Never draw one.** A
model-drawn logo of a real product is confidently wrong in a way a monogram
never is, and the monogram is the honest answer to "we could not get their
mark". Citations name it with `icon: "i-notion"`.

**A card.** The `custom` preview payload is the generic card plus rows:

```json
{
  "kind": "custom",
  "raw": "Alpha runbook",
  "preview": {
    "icon": "i-notion", "source": "Notion",
    "title": "Meridian alpha — launch runbook",
    "updatedAt": "2026-07-26T09:12:00Z",
    "rows": [
      { "label": "Owner", "value": "Iván" },
      { "label": "Status", "value": "In review" }
    ]
  }
}
```

Up to six rows, in the order the source's own UI shows them, labels in its own
vocabulary. Rows are **data, not markup** — which is why a new source needs no
new component, and could not have one: the app ships as a vendored bundle and a
run has no toolchain to rebuild it with.

**The mark is sanitised at publish, not at fetch.** `mint-icons.mjs` rebuilds
every symbol against an element and attribute allowlist before it reaches the
page; anything it cannot make safe is dropped and the chip falls back. This is
not ceremony — Pact's own favicon ships a `<style>` block whose `path { … }`
rule, inlined, repaints every path in the document. Fetching a logo is fetching
someone else's markup, and the assembler is where that stops being true.

## A source with no cursor — read-on-reference

Both tiers above assume a source can answer *what changed since last time*. Some
cannot: they expose content but no history. **Figma is the built-in example** —
its connector returns structure and screenshots, never a modified time or a
version list, so there is no value that could serve as a cursor.

A source like this is still worth having, and registers as **read-on-reference**:

| Field | Meaning |
|---|---|
| `id`, `name` | as above |
| **no `cursor`** | and none is invented. Its absence from `doc-state.json`'s `cursors` is correct, not a bug, and `assemble.mjs` does not expect one. |
| `citationKind` | its own kind if it has a sprite symbol (`figma`), otherwise `link`. |
| `allowlistHosts` | so the chips resolve. |

It is read at two moments and never polled:

1. **When another source references it.** A Figma URL dropped in Slack, a PR body
   or a tracker item is resolved into a real citation with the file and frame
   names. This is where nearly all the value is: it turns "Nick approved the
   review screen [link]" into a cited design gate.
2. **Once at init**, for standing context — the surfaces and the design system the
   project is building, which feed Architecture, Primer and Glossary.

**State the limit out loud at setup.** A change made only inside a
read-on-reference source, that nobody mentions anywhere else, will never appear in
the document. That is a real gap in coverage and the user should hear it in plain
words rather than discover it. `doc-coverage.mjs` therefore does not count such a
source as silent when it contributed nothing — there was nothing to poll.

---

## Registering a source at setup

`project-doc-setup` writes each chosen source into `config.json`'s `sources`
block. A built-in uses its documented block ([`config.md`](config.md)); a custom
source uses:

```json
"sources": {
  "custom": [
    {
      "id": "linear",
      "name": "Linear",
      "tool": "mcp__…__list_issues",
      "citationKind": "tracker",
      "cursorField": "updatedAt",
      "allowlistHosts": ["linear.app"],
      "query": { "team": "MER", "project": "Meridian" }
    }
  ]
}
```

- `tool` names the MCP tool the refresh calls to read it. A source whose tool is
  not present in the run environment is **skipped, not failed** — the same rule
  as any unreachable built-in (see the unattended failure model in
  [`update-protocol.md`](update-protocol.md)).
- `citationKind` reuses an existing kind, or is `custom` (Tier 1½ — mint it a
  mark and a card) or `link` (the floor). **Never invent a kind string** — an
  unknown kind falls back to the generic `link` card at runtime, so inventing
  one just loses the chip's specificity silently.
- `icon` names the minted symbol, `i-<slug>`, when `citationKind` is `custom`.
  Written by init alongside the `doc-icons.json` entry.
- `cursorField` names the field on the tool's items that is the cursor. Its
  newest value seen this run is written to `doc-state.json` under `cursors.<id>`,
  and committed — the `#doc-state` block in the built page is a copy the next
  build regenerates, so writing there advances nothing.
- `query` is whatever the tool needs to scope to this project.

## The one invariant

**A source is only ever as trustworthy as its citations.** A first-class source
links; a generic source links when it can and shows plain text when it can't; a
source that cannot cite an item at all does not put that item in a cited section.
Adding a source never relaxes the sourcing standard in [`SKILL.md`](../SKILL.md)
— it only widens where the citations come from.
