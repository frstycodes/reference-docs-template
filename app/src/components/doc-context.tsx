/**
 * What every component needs and nothing wants to thread by hand: the link
 * allowlist and the baked citation previews.
 *
 * The allowlist lives here rather than being applied when the data is written,
 * which is a deliberate change from the locked renderer. `doc-render.mjs` took
 * `cite.url` on trust and emitted it as an href — the host check was a rule the
 * LLM was told to follow while authoring. Now it is enforced at render, so a
 * URL that never cleared the allowlist cannot become a link no matter what
 * wrote it into `#doc-data`.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { DisplayConfig } from '../schema/doc-config.ts'
import type { PreviewEntry } from '../schema/doc-previews.ts'

export interface DocContextValue {
  allowlist: readonly string[]
  /** `#doc-previews`, keyed by cite key. A hover card never fetches. */
  previews: Record<string, PreviewEntry>
  /** Only what a chip or card reads — the standalone brief cannot supply more.
   *  A full `DocConfig` satisfies it structurally, so the document passes its
   *  own straight through. */
  config?: DisplayConfig
  /** `prefers-reduced-motion`, resolved once at the root rather than by every
   *  chip — a document carries a few hundred of them, and each one adding its
   *  own media-query listener would be a real cost for a decoration. */
  quiet?: boolean
  /**
   * `#doc-avatars` — every distinct face, once, keyed by a content hash.
   *
   * The same nine people are cited eighty times in a real document, and
   * inlining a picture per reference stored 273 kB of what is 38 kB of images.
   * Payloads carry `avatar:<id>` instead, and this resolves it. Authoring is
   * unaffected: data URIs are written plainly and hoisted at publish.
   */
  avatars?: Record<string, string>
  /**
   * `#doc-icons` — extra `<symbol>` markup for sources with no built-in mark,
   * minted at init and stored in the project's own directory.
   *
   * It arrives as a STRING because that is what it is: markup, sanitised
   * offline by `assemble.mjs` against an allowlist and inlined by `Sprites`.
   * The app never parses or trusts it at render — the guarantee is upstream,
   * and a document that could not be sanitised was never written.
   */
  icons?: string
}

const empty: DocContextValue = { allowlist: [], previews: {}, avatars: {} }

const DocContext = createContext<DocContextValue>(empty)

export function DocProvider({ value, children }: { value: DocContextValue; children: ReactNode }) {
  return <DocContext value={value}>{children}</DocContext>
}

export function useDoc(): DocContextValue {
  return useContext(DocContext)
}
