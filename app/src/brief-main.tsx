/**
 * Browser entry for the standalone brief. Same shape as `main.tsx`: the
 * published Artifact hydrates prerendered markup and reads `#brief-data` from
 * an inline JSON block; dev reads the same data out of `@external`.
 *
 * There is one standalone brief and it spans every project, so its external
 * directory is `daily-brief/__external/` rather than one project's — select it
 * with `DOC=brief`. Under any other `DOC` this page renders that document's
 * Today fragment instead, which is the same components against `scope:
 * project` data and is how that fragment gets designed in isolation.
 *
 * The stylesheet order is the one the skill has always assembled in — fonts,
 * token layer, citation layer, then the document grammar. `doc-components.css`
 * is here even though the brief has no tabs or dial, because the citation
 * hover card is built from it and the brief cites as heavily as the document
 * does.
 */
import './styles/fonts.css'
import './styles/shell.css'
import './styles/cite.css'
import './styles/doc-components.css'
import './styles/preview-card.css'

import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { BriefApp } from './BriefApp.tsx'
import { devExternal } from './dev-external.ts'
import type { DisplayConfig } from './schema/doc-config.ts'
import { readPreviews } from './schema/doc-previews.ts'
import { BriefData } from './schema/brief-data.ts'

function inline(id: string): unknown {
  const el = document.getElementById(id)
  if (!el?.textContent) return undefined
  try {
    return JSON.parse(el.textContent)
  } catch {
    return undefined
  }
}

/** This surface's own data file, in dev only. Everything both surfaces share is
 *  in `devExternal`. */
async function devBrief(): Promise<unknown> {
  if (!import.meta.env.DEV) return undefined
  return (await import('@external/brief-data.json')).default
}

async function boot() {
  const [dev, briefData] = await Promise.all([devExternal(), devBrief()])

  const parsed = BriefData.safeParse(inline('brief-data') ?? briefData)
  const previews = readPreviews(inline('doc-previews') ?? dev?.previews)
  // The published page carries its own `#doc-allowlist`; in dev the config is
  // the only copy, and `brief-assemble.mjs` derives that block from it anyway.
  const allowlist = (inline('doc-allowlist') as string[]) ?? dev?.config.allowlist ?? []
  const avatars = (inline('doc-avatars') as Record<string, string>) ?? {}
  const icons = document.getElementById('doc-icons')?.textContent ?? dev?.icons
  const root = document.getElementById('root')!

  const tree = (
    <StrictMode>
      {parsed.success ? (
        <BriefApp
          brief={parsed.data} allowlist={allowlist} previews={previews}
          avatars={avatars} icons={icons}
          config={(inline('doc-config') as DisplayConfig) ?? dev?.config}
        />
      ) : (
        <pre style={{ padding: '2rem', font: '13px/1.6 var(--mono)', color: 'var(--alert)' }}>
          {parsed.error.issues.map((i) => `#brief-data ${i.path.join('.')}: ${i.message}`).join('\n')}
        </pre>
      )}
    </StrictMode>
  )

  if (root.firstChild) hydrateRoot(root, tree)
  else createRoot(root).render(tree)
}

void boot()
