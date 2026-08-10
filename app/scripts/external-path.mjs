/**
 * Where `@external` points.
 *
 * The app is generic and lives at the repo root, shared by both skills that
 * render with it. Everything contextual — the data, the avatars, the minted
 * marks, the custom preview cards — lives in one `__external/` directory per
 * DOCUMENT, and this resolves which one.
 *
 *   DOC unset      the reference set in `app/src/__external/`
 *   DOC=<name>     `project-docs/<name>/__external/`
 *   DOC=brief      `daily-brief/__external/`
 *
 * There is only ever one standalone brief — it spans every project rather than
 * belonging to one — so it gets a name rather than a directory to be one of.
 *
 * The reference set is a complete, working external directory that `npm run
 * dev` boots against with nothing selected. It is what a new document copies,
 * and because dev renders it every day it cannot rot into a shape the app no
 * longer accepts.
 *
 * One resolver, three consumers — `vite.config.ts`, `typecheck.mjs` and
 * `build.mjs` — so the dev server, the type checker and the publish build can
 * never disagree about which directory they are looking at.
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const APP = dirname(dirname(fileURLToPath(import.meta.url)))
export const REPO = dirname(APP)

export const REFERENCE_EXTERNAL = resolve(APP, 'src/__external')

/** The standalone brief, by the name that selects it. */
export const BRIEF = 'brief'

export function docDir(doc) {
  return doc === BRIEF ? resolve(REPO, 'daily-brief') : resolve(REPO, 'project-docs', doc)
}

/** @param {string | undefined} doc */
export function externalPath(doc = process.env.DOC) {
  if (!doc) return REFERENCE_EXTERNAL
  const dir = resolve(docDir(doc), '__external')
  if (!existsSync(dir)) {
    throw new Error(`DOC=${doc} has no __external/ at ${dir} — copy ${REFERENCE_EXTERNAL} there and fill it in`)
  }
  return dir
}
