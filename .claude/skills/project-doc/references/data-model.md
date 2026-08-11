# The data model — `#doc-data` (format 4)

> **`app/src/schema/` is authoritative.** This file explains the shape and the
> intent of each layout; the zod schema enforces them, types the components, and
> gates every publish. Where the two disagree, the schema is right and this page
> is stale.

**The document's content is JSON, not markup.** `doc-data.json` is the single
edit surface: a refresh patches this data, then the locked components turn it into the
exact HTML that `app.css` styles. The LLM never writes markup — it writes data,
and the components own the shell. A surgical edit is therefore an array append or
a field flip, not a byte-exact HTML string replacement, which is what makes
a frequent refresh cheap.

Three inline blocks in the **built page**, separate concerns:

- `#doc-state` — cursors, `artifactUrl`, `format` (see [`config.md`](config.md)).
- `#doc-config` — scope + settings.
- **`#doc-data`** — the content, below.

All three are **build output**, baked from the matching file in
`project-docs/<name>/__external/` and regenerated on every build. The files are
the state; a run reads and patches `doc-data.json`, `doc-state.json` and
`config.json`, and never the blocks — anything written into a block is discarded
by the next build.

## Top level

```json
{
  "meta": { "project": "", "tagline": "", "timezone": "", "locale": "", "updatedAt": "" },
  "sections": [ SectionNode, … ]
}
```

`sections` order **is** render order. A section appears, disappears, moves or is
renamed purely by editing this array — that is the editorial freedom, preserved.

## SectionNode — chrome is data, layout is locked

```json
{
  "id": "state", "tab": "project",
  "eyebrow": "where things stand", "title": "36 territories, 9 to go",
  "lead": "Shipped, stuck, at risk.", "icon": "i-layers",
  "layout": "timeline|state|ask|whatsnew|tldr|goal|primer|glossary|pipeline|gantt|lane|prose",
  "blocks": …
}
```

`eyebrow`, `title`, `lead`, `icon`, the section's **presence** and its **order**
are free — the LLM's editorial call. `layout` selects a **locked** visual grammar;
the renderer owns how that grammar looks and all its invariants (tile counts,
sprite icons, a11y, filters, spark). A title that changes with the content ("36
territories, 9 to go") is just a string the model sets from the blocks.

**Unknown `layout` → `prose`** (the section-level escape hatch): a novel section
renders as eyebrow + title + lead + generic blocks, never blocked.

## Block shapes by layout

All eleven layouts are implemented in the components and
golden-tested in the app (`npm test` in `app/`).

- **`timeline`** — `blocks: [Event]`, `Event = { kind, iso, date, title, gist,
  body?, bodyHead?, cites?, flag? }`. `kind ∈ decision|pivot|incident|milestone|
  build|meeting`. The renderer **derives** the spark strip, the multi-select filter
  chips (one per kind present), the legend, and the month clustering from the
  events — the LLM supplies only events, so those can never drift.
- **`state`** — `blocks: [Group]`, `Group = { state, rows: [Row] }`,
  `Row = { title, status?, gist?, body?, bodyHead?, cites?, flag? }`. `state ∈
  risk|blocked|flight|shipped`. Tile counts are **derived from the rows**. `body`
  folds a row's argument into a disclosure, exactly as a timeline event does —
  the contradictions section is nothing but such rows.
- **`ask`** — `blocks: { open: [Q], done: [Q] }`,
  `Q = { q, who?, ctx?, answer?, cites? }`. Tally counts are computed at runtime by
  the components; ship `0`.
- **`prose` / generic** — `blocks: [GenericBlock]`,
  `GenericBlock = { type: "p"|"callout"|"disc"|"fields", … }`.
  `fields = [{ label, value }]` is the key/value escape hatch for content of an
  unknown shape.

- **`whatsnew`** — `blocks: { runs: [{ iso, date, time, sources, latest,
  bullets: [{ kind, strong?, text, cites?, goto? }] }], srcNote? }`. `kind ∈ dec|
  risk|res|add|upd|watch`. `goto = { target, label }`. The newest run sets
  `latest: true` (renders `is-latest`).
- **`tldr`** — `blocks: { tiles: [{ n, label, gist? , risk? }], key?, long?, longGist? }`.
- **`goal`** — `blocks: { current?, shifts: [DecisionRow], historical? }`,
  `DecisionRow = { date, kind, title, verdict, why?, cites? }`, `kind ∈ decision|
  pivot|milestone`.
- **`primer`** — `blocks: [{ q, a, body }]`.
- **`glossary`** — `blocks: [{ name, terms: [{ term, def, code? }] }]`. The letter
  rail is **derived** from the terms present.
- **`pipeline`** — `blocks: [{ title, gist, detail }]`. Numbers and stage ids are
  **derived** (order → `01`, title → `stage-<slug>`); the last stage has no arrow.
- **`gantt`** — `blocks: { window: { start, unit, cols, todayC1?, vh }, rows:
  [{ title, laneId, status, c1, span, dep?, vh }] }`. The month band and day band
  are **derived** from `start`/`unit`/`cols`; `is-tight` is derived from `span < 3`.
- **`lane`** — `blocks: [{ id, title, href?, tag?, d, cites?, disc?, watch? }]`.
  `item-n` is **derived** from order. `watch` is optional **metadata the renderer
  ignores** — `{ kind: "pr"|"tracker"|"bead", ref }` (a PR number `"acme/x#53"` or a
  tracker item id; `bead` is the legacy spelling of `tracker`)
  — read by the every-run auto-check: when that PR merges or that item closes, the run
  flips the item's linked gantt row to `status: "shipped"` and writes a `res`
  changelog bullet. That is how a todo checks itself.

## Cite

```json
{ "key": "pr-53", "kind": "pr|slack|gmail|cal|drive|tracker|figma|commit|path|thread|link",
  "raw": "PR #53", "url": "https://…", "preview": true }
```

`url` present and allowlisted → linked `<a class="cite">`; else `<span>`.
`kind: "link"` (or any unknown kind) → the generic `#i-link` chip and the generic
preview card. `kind: "bead"` is a legacy alias of `"tracker"` and renders
identically — write `tracker` in new data, whatever tracker the project uses.

**The hover card, and where its payload goes.** Write the payload in
`doc-previews.json`, keyed by this citation's `key`, and set `preview: true`
here — that is the documented shape, and the one the reference set in
`app/src/__external/` uses.

The chip resolves its card from `#doc-previews` **first** and falls back to a
payload written inline on `preview`. Both work, so a run cannot lose a card to a
missing flag or to a payload it put in the other place; do not read that as a
choice, though — one document that writes payloads in both places has two copies
of the same fact and only one of them gets patched by the next run.

The one shape that is an error: `preview: true` with no payload anywhere.
`assemble.mjs` fails the build on it rather than shipping a chip that opens
nothing.

## The security invariant (absolute)

Every value that came from a source is escaped by the renderer — `esc()` on text,
`escAttr()` on attribute values. A generic node (unknown cite kind, generic block,
prose section) carries **structured data** — labels, strings, an href — and
**never source-authored markup**. Unknown *shape* is fine; unknown *markup* is
never rendered. This is what lets the model be flexible about content it has never
seen without reopening the XSS surface the skill closed.

## Rendering

The same components run at **publish time** on node, bundled into
`references/prerender.mjs`, so one definition serves both the prerender and the
browser. The build is a single step — `assemble.mjs` validates, renders,
inlines and writes — baking both the rendered HTML (for no-JS and first paint)
and `#doc-data` (so the published page is self-contained) into the Artifact. The
next run's edit surface is `doc-data.json`, not that block.
The components carry the interactivity themselves — there is no separate script to keep in step with the markup.
