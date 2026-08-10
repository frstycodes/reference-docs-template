/**
 * The publish-time renderer. Bundled for node and vendored into the skill, so
 * `assemble.mjs` can produce a document on a machine with nothing installed —
 * the refresh loop must never need an install.
 *
 * It renders the SAME `App` the browser hydrates, which is the whole reason for
 * the rewrite: `doc-render.mjs` emitted markup and `doc-shell.js` separately
 * re-attached behaviour to it, and the two had to be kept in agreement by hand.
 */

import { renderToString } from 'react-dom/server'
import { App } from './App.tsx'
import { validate } from './schema/validate.ts'
import { DocConfig } from './schema/doc-config.ts'
import { readPreviews } from './schema/doc-previews.ts'
import { BriefData } from './schema/brief-data.ts'

export interface PrerenderInput {
  data: unknown
  previews?: Record<string, unknown>
  allowlist?: string[]
  config?: unknown
  brief?: unknown
  avatars?: Record<string, string>
  /** `#doc-icons` — already sanitised by the assembler. */
  icons?: string
}

export interface PrerenderResult {
  html: string
  errors: string[]
  warns: string[]
}

/** Validates, then renders. A document that does not validate is never
 *  rendered — "not clean, do not publish" is enforced here, not remembered. */
export function prerender(input: PrerenderInput): PrerenderResult {
  const previews = readPreviews(input.previews)
  const report = validate(input.data, previews)
  if (!report.data) return { html: '', errors: report.errors, warns: report.warns }

  const parsedConfig = DocConfig.safeParse(input.config)
  const parsedBrief = BriefData.safeParse(input.brief)
  // A malformed brief costs the Today tab, never the document.
  const briefWarns = input.brief && !parsedBrief.success
    ? parsedBrief.error.issues.map((i) => `#brief-data ${i.path.join('.')}: ${i.message}`)
    : []
  const html = renderToString(
    <App
      data={report.data}
      allowlist={input.allowlist ?? []}
      previews={previews}
      config={parsedConfig.success ? parsedConfig.data : undefined}
      brief={parsedBrief.success ? parsedBrief.data : undefined}
      avatars={input.avatars}
      icons={input.icons}
    />,
  )
  return { html, errors: report.errors, warns: [...report.warns, ...briefWarns] }
}
