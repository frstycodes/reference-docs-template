/**
 * What both surfaces read out of `@external` in dev, and nothing else.
 *
 * A published page carries its data in inline `<script type="application/json">`
 * blocks; in dev those blocks do not exist, so the same data is read straight
 * from the selected external directory. Only what EVERY external directory has
 * lives here — the document's `doc-data.json` and the brief's `brief-data.json`
 * are loaded by their own entry, because a directory holds one document and an
 * import of the other one would not resolve.
 *
 * The `DEV` guard is what keeps a document's data — and the URLs inside it —
 * out of the published bundle rather than merely unused within it.
 *
 * No avatars: `#doc-avatars` is a PUBLISH artefact. The assemblers hoist the
 * distinct faces out of the payloads, which carry them as `data:` URIs until
 * then — so dev renders faces straight from the previews, exactly as
 * `avatarSrc` already handles. (`@external/avatars.json` is a different thing:
 * the name-keyed seed store `inline-avatars.mjs` fills from.)
 */

import type { DisplayConfig } from './schema/doc-config.ts'

export async function devExternal() {
  if (!import.meta.env.DEV) return undefined
  const [previews, config, icons, { mintIcons }] = await Promise.all([
    import('@external/doc-previews.json'),
    import('@external/config.json'),
    import('@external/doc-icons.json'),
    // The sanitiser the publish build runs. Dev renders minted marks through
    // the same allowlist rather than trusting them, so a mark that will be
    // dropped at publish is already missing here.
    import('./lib/mint-icons.mjs'),
  ])
  return {
    previews: previews.default,
    config: config.default as DisplayConfig & { allowlist?: string[] },
    icons: mintIcons(icons.default).markup,
  }
}
