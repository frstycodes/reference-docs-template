/**
 * `#doc-data` — the document's content, and the single edit surface.
 *
 * This file is the CONTRACT. The LLM writes data against it, the components
 * render data typed by it, and `assemble.mjs` validates against it before
 * anything is published. One definition, three consumers — which is the whole
 * reason the app owns the schema rather than restating it in prose.
 *
 * Ported from `references/data-model.md` (format 3) and reconciled against the
 * two locked files that actually consume the data — `doc-render.mjs` and
 * `doc-data-check.mjs`. Where those disagreed with the prose, the code won:
 * `callout.variant`, `fields.title`/`fields.icon`, `lane.discHead` and
 * `primer.a` are all read by the renderer but undocumented in the data model.
 */

import { z } from 'zod'

/* ── Citations ─────────────────────────────────────────────────────────────
   `bead` is the legacy spelling of `tracker`; any unrecognised kind degrades
   to the generic `link` chip rather than failing the document. Both rules come
   from data-model.md and are applied here so no component has to know them. */

export const CITE_KINDS = [
  'pr', 'slack', 'gmail', 'cal', 'drive', 'tracker',
  'figma', 'commit', 'path', 'thread', 'link',
  /** A source the skill has no first-class card for — Notion, Sentry, a
   *  feed. It is a real kind rather than a degraded `link` because init mints
   *  a mark and a card spec for it (see `references/source-contract.md`), and
   *  both are carried by the citation: `icon` names the minted symbol, and the
   *  payload's `rows` fill the card. */
  'custom',
] as const

const CiteKind = z.preprocess(
  (v) => (v === 'bead' ? 'tracker'
    : typeof v === 'string' && (CITE_KINDS as readonly string[]).includes(v) ? v
      : 'link'),
  z.enum(CITE_KINDS),
)

export const Cite = z.object({
  key: z.string().min(1),
  kind: CiteKind,
  /** What the project calls it in plain text — `PR #53`, `BEAD-0082`. */
  raw: z.string().min(1),
  /** Linked only when the host clears `#doc-allowlist`; checked at render. */
  url: z.string().optional(),
  /** Truthy means `#doc-previews` must carry a payload under `key`.
   *  The payload's own shape lives in `doc-previews.ts`. */
  preview: z.unknown().optional(),
  /** Overrides the mark this kind would otherwise wear. Written by init for a
   *  custom source, whose symbol is minted rather than built in; `assemble.mjs`
   *  refuses an id that resolves to nothing, so this cannot silently render as
   *  empty space the way a bare `<use>` would. */
  icon: z.string().optional(),
})
export type Cite = z.infer<typeof Cite>

const cites = z.array(Cite).optional()

/* ── Shared leaves ─────────────────────────────────────────────────────── */

/** `flag: true` renders the "new" pill. */
const flag = z.boolean().optional()

export const STATES = ['risk', 'blocked', 'flight', 'shipped'] as const
export const State = z.enum(STATES)
export type State = z.infer<typeof State>

/* ── Generic blocks — the block-level escape hatch ─────────────────────────
   Structured data of an unknown shape, never source-authored markup. An
   unrecognised `type` still renders its `text` (the renderer's own fallback),
   so the passthrough member keeps documents forward-compatible. */

const BLOCK_TYPES = ['p', 'callout', 'disc', 'fields'] as const

export const GenericBlock = z.preprocess(
  // An unrecognised block type normalises to `unknown`, keeping whatever text
  // it carried — the same move as an unknown layout becoming `prose` and an
  // unknown cite kind becoming `link`. Normalising here rather than leaving a
  // `{ type: string }` member in the union is what makes this a genuine
  // discriminated union: a bare `string` discriminant overlaps every literal,
  // so no consumer could narrow it and every field access was an error.
  (v) => {
    if (!v || typeof v !== 'object') return v
    const b = v as Record<string, unknown>
    if (typeof b.type === 'string' && (BLOCK_TYPES as readonly string[]).includes(b.type)) return v
    return { type: 'unknown', text: typeof b.text === 'string' ? b.text : undefined }
  },
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('p'), text: z.string() }),
    z.object({ type: z.literal('callout'), text: z.string(), variant: z.string().optional() }),
    z.object({ type: z.literal('disc'), title: z.string(), body: z.string(), gist: z.string().optional() }),
    z.object({
      type: z.literal('fields'),
      fields: z.array(z.object({ label: z.string(), value: z.string() })),
      title: z.string().optional(),
      icon: z.string().optional(),
    }),
    z.object({ type: z.literal('unknown'), text: z.string().optional() }),
  ]),
)
export type GenericBlock = z.infer<typeof GenericBlock>

/* ── Per-layout block shapes ───────────────────────────────────────────── */

export const TIMELINE_KINDS = ['decision', 'pivot', 'incident', 'milestone', 'build', 'meeting'] as const

export const TimelineEvent = z.object({
  kind: z.enum(TIMELINE_KINDS),
  /** Full ISO date; the renderer derives month clusters and the spark from it. */
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'iso must start with YYYY-MM-DD'),
  /** The human rendering of `iso` — "12 Mar". */
  date: z.string(),
  title: z.string().min(1),
  gist: z.string().optional(),
  /** The disclosure rule: the full prose lives here, never in `gist`. */
  body: z.string().optional(),
  bodyHead: z.string().optional(),
  cites, flag,
})

export const StateRow = z.object({
  title: z.string().min(1),
  status: z.string().optional(),
  gist: z.string().optional(),
  /**
   * The folded depth. Format 3 had no field for this, and one real document
   * turned out to carry it on nearly every Current State row — its
   * contradictions section was entirely rows whose argument lives in a
   * disclosure. Extracting into a shape without it would have cut that prose,
   * which is the one thing the disclosure rule forbids.
   */
  body: z.string().optional(),
  bodyHead: z.string().optional(),
  cites, flag,
})

export const StateGroup = z.object({ state: State, rows: z.array(StateRow) })

export const AskQuestion = z.object({
  q: z.string().min(1),
  who: z.string().optional(),
  ctx: z.string().optional(),
  answer: z.string().optional(),
  cites,
})

export const WHATSNEW_KINDS = ['dec', 'risk', 'res', 'add', 'upd', 'watch'] as const

export const WhatsNewBullet = z.object({
  kind: z.enum(WHATSNEW_KINDS),
  strong: z.string().optional(),
  text: z.string(),
  cites,
  goto: z.object({ target: z.string(), label: z.string() }).optional(),
})

export const WhatsNewRun = z.object({
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  date: z.string(),
  time: z.string(),
  /** Which sources this run read, as one display string. */
  sources: z.string(),
  /** Exactly one run in the section carries this — enforced in `validate.ts`. */
  latest: z.boolean().optional(),
  bullets: z.array(WhatsNewBullet),
})

export const TldrTile = z.object({
  n: z.string(),
  label: z.string(),
  gist: z.string().optional(),
  risk: z.boolean().optional(),
})

export const DECISION_KINDS = ['decision', 'pivot', 'milestone'] as const

export const DecisionRow = z.object({
  date: z.string(),
  kind: z.enum(DECISION_KINDS),
  title: z.string().min(1),
  verdict: z.string(),
  why: z.string().optional(),
  cites,
})

export const PrimerCard = z.object({
  q: z.string().min(1),
  /** The one-line answer on the summary; `body` is the folded long form. */
  a: z.string(),
  body: z.string(),
})

export const GlossaryGroup = z.object({
  name: z.string(),
  terms: z.array(z.object({
    term: z.string().min(1),
    def: z.string(),
    code: z.boolean().optional(),
  })),
})

export const PipelineStage = z.object({
  title: z.string().min(1),
  gist: z.string(),
  detail: z.string(),
})

export const GanttWindow = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'window.start must be an ISO date'),
  unit: z.enum(['week', 'month']),
  cols: z.number().int().positive(),
  todayC1: z.number().int().optional(),
  /** Visually-hidden label for the window, read by screen readers. */
  vh: z.string().optional(),
})

export const GanttRow = z.object({
  title: z.string().min(1),
  /** Must match a `lane` item id — cross-checked in `validate.ts`. */
  laneId: z.string().optional(),
  status: State,
  c1: z.number().int(),
  span: z.number().int(),
  dep: z.string().optional(),
  vh: z.string().optional(),
})

export const LaneItem = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  href: z.string().optional(),
  tag: z.string().optional(),
  /** "since you last looked" — the real document flags lane items too. */
  flag,
  /** The one-line description under the title. */
  d: z.string(),
  cites,
  disc: z.string().optional(),
  discHead: z.string().optional(),
  /** Metadata the renderer ignores: what the live layer watches so this item
   *  can check itself off. `bead` is the legacy spelling of `tracker`. */
  watch: z.object({
    kind: z.enum(['pr', 'tracker', 'bead']),
    ref: z.string(),
  }).optional(),
})

/* ── Sections ──────────────────────────────────────────────────────────────
   `layout` picks a locked visual grammar; `eyebrow`/`title`/`lead`/`icon`,
   presence and order stay the LLM's editorial call. */

export const TABS = ['today', 'whatsnew', 'orientation', 'project', 'timeline', 'you'] as const
export type Tab = (typeof TABS)[number]

const base = {
  id: z.string().min(1),
  tab: z.enum(TABS),
  title: z.string().min(1),
  eyebrow: z.string().optional(),
  lead: z.string().optional(),
  icon: z.string().optional(),
}

const generic = z.array(GenericBlock)

export const LAYOUTS = [
  'timeline', 'state', 'ask', 'whatsnew', 'tldr', 'goal',
  'primer', 'glossary', 'pipeline', 'gantt', 'lane', 'prose', 'generic',
] as const
export type Layout = (typeof LAYOUTS)[number]

export const SectionNode = z.preprocess(
  // Unknown layout → prose, per data-model.md: a novel section is never
  // blocked, it just loses its bespoke grammar. Done here rather than as a
  // union fallback so a KNOWN layout with malformed blocks still fails loudly
  // instead of silently degrading to a paragraph list.
  (v) => {
    if (!v || typeof v !== 'object') return v
    const s = v as Record<string, unknown>
    if (typeof s.layout === 'string' && (LAYOUTS as readonly string[]).includes(s.layout)) return v
    return { ...s, layout: 'prose', blocks: Array.isArray(s.blocks) ? s.blocks : [] }
  },
  z.discriminatedUnion('layout', [
    z.object({ ...base, layout: z.literal('timeline'), blocks: z.array(TimelineEvent) }),
    z.object({ ...base, layout: z.literal('state'), blocks: z.array(StateGroup) }),
    z.object({
      ...base, layout: z.literal('ask'),
      blocks: z.object({ open: z.array(AskQuestion).default([]), done: z.array(AskQuestion).default([]) }),
    }),
    z.object({
      ...base, layout: z.literal('whatsnew'),
      blocks: z.object({ runs: z.array(WhatsNewRun), srcNote: z.string().optional() }),
    }),
    z.object({
      ...base, layout: z.literal('tldr'),
      blocks: z.object({
        tiles: z.array(TldrTile),
        key: z.string().optional(),
        long: z.string().optional(),
        longGist: z.string().optional(),
      }),
    }),
    z.object({
      ...base, layout: z.literal('goal'),
      blocks: z.object({
        current: z.string().optional(),
        shifts: z.array(DecisionRow).default([]),
        historical: z.string().optional(),
      }),
    }),
    z.object({ ...base, layout: z.literal('primer'), blocks: z.array(PrimerCard) }),
    z.object({ ...base, layout: z.literal('glossary'), blocks: z.array(GlossaryGroup) }),
    z.object({ ...base, layout: z.literal('pipeline'), blocks: z.array(PipelineStage) }),
    z.object({
      ...base, layout: z.literal('gantt'),
      blocks: z.object({ window: GanttWindow, rows: z.array(GanttRow) }),
    }),
    z.object({ ...base, layout: z.literal('lane'), blocks: z.array(LaneItem) }),
    z.object({ ...base, layout: z.literal('prose'), blocks: generic }),
    // `generic` is an accepted alias of `prose` in doc-data-check.mjs.
    z.object({ ...base, layout: z.literal('generic'), blocks: generic }),
  ]),
)
export type SectionNode = z.infer<typeof SectionNode>

/* ── The document ──────────────────────────────────────────────────────── */

export const DocMeta = z.object({
  project: z.string().min(1),
  tagline: z.string(),
  timezone: z.string(),
  locale: z.string().optional(),
  updatedAt: z.string(),
})

export const DocData = z.object({
  meta: DocMeta,
  /** Array order IS render order. */
  sections: z.array(SectionNode).min(1, '#doc-data has no sections'),
})
export type DocData = z.infer<typeof DocData>

/** Narrow a section to one layout — the components' entry point. */
export type SectionOf<L extends Layout> = Extract<SectionNode, { layout: L }>
