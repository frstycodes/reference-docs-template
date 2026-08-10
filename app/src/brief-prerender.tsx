/**
 * Publish-time renderer for the standalone brief. Bundled for node and
 * vendored into `daily-brief/references/`, so `brief-assemble.mjs` produces a
 * page on a machine with nothing installed — the morning routine clones fresh
 * in the cloud and must never need an install.
 *
 * Unlike the document's prerender, a brief that does not validate is not
 * downgraded to a thinner page: there is nothing left when the brief is the
 * whole document. The errors come back and the assembler writes nothing, so
 * yesterday's Artifact stays live rather than being replaced by a broken one.
 */

import { renderToString } from 'react-dom/server'
import { BriefApp } from './BriefApp.tsx'
import type { DisplayConfig } from './schema/doc-config.ts'
import { readPreviews } from './schema/doc-previews.ts'
import { BriefData } from './schema/brief-data.ts'

export interface BriefPrerenderInput {
  brief: unknown
  previews?: Record<string, unknown>
  allowlist?: string[]
  /** `#doc-config` — already pruned by the assembler to the three values a
   *  hover card reads. */
  config?: DisplayConfig
  avatars?: Record<string, string>
  /** `#doc-icons` — already sanitised by the assembler. */
  icons?: string
}

export interface BriefPrerenderResult {
  html: string
  errors: string[]
  warns: string[]
}

export function prerenderBrief(input: BriefPrerenderInput): BriefPrerenderResult {
  const parsed = BriefData.safeParse(input.brief)
  if (!parsed.success) {
    return {
      html: '',
      errors: parsed.error.issues.map((i) => `#brief-data ${i.path.join('.') || '(root)'}: ${i.message}`),
      warns: [],
    }
  }

  const warns: string[] = []
  // `scope: project` means the brief is a fragment of someone else's document:
  // no grain, no <main>, and a host that owns both. Rendered on its own it
  // would come out subtly wrong rather than obviously wrong, so say so.
  if (parsed.data.meta.scope !== 'all') {
    return {
      html: '',
      errors: [
        `#brief-data meta.scope is "${parsed.data.meta.scope}" — the standalone page is ` +
        `scope "all". A "project" brief is returned to project-doc as data, not built here.`,
      ],
      warns,
    }
  }

  const previews = readPreviews(input.previews)
  // A chip whose payload is missing still renders; it just has no card. Worth
  // naming, not worth failing over.
  for (const key of new Set(citedKeys(parsed.data))) {
    if (!previews[key]) warns.push(`cite "${key}" has no preview payload — the chip will not open a card`)
  }

  const html = renderToString(
    <BriefApp
      brief={parsed.data}
      allowlist={input.allowlist ?? []}
      previews={previews}
      config={input.config}
      avatars={input.avatars}
      icons={input.icons}
    />,
  )
  return { html, errors: [], warns }
}

/** Every `cite.key` in the brief, wherever it sits. */
function citedKeys(brief: BriefData): string[] {
  const keys: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    for (const [k, v] of Object.entries(node)) {
      if (k === 'cites' && Array.isArray(v)) {
        for (const c of v) if (c && typeof c === 'object' && typeof c.key === 'string') keys.push(c.key)
      } else walk(v)
    }
  }
  walk(brief)
  return keys
}
