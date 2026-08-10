/**
 * `#brief-data` — the Today fragment, as data.
 *
 * The brief used to arrive from the sibling `daily-brief` skill as an HTML
 * fragment that this document dropped into `#panel-today`. Rendering foreign
 * markup in React means `dangerouslySetInnerHTML`, which the skill's security
 * invariant rules out — so the contract moves: daily-brief returns THIS, and
 * the app renders it with the same components the standalone brief will use.
 *
 * Two consequences of that move, both from `daily-brief/references/components.md`:
 *
 * 1. The feature paragraph and update descriptions carry inline markup — bold
 *    runs, links, avatar chips mid-sentence. As data that has to be a list of
 *    typed runs (`Inline`), never a string of HTML. Structured data, never
 *    source-authored markup — the same rule `data-model.md` states for cites.
 * 2. Avatars must be `data:` URIs. components.md says to link the Slack CDN and
 *    never base64 them, but that guidance cannot survive the Artifact's CSP,
 *    which blocks every external request. The repo's `avatars.json` already
 *    base64s them; this schema follows the repo, not the catalog.
 */

import { z } from 'zod'
import { Cite } from './doc-data.ts'

/* ── People and inline runs ────────────────────────────────────────────── */

export const Person = z.object({
  name: z.string().min(1),
  /** Monogram shown when the image is absent or fails to decode. */
  initial: z.string().min(1).max(2),
  /** Either a `data:` URI as authored, or an `avatar:<id>` reference into
   *  `#doc-avatars` once the publish step has hoisted it. An http(s) URL is
   *  neither, because the CSP would block it. */
  src: z.string().refine((v) => v.startsWith('data:') || v.startsWith('avatar:'), {
    message: 'an avatar must be a data: URI or an avatar: reference',
  }).optional(),
})
export type Person = z.infer<typeof Person>

/** A run of prose. The renderer maps each variant to one element — there is no
 *  path here by which source text becomes markup. */
export const Inline = z.union([
  z.object({ t: z.literal('text'), text: z.string() }),
  z.object({ t: z.literal('b'), text: z.string() }),
  z.object({ t: z.literal('link'), text: z.string(), href: z.string() }),
  z.object({ t: z.literal('people'), people: z.array(Person) }),
])
export type Inline = z.infer<typeof Inline>

export const Prose = z.array(Inline)

/** Copies `prompt` to the clipboard; the shared popover previews it on hover.
 *  Two per page maximum — the feature card and the schedule card. */
export const StarPrompt = z.object({
  /** Tooltip heading — "Start a chat about this". */
  head: z.string(),
  /** Written to the reader's agent, in full, first person. Not a summary. */
  prompt: z.string().min(1),
  /** Names what the prompt is about; "start working" alone tells a screen
   *  reader user nothing. */
  aria: z.string().min(1),
})

/* ── Section content ───────────────────────────────────────────────────── */

export const Todo = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  href: z.string().optional(),
  tag: z.string().optional(),
  d: z.string(),
  cites: z.array(Cite).optional(),
  people: z.array(Person).optional(),
  /** Every to-do gets one — a running start, not a link to turn into a question. */
  prompt: StarPrompt,
  /** Hand-varied, roughly -4deg to +3deg. Uniform tilt reads as a mistake. */
  rot: z.number().min(-8).max(8).optional(),
})

export const Update = z.object({
  title: z.string().min(1),
  href: z.string().optional(),
  tag: z.string().optional(),
  /** On an update the chips sit at the END of the paragraph, unlike a to-do. */
  d: Prose,
  cites: z.array(Cite).optional(),
  people: z.array(Person).optional(),
})

export const ScheduleItem = z.object({
  /** Compact, as it appears in the list — "9:15p". */
  time: z.string(),
  event: z.string().min(1),
  /** The detail line spells the range out — "Standup — 9:15 PM – 9:45 PM". */
  dt: z.string(),
  dd: Prose.optional(),
  startIso: z.string(),
  endIso: z.string().optional(),
  /** This meeting's own "Prep me". Prepping for a standup and prepping for a
   *  client review are not the same request, so the prompt belongs to the item
   *  rather than to the day. The section-level one is the fallback. */
  prompt: StarPrompt.optional(),
})

export const Read = z.object({
  kicker: z.string(),
  title: z.string().min(1),
  url: z.string(),
  desc: z.string(),
  /** Sprite id for the decorative mark inside the already-linked card. */
  icon: z.string().optional(),
})

const sectionBase = {
  id: z.string().min(1),
  eyebrow: z.string(),
  title: z.string().min(1),
  lead: z.string().optional(),
}

/** A section with no items does not exist. No zero-states, no placeholder rows
 *  — a quiet day gets a short page. Enforced by `.min(1)` on every list. */
export const BriefSection = z.discriminatedUnion('kind', [
  z.object({ ...sectionBase, kind: z.literal('todos'), items: z.array(Todo).min(1) }),
  z.object({ ...sectionBase, kind: z.literal('updates'), items: z.array(Update).min(1) }),
  z.object({
    ...sectionBase, kind: z.literal('schedule'),
    items: z.array(ScheduleItem).min(1),
    prompt: StarPrompt.optional(),
  }),
  z.object({ ...sectionBase, kind: z.literal('reads'), items: z.array(Read).min(1) }),
  z.object({ ...sectionBase, kind: z.literal('prose'), body: Prose }),
])
export type BriefSection = z.infer<typeof BriefSection>

/* ── The brief ─────────────────────────────────────────────────────────── */

export const BriefHero = z.object({
  /** The painting. `src` is a `data:` URI for the same CSP reason as avatars. */
  art: z.object({
    src: z.string().startsWith('data:'),
    /** What it shows — real alt text, not the title. */
    alt: z.string().min(1),
    /** "Title, Artist, Date. medium in lowercase" */
    credit: z.string(),
  }),
  /** One or two sentences, a situation with a pun. */
  blurb: z.string(),
})

/**
 * What the run changed in `memory/index.md` this morning.
 *
 * Disclosure is what makes an unattended memory write safe: the agent may change
 * how it extracts, and may retire a rule it wrote itself, but not quietly — the
 * change appears in the brief the reader opens the same day.
 */
export const Learned = z.object({
  kind: z.enum(['rule', 'watching', 'retired']),
  text: z.string().min(1),
  /** The evidence, one line. "You have not actioned one in three weeks." */
  why: z.string().optional(),
})
export type Learned = z.infer<typeof Learned>

export const BriefData = z.object({
  meta: z.object({
    /** "24 Jul 2026" */
    date: z.string(),
    dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Sets the hero title — "The Friday Brief". */
    weekday: z.string(),
    timezone: z.string(),
    /** `all` renders the standalone page; `project` renders the Today fragment
     *  only — identical components either way, per components.md. */
    scope: z.enum(['all', 'project']).default('project'),
  }),
  hero: BriefHero,
  /** The day's single highest-leverage move. Absent on a quiet day. */
  feature: z.object({
    topic: z.string().min(1),
    body: Prose,
    prompt: StarPrompt,
  }).optional(),
  sections: z.array(BriefSection).default([]),
  /** Empty on a day the run learned nothing, which is most days. */
  learned: z.array(Learned).default([]),
  /** Only the sources actually drawn on today. */
  footer: z.object({
    sources: z.array(z.object({
      name: z.string(),
      /** Sprite id — `i-slack`, `i-gmail`. */
      icon: z.string(),
      url: z.string(),
    })).default([]),
  }).optional(),
})
export type BriefData = z.infer<typeof BriefData>
