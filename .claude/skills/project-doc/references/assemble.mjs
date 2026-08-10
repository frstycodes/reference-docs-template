#!/usr/bin/env node
/* project-doc assembler — LOCKED.
   Data in, one publishable file out. Runs on bare node with nothing installed:
   the refresh loop clones fresh in a cloud routine, so a step that needed an
   npm install would be a step that does not run.

   Everything it needs sits beside it, vendored from the app build:
     prerender.mjs   the components, bundled for node (react + zod inlined)
     app.js          the browser bundle, inlined into the page
     app.css         the token layer, citation layer, grammar and fonts
     mint-icons.mjs  the sanitiser for source marks minted at init

   The pipeline, in order:
     read -> validate -> prerender -> assemble -> write
   A document that does not validate is never written. "Not clean, do not
   publish" is enforced here rather than remembered: rollback is simply the
   absence of a new file, so the last good Artifact stays live and its cursors
   are untouched.

   Usage:
     node assemble.mjs --data doc-data.json [options] --out index.html

     --data <f>        #doc-data (required)
     --previews <f>    #doc-previews          default {}
     --config <f>      #doc-config            default {}
     --brief <f>       #brief-data (the Today tab)  default: no Today tab
     --allowlist <f>   #doc-allowlist         default [] (or config.allowlist)
     --icons <f>       doc-icons.json         default: built-in marks only
     --state <f>       #doc-state             default a fresh state block
     --out <f>         where to write         default stdout
     --standalone      wrap in a full HTML document for local viewing
     --quiet           suppress the report on stderr

   Output is the ARTIFACT FORM by default: a <title>, the styles, the body and
   the inline JSON, with no <!doctype>, <html>, <head> or <body> of its own,
   because the Artifact runtime supplies that skeleton at publish time. Pass
   --standalone to get a complete document you can open in a browser. */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mintIcons } from './mint-icons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOC_FORMAT = 4

// {ARGS}
function parseArgs(argv) {
  const args = { standalone: false, quiet: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--standalone') args.standalone = true
    else if (a === '--quiet') args.quiet = true
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
    else die(`unexpected argument "${a}"`)
  }
  return args
}

function die(message) {
  process.stderr.write(`assemble: ${message}\n`)
  process.exit(2)
}

function readJson(path, fallback) {
  if (!path) return fallback
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'))
  } catch (e) {
    die(`could not read ${path} — ${e.message}`)
  }
}

function readAsset(name) {
  try {
    return readFileSync(join(HERE, name), 'utf8')
  } catch {
    die(`missing vendored asset "${name}" beside assemble.mjs. ` +
      `Run \`npm run vendor\` in the app to rebuild it.`)
  }
}

// {EMBEDDING}
// JSON inside a <script> ends early if it contains "</script". Escaping every
// "<" as < is still valid JSON, parses identically, and cannot terminate
// the element — safer than special-casing the one sequence.
function embedJson(id, value) {
  const json = JSON.stringify(value ?? null).replace(/</g, '\\u003c')
  return `<script type="application/json" id="${id}">${json}</script>`
}

// A <script> body cannot contain "</script" either, and the bundle may hold it
// inside a string literal.
function embedScript(code) {
  return `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`
}

// {AVATARS}
// The Artifact's CSP blocks external images, so a remote avatar URL is a
// request the browser attempts, fails, and falls back from — the same monogram
// the reader would have seen anyway, plus a failed request and a referrer.
// Anything not already inline is removed here, offline, so a document can never
// ship one by accident. Putting the real face on the card is
// `scripts/inline-avatars.mjs`, which needs the network and runs on a dev
// machine; this is only the guarantee.
const AVATAR_KEY = /avatar/i

// Hoist every distinct picture into one block and leave `avatar:<id>` behind.
// A real document cites the same nine people eighty times; a picture per
// reference stored 273 kB of what is 38 kB of images. Authoring is unaffected —
// data URIs are written plainly and deduplicated here, at publish.
function hoistAvatars(node, store, seen) {
  if (Array.isArray(node)) {
    for (const item of node) hoistAvatars(item, store, seen)
    return
  }
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node)) {
    // `src` alone is too broad — the brief's hero painting is a `src` too, and
    // it is one image with nothing to deduplicate. A PERSON is the thing worth
    // hoisting, and a person is the shape that carries an `initial`.
    const isPersonSrc = k === 'src' && typeof node.initial === 'string'
    if ((AVATAR_KEY.test(k) || isPersonSrc) && typeof v === 'string' && v.startsWith('data:')) {
      let id = seen.get(v)
      if (!id) {
        // FNV-1a over the bytes: stable across builds, so an unchanged face
        // keeps its id and the published file diffs cleanly.
        let h = 2166136261
        for (let i = 0; i < v.length; i++) {
          h ^= v.charCodeAt(i)
          h = Math.imul(h, 16777619) >>> 0
        }
        id = h.toString(36)
        seen.set(v, id)
        store[id] = v
      }
      node[k] = `avatar:${id}`
    } else {
      hoistAvatars(v, store, seen)
    }
  }
}
function stripRemoteAvatars(node, report) {
  if (Array.isArray(node)) {
    for (const item of node) stripRemoteAvatars(item, report)
    return
  }
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node)) {
    if (AVATAR_KEY.test(k) && typeof v === 'string') {
      if (!v.startsWith('data:')) {
        delete node[k]
        report.stripped++
      } else {
        report.inline++
      }
    } else {
      stripRemoteAvatars(v, report)
    }
  }
}

function escapeText(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// {MAIN}
const args = parseArgs(process.argv.slice(2))
if (!args.data) die('--data is required')

const data = readJson(args.data)
const previews = readJson(args.previews, {})
const config = readJson(args.config, {})
const state = readJson(args.state, {})
const brief = args.brief ? readJson(args.brief) : undefined
const allowlist = readJson(args.allowlist, config.allowlist ?? [])
const iconsJson = readJson(args.icons, {})

const avatars = { inline: 0, stripped: 0 }
stripRemoteAvatars(previews, avatars)
stripRemoteAvatars(brief, avatars)

const avatarStore = {}
const seenAvatars = new Map()
hoistAvatars(previews, avatarStore, seenAvatars)
hoistAvatars(brief, avatarStore, seenAvatars)
if (avatars.stripped && !args.quiet) {
  process.stderr.write(
    `assemble: ${avatars.stripped} remote avatar(s) removed — the CSP would have ` +
    `blocked them. Run \`node app/scripts/inline-avatars.mjs\` to embed them instead.\n`,
  )
}

// {ICONS}
// Marks for sources with no built-in symbol, fetched at init from the source's
// own site and stored in the project's directory. Foreign markup, so it is
// sanitised HERE — offline, against an allowlist — and a mark that cannot be
// made safe is dropped rather than repaired. See mint-icons.mjs.
const iconWarns = []
const { markup: iconMarkup, ids: iconIds } = mintIcons(iconsJson, (m) => iconWarns.push(m))

// An icon id that resolves to nothing renders as empty space with no error
// anywhere — the exact failure `icons.test.ts` guards the built-ins against.
// The built-in ids are not knowable here (they live inside the bundle), so
// this checks only what this file is responsible for: every `icon` the data
// names with a minted-looking id must be one that actually survived.
const missingIcons = new Set()
function checkIcons(node) {
  if (Array.isArray(node)) return node.forEach(checkIcons)
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node)) {
    if (k === 'icon' && typeof v === 'string' && v in iconsJson && !iconIds.has(v)) missingIcons.add(v)
    else checkIcons(v)
  }
}
checkIcons(data)
checkIcons(previews)
checkIcons(brief)

const { prerender } = await import(join(HERE, 'prerender.mjs'))
const { html, errors, warns } = prerender({
  data, previews, allowlist, config, brief, avatars: avatarStore, icons: iconMarkup,
})

if (errors.length) {
  process.stderr.write(`assemble: ${errors.length} error(s) — nothing written.\n`)
  for (const e of errors) process.stderr.write(`  ${e}\n`)
  process.exit(1)
}
const allWarns = [
  ...warns,
  ...iconWarns,
  // `--allowlist` is optional and falls back to the config's, so a config
  // without one yields []. That is not an error: it renders a complete, valid
  // document in which nothing is a link, and writes it with exit 0.
  ...(allowlist.length ? [] : ['the allowlist is empty — every citation in this document will render as plain text']),
  ...[...missingIcons].map((i) => `cite icon "${i}" was rejected by the sanitiser — that chip falls back to its kind's mark`),
]
if (allWarns.length && !args.quiet) {
  process.stderr.write(`assemble: ${allWarns.length} warning(s)\n`)
  for (const w of allWarns) process.stderr.write(`  ${w}\n`)
}

const css = readAsset('app.css')
const js = readAsset('app.js')

// The state block carries the format so a later run can tell what it is
// looking at; everything else in it belongs to the caller.
const stateOut = { format: DOC_FORMAT, ...state }

const title = escapeText(config.tagline || data?.meta?.tagline || 'The living document')

const parts = [
  `<title>${title}</title>`,
  // The no-JS nav must not flash before the app boots.
  `<script>document.documentElement.classList.add('js')</script>`,
  `<style>${css}</style>`,
  `<div id="root">${html}</div>`,
  embedJson('doc-data', data),
  embedJson('doc-state', stateOut),
  embedJson('doc-config', config),
  embedJson('doc-allowlist', allowlist),
  embedJson('doc-previews', previews),
  ...(brief ? [embedJson('brief-data', brief)] : []),
  ...(seenAvatars.size ? [embedJson('doc-avatars', avatarStore)] : []),
  // Sanitised markup, carried as TEXT in a non-executing script block rather
  // than pasted into the body — so the page source shows plainly what was
  // added, and the app inlines it from one place.
  ...(iconMarkup ? [`<script type="text/plain" id="doc-icons">${iconMarkup.replace(/<\/script/gi, '<\\/script')}</script>`] : []),
  embedScript(js),
]

const body = parts.join('\n')
const out = args.standalone
  ? `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">\n${body}\n</html>`
  : body

if (args.out) {
  writeFileSync(resolve(args.out), out)
  if (!args.quiet) {
    const kb = (n) => `${(n / 1024).toFixed(1)} kB`
    process.stderr.write(
      `assemble: wrote ${args.out} — ${kb(out.length)} ` +
      `(css ${kb(css.length)}, js ${kb(js.length)}, body ${kb(html.length)}, ` +
      `${avatars.inline} avatar ref(s) over ${seenAvatars.size} distinct image(s))\n`,
    )
    if (out.length > 16 * 1024 * 1024) {
      process.stderr.write('assemble: WARNING over the 16 MB Artifact limit\n')
    }
  }
} else {
  process.stdout.write(out)
}

// Exit explicitly. Prerendering mounts a QueryClient, whose cache keeps garbage
// collection timers alive, so the event loop would never drain and the run
// would hang after doing all its work — a build step must terminate.
process.exit(0)
