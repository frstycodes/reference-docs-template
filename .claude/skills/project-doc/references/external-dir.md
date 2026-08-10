# The external directory — what a document is made of

A document owns exactly one directory. Everything else — the app, the
components, the schemas — is shared and replaced wholesale on update. So this is
the entire authoring surface, and nothing outside it is document-specific.

## The files

| File | Required | Validated by | What it is |
|---|---|---|---|
| `doc-data.json` | living document | `app/src/schema/` | Every section, every event. The content. |
| `brief-data.json` | brief; optional in a document | `app/src/schema/` | The Today tab as data, or the standalone brief. |
| `config.json` | yes | `app/src/schema/` | Sources, scope, who "you" is, and `allowlist` — the hosts a citation URL must match to become a link. |
| `doc-state.json` | living document | `app/src/schema/` | Cursors, `lastRun`, `lastDaily`, `artifactUrl`. The only file a refresh must write. |
| `doc-previews.json` | no | `app/src/schema/` | Payloads behind the citation hover cards. |
| `doc-icons.json` | no | `app/src/lib/mint-icons.mjs` | Marks minted for sources with no built-in icon. Sanitised by allowlist before render. |
| `avatars.json` | no | — | Base64 avatars keyed by display name, so a face is fetched once and reused. |
| `cards.tsx` | no | vite + `tsc` | This document's own preview cards. **The only file here that is code.** |
| `memory/` | no | — | **Standalone brief only** (`daily-brief/__external/memory/`). What the brief learned about this reader's work. Read by `daily-brief`, never by the build. |

## Read the example, do not invent one

`app/src/__external/` is a complete, working instance of every file above. It is
what `npm run dev` serves and what the test suite validates, so it cannot drift
from what the app actually accepts. Copy it and replace the contents; do not
write these files from a description.

## `cards.tsx`

Optional, and usually absent. A source with no built-in card already renders:
its citation carries `rows`, and the built-in `custom` card lays them out as a
definition list. Register a component only when the shape of the thing carries
meaning that rows flatten — a deploy's state, an incident's severity.

```tsx
import { CardTop, CardSource, CardTitle, type CardProps, type CardRegistry } from '@app/cards.ts'

export const cards = {
  vercel: VercelDeploy,
} satisfies CardRegistry

function VercelDeploy({ entry }: CardProps) { /* … */ }
```

The registry goes first — function declarations hoist, so the export a reader
came for is the first thing on the page. Compose from `@app/cards.ts`: those are
the same bands the built-in cards are made of, so a card written here cannot
drift from the rest of the document and no class name is ever typed by hand.
Nothing in a card is clickable; it is a tooltip, not a destination.

Lookup order is `preview.source` lowercased, then the citation kind — the first
is how one `custom` kind covers many sources, the second lets a document replace
a built-in card outright.

**Registering even one card changes how the document builds.** An empty registry
assembles from the vendored bundles with no toolchain; a populated one is
compiled with vite, which needs `npm --prefix app ci` to have run. Typecheck it
before publishing:

```bash
cd app && DOC=<name> npm run typecheck
```
