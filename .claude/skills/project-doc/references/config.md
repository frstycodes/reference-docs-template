# Per-project config

The config is authored once at setup and lives at
`project-docs/<name>/__external/config.json`, tracked in the docs repo like every
other file the document is made of. For the directory as a whole — every file,
which schema validates it, and the `cards.tsx` contract — see
[`external-dir.md`](external-dir.md). This file is `config.json` alone.

`project-doc-setup` writes it while interviewing; every `init` and `refresh`
reads scope, `you`, `brief`, `timezone` and `locale` straight from that file, not
from a copy. It is also **baked inline into the published document** as
`<script type="application/json" id="doc-config">`, so the page renders with no
network and no sidecar — but that inline copy is a rendering detail, not the
state.

The baked block carries the full config below **except the `allowlist`**, which
has its own `#doc-allowlist` block. `timezone`/`locale` are the same values the
runtime already reads from `#doc-config`.

**Privacy — say this at setup.** The scope (`sources`) names what the project
watches: Slack channel ids, a Gmail query, Drive folders. That is **not
credentials** — auth stays in the user's connected MCP tools and is never stored —
but it travels both in `config.json` and inline in the published document. Two
things guard it: the docs repo is **private** (`gh repo view --json visibility`,
per [`SKILL.md`](../SKILL.md)), and Artifacts are **private by default**.
**Sharing the doc shares its scope** — say that out loud at setup.

```json
{
  "project": "Meridian",
  "tagline": "The living document — everything that happened, and where you stand.",
  "timezone": "Europe/Lisbon",
  "locale": "en-GB",
  "you": {
    "name": "Ana Duarte",
    "role": "Frontend, review queue + audit trail",
    "trackerAssignee": "ana",
    "lane": { "windowUnit": "week", "windowColumns": 12 }
  },
  "sources": {
    "slack": {
      "channels": [
        { "id": "C08AB12CD", "name": "meridian" },
        { "id": "C08XY99ZZ", "name": "meridian-pact" }
      ],
      "includeThreads": true
    },
    "github": {
      "repos": ["northwind/meridian"],
      "branches": ["main"],
      "prLabels": [],
      "ignoreAuthors": ["dependabot[bot]"]
    },
    "gmail": { "query": "from:northwind.com OR subject:meridian", "auto": true, "enabled": true },
    "calendar": { "match": "meridian|standup", "calendarIds": ["primary"] },
    "drive": { "folderIds": ["0ABcDeFgH"], "recursive": true },
    "tracker": {
      "kind": "pact",
      "name": "Pact",
      "project": "meridian",
      "itemNoun": "bead",
      "citationKind": "tracker"
    },
    "figma": {
      "files": [
        { "key": "AbC123", "name": "Meridian — product surfaces" }
      ],
      "resolveCited": true
    },
    "repo": {
      "contextFiles": ["CLAUDE.md", "AGENTS.md", "CONTEXT-MAP.md"],
      "readCommitLog": true
    },
    "custom": [
      {
        "id": "linear",
        "name": "Linear",
        "tool": "mcp__linear__list_issues",
        "citationKind": "bead",
        "cursorField": "updatedAt",
        "allowlistHosts": ["linear.app"],
        "query": { "team": "MER" }
      }
    ]
  },
  "brief": {
    "scope": "project",
    "slackChannels": ["C08AB12CD", "C08XY99ZZ"],
    "githubRepo": "northwind/meridian",
    "gmailQuery": "from:northwind.com",
    "calendarMatch": "meridian|standup",
    "trackerProject": "meridian"
  },
  "allowlist": [
    "github.com",
    "slack.com",
    "figma.com",
    "docs.google.com",
    "drive.google.com",
    "mail.google.com",
    "calendar.google.com",
    "northwind.com"
  ]
}
```

## Fields

| Field | Meaning |
|---|---|
| `project` | The name in `.dial-name`, inside the dial's popover. There is no masthead. Also the document's identity across refreshes — changing it does not create a second document. |
| `tagline` | Used as the `<title>` of the page. It no longer appears in the body. |
| `timezone` | IANA zone. Every timestamp the document displays is rendered in it; every cursor is stored in UTC or with an explicit offset. Baked into the page with `locale` as `<script type="application/json" id="doc-config">{"timezone":"…","locale":"…"}</script>` — the components read it to format runtime dates; a document without it falls back to the reader's zone, which disagrees with every other date on the page. |
| `locale` | BCP-47 tag for runtime date formatting (default `en-GB`). Travels in `doc-config` beside `timezone`. |
| `you` | Who "Your lane" and "Ask" are written for. `trackerAssignee` filters the tracker to their work (legacy `beadAssignee` is still read). `lane.windowUnit` (`week` or `month`) and `lane.windowColumns` set the Gantt's `--cols` and the meaning of one column; twelve to sixteen columns is the readable range. |
| `sources.*` | Where to look. A missing or `enabled: false` block means that source is skipped and its cursor is left alone — a source you cannot reach must never silently look like a source with no activity. |
| `sources.custom[]` | Sources beyond the seven built-ins — a connected Linear, Notion, Jira, or any feed. Each registers against the **source contract** in [`source-contract.md`](source-contract.md), which is the authority on the fields and the two tiers (first-class card vs generic `link` chip). `project-doc-setup` writes these from the source menu; a user may hand-add one against the contract. Cursors for custom sources live under `doc-state.json`'s `cursors.<id>`, exactly like the built-ins. |
| `sources.github.repos` | One entry per tracked repo (a legacy single-string `repo` is read as a one-element list). Cursors are keyed per repo, and per branch within it — see `doc-state.json` below. |
| `sources.github.prLabels` | Only PRs carrying at least one of these labels are read; empty list = every PR. |
| `sources.tracker` | **The task/issue tracker, whichever one the team uses.** See "The tracker" below. Setup asks; nothing here assumes Pact. A config carrying the legacy `sources.pact` block is read as `{ kind: "pact", … }`. |
| `sources.figma` | Design files, when the Figma connector is available. See "Figma" below. |
| `sources.slack.includeThreads` | When true, a channel's refresh window must also cover **thread replies to older messages**: a reply to a two-week-old parent never appears in the channel history after the cursor. Query threads whose latest reply is newer than the cursor (`conversations.replies` on parents with fresh activity, or a search scoped to the channel) — the channel cursor alone will silently lose decisions made in threads. |
| `brief` | Passed straight to the `daily-brief` skill as its project filter config. Duplicates the source ids on purpose, so the brief's scope can be narrower than the document's. |
| `allowlist` | Host suffixes permitted in `href`. Matching is exact host or `.suffix`. |

## The tracker

Every team has a task tracker and **no two teams have the same one**, so the
document does not name one. `sources.tracker` describes whichever the project
actually uses; `project-doc-setup` asks (see "Where setup fits" in
[`SKILL.md`](../SKILL.md)) and never assumes.

| Field | Meaning |
|---|---|
| `kind` | `pact`, `linear`, `jira`, `github-issues`, `asana`, `shortcut`, `notion`, `trello` — or any other id, in which case treat it per the [source contract](source-contract.md). |
| `name` | What the team calls it, shown nowhere but used in the changelog's `sources` line. |
| `project` | The project/board/team key to scope to. |
| `itemNoun` | What one item is called — `bead`, `issue`, `ticket`, `story`, `card`. Use the team's own word in prose; a doc that says "bead" to a Jira shop reads as though it were written for somebody else. |
| `tool` | The MCP tool to read it with, when it is not one of the kinds the run already knows. Required for anything outside the list above. |
| `citationKind` | `tracker` — the generic tracker chip and card. Only set this to something else to reuse a different card shape. |

`github-issues` is the one kind that shares a source with another block: it reads
through the GitHub connector already configured in `sources.github`, and still
gets its own cursor.

**The cursor** is the newest item-updated timestamp, stored under
`doc-state.json`'s `cursors.tracker` regardless of kind.

Prose rule, and it is the whole point of `itemNoun`: **the document speaks the
team's vocabulary, not the tool's.** The citation `kind` on the wire is
`tracker` for everyone, but its `raw` label is the item's real id in the team's
own scheme (`BEAD-0082`, `MER-241`, `PROJ-1183`, `#412`).

**`kind` also picks the chip's mark.** `pact`, `linear`, `jira` and
`github-issues` have real logos; every other kind gets the generic bead glyph,
which is a fallback and not a failure. Nothing is inferred from the id, with two
exceptions that name themselves: `PACT-0036`/`BEAD-0036` is Pact, and the
lowercase hash form `bd-a1b2` is the unrelated open-source
[beads](https://github.com/steveyegge/beads) tracker, which keeps the generic
glyph — that glyph *is* its mark. `ENG-431` and `PROJ-12` are the same string to
Linear and Jira alike, so an unset `kind` stays generic rather than guessing.
The rule and its tests are `app/src/lib/tracker.ts`.

## Figma

Design work decides what the front end builds, and on a design-gated project the
approval of a surface *is* a milestone — so when the connector is there, the
document should be able to cite it.

**Figma is not a cursored source, and this file will not pretend otherwise.** The
connector exposes no "what changed since" query and no file-modified timestamp:
`get_metadata` returns structure, not history. So Figma is read two ways, neither
of which is a poll:

- **Resolve-on-demand** (`resolveCited: true`, the default and the important
  one). When any *other* source cites a Figma URL — a link dropped in Slack, a PR
  description, a bead, a meeting note — resolve it: pull the file and frame names
  and turn that mention into a real `figma` citation instead of a bare link. This
  costs nothing when nobody links a design, and it is where nearly all the value
  is.
- **Read once at init** (`files[]`). The named files are read during the sweep for
  the surfaces and design system the project is building — which feeds
  Architecture, Primer and Glossary. They are **not** re-read on every refresh;
  there is nothing to diff against.

`files[].key` is the file key from the URL
(`figma.com/design/{key}/{name}`); `name` is for the changelog's source line.

Because there is no cursor, a Figma-only change (someone edits a frame and tells
nobody) **will not appear in the document**. Say that at setup rather than
implying a completeness the connector cannot deliver. `figma.com` must be on the
allowlist for the chips to link.

## The allowlist

It is embedded in the built document as
`<script type="application/json" id="doc-allowlist">` and enforced twice:

- **at build time**, by you — parse every URL before it becomes an `href`; a URL whose host
  fails, or whose scheme is not `http`, `https` or `mailto`, is written as plain text;
- **at runtime**, by the components — any surviving anchor that fails is replaced with a
  `.blocked-link` span.

Same-document fragment links (`#timeline`) and **relative links** (the compaction
archive, a sibling file) are always allowed and are not on the list — they name
local facts, not network destinations.

Add a host only when the user asks for it. A link you cannot allowlist is still worth keeping
as visible plain text — the reader can copy it and decide for themselves.

Preview cards render an author's avatar only when its host is allowlisted — add
`avatars.githubusercontent.com` and the workspace's Slack avatar host if the user
wants real faces. Without them the cards show a monogram, which is also the
fallback when an image fails to load. Nothing else in a card is fetched.

## `doc-state.json` — cursors and publish state

The inline blocks are what makes the published file self-contained — it renders
with no network and no sidecar. They are a rendering detail, not the state: the
state is the JSON in `__external/`, which a cloud run gets by cloning. Cursors
live in `doc-state.json`, beside `doc-data.json` and `config.json`; a refresh
reads and patches that file directly, then bakes a copy inline, in a
`<script type="application/json" id="doc-state">` block, so the published page
also carries its own record of when it was last updated:

```json
{
  "format": 4,
  "lastRun": "2026-07-24T09:26:00+05:45",
  "lastDaily": "2026-07-24T08:07:00+05:45",
  "artifactUrl": "https://claude.site/artifacts/…",
  "archiveArtifactUrl": null,
  "cursors": {
    "slack": { "C08AB12CD": "1753340000.001900", "C08XY99ZZ": "1753101234.000400" },
    "github": { "northwind/meridian": { "lastPr": 51, "branches": { "main": "ea03d8f9c1…" } } },
    "gmail": { "lastInternalDate": "1753339200000" },
    "calendar": { "lastEndUtc": "2026-07-24T03:41:00Z" },
    "drive": { "0ABcDeFgH": "2026-07-23T18:02:11Z" },
    "tracker": { "meridian": "2026-07-23T21:40:00Z" },
    "linear": "2026-07-23T20:00:00Z"
  }
}
```

- `format` names the document contract this skill writes (**4**). A higher number
  means a newer skill built it — stop rather than patch data you do not
  understand.
- `artifactUrl` is where this document is published; a run republishes there in
  place. `archiveArtifactUrl` is the compaction archive's own Artifact (see the
  publishing protocol), or `null`.
- `lastDaily` is when the expensive daily tier last ran (see "Two cadence tiers"
  in [`update-protocol.md`](update-protocol.md)); a run does the daily work only
  once the document-timezone day has rolled over past it, so a second run the same
  day skips it.
- Cursors are keyed per source, per repo/branch where the source needs it, and
  under the custom source's `id` for custom sources. The tracker's cursor is
  `cursors.tracker` whatever its `kind` is — a team that migrates from one tracker
  to another keeps one document and one cursor key. **Figma has no cursor** and
  never gets one (see "Figma" above); its absence is correct, not a missing entry.

Cursors advance by **committing the patched `doc-state.json`** — there is no
Artifact fetch in the loop. A document from before this model may carry a
sibling `state.json`; lift its contents into `doc-state.json`, delete the old
file, and carry on.

## Adding a source later

Add its block to `sources`, leave its cursor out of `doc-state.json`, and run `refresh`. A source
with no cursor is read from the project's beginning on its first run, then cursored normally.
