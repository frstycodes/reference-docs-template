/**
 * `#doc-config` — scope and settings. Written by `project-doc-setup`, read by
 * every run and by the app at boot.
 *
 * `sources` stays open-ended on purpose: the built-ins below are the ones the
 * skill knows how to read unaided, but `references/source-contract.md` admits
 * any connected tool that can answer "what changed since last time, and where
 * can I link it?". An unrecognised source key is carried, not rejected.
 */

import { z } from 'zod'

export const LaneWindow = z.object({
  windowUnit: z.enum(['week', 'month']),
  windowColumns: z.number().int().positive(),
  windowStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/** Who "you" is — whose lane the You tab renders when the live layer cannot
 *  identify the viewer. */
export const You = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  /** Assignee handle in whatever tracker the team uses. `beadAssignee` is the
   *  legacy Pact-shaped spelling, still written by existing configs. */
  trackerAssignee: z.string().optional(),
  beadAssignee: z.string().optional(),
  lane: LaneWindow.optional(),
})

export const DocConfig = z.looseObject({
  project: z.string().min(1),
  tagline: z.string(),
  timezone: z.string(),
  locale: z.string().optional(),
  you: You,
  /** Built-in and custom sources alike; shapes vary by source. */
  sources: z.record(z.string(), z.unknown()).default({}),
  /** Filter config handed to the daily-brief skill for the Today fragment. */
  brief: z.record(z.string(), z.unknown()).optional(),
  /** Hosts a citation URL must match to render as a link. */
  allowlist: z.array(z.string()).default([]),
})
export type DocConfig = z.infer<typeof DocConfig>

/** The one place the allowlist rule is implemented. A URL that does not parse,
 *  is not http(s), or whose host is not listed never becomes an `href`. */
export function isAllowed(url: string | undefined, allowlist: readonly string[]): boolean {
  if (!url) return false
  let host: string
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    host = u.hostname.toLowerCase()
  } catch {
    return false
  }
  return allowlist.some((entry) => {
    const e = entry.toLowerCase()
    return host === e || host.endsWith(`.${e}`)
  })
}

/**
 * Which tracker the project uses, per `references/config.md`.
 *
 * `sources` is an open record — the source contract admits any connected tool
 * — so this digs rather than declares, and honours the legacy `sources.pact`
 * block that config.md says reads as `{ kind: "pact" }`. It is the only thing
 * that can tell Linear's `ENG-431` from Jira's `PROJ-12`, which are the same
 * string.
 */
/**
 * The slice of the config a rendered chip or hover card actually reads.
 *
 * A published standalone brief has no `#doc-config` — `brief-assemble.mjs`
 * embeds only the brief data and the citation layer, which is what keeps
 * `notify.target` and `you.name` off the page — so `BriefApp` synthesises this
 * from `brief.meta` instead. Demanding a whole `DocConfig` at render would mean
 * either shipping that block or leaving the brief with no timezone at all.
 */
export type DisplayConfig = Partial<Pick<DocConfig, 'timezone' | 'locale' | 'sources'>>

export function trackerKind(config?: DisplayConfig): string | undefined {
  const t = config?.sources?.tracker
  if (t && typeof t === 'object' && typeof (t as { kind?: unknown }).kind === 'string') {
    return (t as { kind: string }).kind
  }
  return config?.sources?.pact ? 'pact' : undefined
}
