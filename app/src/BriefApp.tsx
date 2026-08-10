/**
 * The standalone brief's root — `scope: all`, the whole day rather than one
 * project.
 *
 * It is deliberately thin, and that is the point of the port: the brief is not
 * a second implementation of these components, it is the same `<Brief>` the
 * Today tab renders with `scope` set to `all` and nothing around it but the
 * sprite sheet and the context every component reads from.
 *
 * Which inverts the dependency the two SKILL.mds describe. `daily-brief` used
 * to own the shell and `project-doc` inlined its CSS and its citation layer;
 * now the components live here and daily-brief vendors what this app builds.
 * `references/components.md` remains the spec for what each part IS — this is
 * the only thing that renders it.
 */

import { Brief } from './components/brief/Brief.tsx'
import { Sprites } from './components/Sprites.tsx'
import { DocProvider } from './components/doc-context.tsx'
import { useReducedMotion } from './lib/client-only.ts'
import type { DisplayConfig } from './schema/doc-config.ts'
import type { PreviewEntry } from './schema/doc-previews.ts'
import type { BriefData } from './schema/brief-data.ts'

export function BriefApp({
  brief, allowlist, previews, avatars, icons, config,
}: {
  brief: BriefData
  allowlist: readonly string[]
  previews: Record<string, PreviewEntry>
  /** `#doc-avatars` — every distinct face, once. */
  avatars?: Record<string, string>
  /** `#doc-icons` — minted source marks, sanitised at publish. */
  icons?: string
  /** Absent on a published page, which carries no `#doc-config`; the dev server
   *  has the real one and passes it. */
  config?: DisplayConfig
}) {
  const quiet = useReducedMotion()
  // Without this a hover card formats its dates in the VIEWER's zone, which for
  // a page about one specific day is the wrong day. `brief.meta.timezone` is
  // required and already in the page, so the published brief needs no
  // `#doc-config` to get this right.
  const display = { ...config, timezone: config?.timezone ?? brief.meta.timezone }
  return (
    <DocProvider value={{ allowlist, previews, config: display, quiet, avatars, icons }}>
      <Sprites />
      <Brief data={brief} />
    </DocProvider>
  )
}
