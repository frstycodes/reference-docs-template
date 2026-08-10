/**
 * Browser entry. In the published Artifact it hydrates the prerendered markup
 * and reads its data from the inline `<script type="application/json">` blocks;
 * in dev those blocks do not exist, so it reads the same data straight out of
 * `@external` — the directory `DOC` names, or the reference set.
 *
 * Data is INJECTED at publish rather than imported, and that is deliberate:
 * `doc-data.json` and `doc-previews.json` together are about a megabyte, and a
 * megabyte of JSON compiled into the bundle as object literals parses slower
 * than the same bytes in a `<script type="application/json">` block. Code from
 * `@external` — the document's own cards — is bundled; its data is not.
 *
 * Stylesheet order is load-bearing and matches the assemble order the skill
 * has always used: fonts, then the token layer, then the shared citation
 * layer, then this document's own grammar. Each builds on the one before it.
 */
import './styles/fonts.css'
import './styles/shell.css'
import './styles/cite.css'
import './styles/doc-components.css'
import './styles/preview-card.css'

import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { App } from './App.tsx'
import { devExternal } from './dev-external.ts'
import { validate } from './schema/validate.ts'
import { DocConfig } from './schema/doc-config.ts'
import { readPreviews } from './schema/doc-previews.ts'
import { BriefData } from './schema/brief-data.ts'

/** Read one of the inline JSON blocks the Artifact bakes in. */
function inline(id: string): unknown {
  const el = document.getElementById(id)
  if (!el?.textContent) return undefined
  try {
    return JSON.parse(el.textContent)
  } catch {
    return undefined
  }
}

/** This document's own two data files, in dev only. Everything both surfaces
 *  share is in `devExternal`. */
async function devDoc() {
  if (!import.meta.env.DEV) return undefined
  const [data, brief] = await Promise.all([
    import('@external/doc-data.json'),
    import('@external/brief-data.json'),
  ])
  // `?fixture=torture` swaps the content for the degradation fixture — every
  // malformed shape the schema is meant to survive — while keeping this
  // document's config, previews and marks.
  const torture = new URLSearchParams(location.search).get('fixture') === 'torture'
  return {
    data: torture ? (await import('../fixtures/torture.json')).default : data.default,
    brief: brief.default,
  }
}

async function boot() {
  const [dev, doc] = await Promise.all([devExternal(), devDoc()])

  const previews = readPreviews(inline('doc-previews') ?? dev?.previews)
  const raw = inline('doc-data') ?? doc?.data
  const config = DocConfig.safeParse(inline('doc-config') ?? dev?.config)
  // The published document carries its own `#doc-allowlist`; in dev the config
  // is the only copy, and `assemble.mjs` derives that block from it anyway.
  const allowlist = (inline('doc-allowlist') as string[]) ?? (config.success ? config.data.allowlist : [])
  const avatars = (inline('doc-avatars') as Record<string, string>) ?? {}
  const icons = document.getElementById('doc-icons')?.textContent ?? dev?.icons
  const brief = BriefData.safeParse(inline('brief-data') ?? doc?.brief)

  const report = validate(raw, previews)
  const root = document.getElementById('root')!

  const tree = (
    <StrictMode>
      {report.data ? (
        <App
          data={report.data}
          allowlist={allowlist}
          previews={previews}
          config={config.success ? config.data : undefined}
          brief={brief.success ? brief.data : undefined}
          avatars={avatars}
          icons={icons}
        />
      ) : (
        <pre style={{ padding: '2rem', font: '13px/1.6 var(--mono)', color: 'var(--alert)' }}>
          {report.errors.join('\n')}
        </pre>
      )}
    </StrictMode>
  )

  // The published page ships prerendered markup; dev does not.
  if (root.firstChild) hydrateRoot(root, tree)
  else createRoot(root).render(tree)
}

void boot()
