/**
 * `#doc-previews` — the payload behind each hover card, baked into the document
 * so a card never fetches anything. That is what makes the cards work offline
 * and under a strict CSP.
 *
 * Every field is optional. A payload is whatever the source could actually
 * supply, and a card that is missing a field renders without it rather than
 * inventing one — "nothing fabricated" is the rule these shapes exist to serve.
 * So this file types what MAY be present; it never asserts what must be.
 */

import { z } from 'zod'
import { CITE_KINDS, type Cite } from './doc-data.ts'

const Person = z.object({
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
})

/**
 * Real payloads write `null` for "we looked and there is nothing", not an
 * absent key — a PR with no reviewer has `assignee: null`. `.optional()`
 * rejects that, and against one real 144-card document it silently dropped 81
 * of them. Stripping nulls once, here, is better than making
 * every field nullish and remembering to on the next one.
 */
function stripNulls(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripNulls)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x !== null) out[k] = stripNulls(x)
    }
    return out
  }
  return v
}

export const Preview = z.looseObject({
  // pr
  state: z.enum(['merged', 'closed', 'draft', 'open']).optional(),
  repo: z.string().optional(),
  number: z.union([z.number(), z.string()]).optional(),
  author: z.string().optional(),
  authorAvatarUrl: z.string().optional(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  changedFiles: z.number().optional(),
  mergedAt: z.string().optional(),
  closedAt: z.string().optional(),
  createdAt: z.string().optional(),

  // slack
  channel: z.string().optional(),
  text: z.string().optional(),
  /** Epoch seconds with a fraction, as Slack stamps them. */
  ts: z.union([z.string(), z.number()]).optional(),

  // tracker
  id: z.string().optional(),
  status: z.string().optional(),
  assignee: z.string().optional(),
  due: z.string().optional(),

  // figma
  file: z.string().optional(),
  page: z.string().optional(),
  node: z.string().optional(),

  // cal
  start: z.string().optional(),
  end: z.string().optional(),
  month: z.string().optional(),
  dateNum: z.union([z.string(), z.number()]).optional(),
  day: z.string().optional(),
  time: z.string().optional(),
  conferenceUrl: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(Person).optional(),
  attendeeCount: z.number().optional(),

  // drive
  mimeType: z.string().optional(),
  owner: z.string().optional(),
  ownerAvatarUrl: z.string().optional(),
  modified: z.string().optional(),

  // path
  path: z.string().optional(),
  exists: z.boolean().optional(),
  lines: z.number().optional(),

  // generic link
  source: z.string().optional(),
  host: z.string().optional(),
  updatedAt: z.string().optional(),

  /** custom — a source with no first-class card. The rows ARE the card: label
   *  and value, in the order the source's own UI shows them, rendered as a
   *  definition list. Data, not markup — the same rule as everywhere else, and
   *  the reason a new source needs no new component. */
  rows: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  /** Sprite id for the source's minted mark. */
  icon: z.string().optional(),

  title: z.string().optional(),
})
export type Preview = z.infer<typeof Preview>

/** One entry as the build writes it: the kind decides which card renders.
 *  `bead` normalises to `tracker` here exactly as it does on a citation —
 *  the real document is full of the legacy spelling, and an entry rejected
 *  for it would lose its card. */
export const PreviewEntry = z.preprocess(
  (v) => {
    const e = stripNulls(v)
    if (!e || typeof e !== 'object') return e
    const o = e as Record<string, unknown>
    return o.kind === 'bead' ? { ...o, kind: 'tracker' } : o
  },
  z.object({
    kind: z.enum(CITE_KINDS).optional(),
    raw: z.string().optional(),
    preview: Preview.optional(),
  }),
)
export type PreviewEntry = z.infer<typeof PreviewEntry>

/**
 * The payload behind one chip, from wherever the run actually put it.
 *
 * Two places are legal because runs use both and the old gate — "only look when
 * `cite.preview` is set" — turned each mismatch into a chip that silently opened
 * nothing:
 *
 * - `#doc-previews` keyed by the citation key. The documented place, and it wins.
 * - the citation's own `preview`, when it was written as the payload rather than
 *   as the `true` flag. `#doc-data` is the one file every run writes, so this is
 *   where a payload lands when `doc-previews.json` was never created.
 *
 * A cite key present in `#doc-previews` opens its card whether or not the
 * citation flags it. The payload existing IS the promise; a missing flag was
 * never a reason to withhold a card the document is already carrying.
 */
export function previewFor(cite: Cite, previews: Record<string, PreviewEntry>): PreviewEntry | undefined {
  const keyed = previews[cite.key]
  if (keyed) return keyed
  if (!cite.preview || typeof cite.preview !== 'object') return undefined

  // A bare payload (`{ state, repo, … }`) and a whole entry (`{ kind, preview }`)
  // both appear in the wild; the entry parse tells them apart.
  const inline = cite.preview as Record<string, unknown>
  const parsed = PreviewEntry.safeParse('preview' in inline ? inline : { preview: inline })
  return parsed.success ? parsed.data : undefined
}

/**
 * `#doc-previews` accepts either the keyed object the build writes or
 * `citations.json`'s own `{ citations: [...] }` shape, so the two can never
 * fall out of step — same tolerance `cite.js` had.
 */
export function readPreviews(raw: unknown): Record<string, PreviewEntry> {
  const out: Record<string, PreviewEntry> = {}
  if (!raw || typeof raw !== 'object') return out

  const list = (raw as { citations?: unknown }).citations
  if (Array.isArray(list)) {
    for (const c of list) {
      const parsed = PreviewEntry.safeParse(c)
      const key = (c as { key?: unknown })?.key
      if (parsed.success && typeof key === 'string' && parsed.data.preview) out[key] = parsed.data
    }
    return out
  }

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = PreviewEntry.safeParse(value)
    if (parsed.success) out[key] = parsed.data
  }
  return out
}
