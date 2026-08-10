/**
 * The root the browser hydrates and the prerenderer renders — one component so
 * the two can never drift. Everything environment-specific (reading the inline
 * JSON, the dev fixture) stays in `main.tsx`; everything here is pure data in,
 * markup out.
 */

import { Doc } from './components/Doc.tsx'
import { Brief } from './components/brief/Brief.tsx'
import { Sprites } from './components/Sprites.tsx'
import { DocProvider } from './components/doc-context.tsx'
import { useReducedMotion } from './lib/client-only.ts'
import type { DocData } from './schema/doc-data.ts'
import type { DocConfig } from './schema/doc-config.ts'
import type { PreviewEntry } from './schema/doc-previews.ts'
import type { BriefData } from './schema/brief-data.ts'

export function App({
  data, allowlist, previews, config, brief, avatars, icons,
}: {
  data: DocData
  allowlist: readonly string[]
  previews: Record<string, PreviewEntry>
  config?: DocConfig
  /** The Today fragment. Absent means the tab does not exist. */
  brief?: BriefData
  /** `#doc-avatars` — every distinct face, once. */
  avatars?: Record<string, string>
  /** `#doc-icons` — minted source marks, sanitised at publish. */
  icons?: string
}) {
  // Resolved once here and handed down, so a few hundred citation chips do not
  // each register their own media-query listener.
  const quiet = useReducedMotion()

  return (
    <DocProvider value={{ allowlist, previews, config, quiet, avatars, icons }}>
      <Sprites />
      <Doc data={data} today={brief ? <Brief data={brief} /> : undefined} />
    </DocProvider>
  )
}
