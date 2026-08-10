#!/usr/bin/env node
/* daily-brief assembler — LOCKED.
   `#brief-data` in, one publishable page out. Runs on bare node with nothing
   installed: the morning routine clones fresh in the cloud, so a step that
   needed an npm install would be a step that does not run.

   Everything it needs sits beside it, vendored from `app/` — which
   is where the components live now. This skill owns the SPEC (components.md,
   voice.md) and the editorial judgement; it no longer owns the renderer.
     prerender.mjs   the brief components, bundled for node (react + zod inlined)
     app.js          the browser bundle, inlined into the page
     app.css         the token layer, citation layer, grammar and fonts
     mint-icons.mjs  the sanitiser for source marks minted at init

   The pipeline, in order:
     read -> validate -> prerender -> assemble -> write
   A brief that does not validate is never written. That is the rollback: the
   absence of a new file leaves yesterday's Artifact live, which is a day out
   of date but is at least a brief. There is nothing else to roll back to — the
   brief is a snapshot, and tomorrow's run overwrites today's.

   Usage:
     node brief-assemble.mjs --brief brief-data.json --out brief.html

     --brief <f>       #brief-data, scope "all" (required)
     --previews <f>    #doc-previews          default {}
     --config <f>      config.json — PRUNED to #doc-config, see below
     --allowlist <f>   #doc-allowlist         default []
     --icons <f>       doc-icons.json         default: built-in marks only
     --out <f>         where to write         default stdout
     --standalone      wrap in a full HTML document for local viewing
     --quiet           suppress the report on stderr

   Output is the ARTIFACT FORM by default: a <title>, the styles, the body and
   the inline JSON, with no <!doctype>, <html>, <head> or <body> of its own,
   because the Artifact runtime supplies that skeleton at publish time. Pass
   --standalone to get a complete document you can open in a browser.

   Under `scope: project` there is nothing to assemble: the brief is returned to
   `project-doc` as data and rendered inside its Today tab. Handing this script
   a "project" payload is an error, not a page. */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mintIcons } from './mint-icons.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

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
  process.stderr.write(`brief-assemble: ${message}\n`)
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
    die(`missing vendored asset "${name}" beside brief-assemble.mjs. ` +
      `Run \`npm run vendor\` in app/ to rebuild it.`)
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

function embedScript(code) {
  return `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`
}

// {AVATARS}
// The Artifact's CSP blocks external images, so a remote avatar URL is a
// request the browser attempts, fails, and falls back from — the same monogram
// the reader would have seen anyway, plus a failed request and a referrer.
// Anything not already inline is removed here, offline, so a brief can never
// ship one by accident. Fetching the real faces is step 3 of the build order,
// which needs the network; this is only the guarantee.
const AVATAR_KEY = /avatar/i

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

// Hoist every distinct face into one block and leave `avatar:<id>` behind. A
// brief cites the same handful of people across every section; a picture per
// reference stores the same bytes many times over. Authoring is unaffected —
// data URIs are written plainly and deduplicated here, at publish.
function hoistAvatars(node, store, seen) {
  if (Array.isArray(node)) {
    for (const item of node) hoistAvatars(item, store, seen)
    return
  }
  if (!node || typeof node !== 'object') return
  for (const [k, v] of Object.entries(node)) {
    // `src` alone is too broad — the hero painting is a `src` too, and it is
    // one image with nothing to deduplicate. A PERSON is the thing worth
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

function escapeText(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Three values, and never the whole config.
 *
 * A hover card reads exactly `timezone`, `locale` and the tracker's vendor —
 * without them it formats dates in the VIEWER's zone, which for a page about
 * one specific day is the wrong day, and it guesses the tracker's mark from the
 * shape of an id, which renders a Linear shop's brief in Pact icons.
 *
 * Everything else in a brief config stays out of the page, and this prunes by
 * ALLOWLIST rather than by deleting known-sensitive keys so a key added later
 * is excluded by default. `notify.target` and `you.name` are the two that must
 * never ship; the document's assembler embeds `#doc-config` whole, which is
 * safe there only because a document's config is written for that page.
 */
function pruneConfig({ timezone, locale, sources }) {
  const tracker = sources?.tracker ?? sources?.pact
  return {
    ...(timezone ? { timezone } : {}),
    ...(locale ? { locale } : {}),
    ...(tracker ? { sources: { tracker } } : {}),
  }
}

// {MAIN}
const args = parseArgs(process.argv.slice(2))
if (!args.brief) die('--brief is required')

const brief = readJson(args.brief)
const previews = readJson(args.previews, {})
const allowlist = readJson(args.allowlist, [])
const config = pruneConfig(readJson(args.config, {}))
const iconsJson = readJson(args.icons, {})

const avatars = { inline: 0, stripped: 0 }
stripRemoteAvatars(brief, avatars)
stripRemoteAvatars(previews, avatars)

const avatarStore = {}
const seenAvatars = new Map()
hoistAvatars(brief, avatarStore, seenAvatars)
hoistAvatars(previews, avatarStore, seenAvatars)
if (avatars.stripped && !args.quiet) {
  process.stderr.write(
    `brief-assemble: ${avatars.stripped} remote avatar(s) removed — the CSP would have ` +
    `blocked them. Step 3 of the build order fetches and embeds them instead.\n`,
  )
}

// {ICONS}
// Marks for sources with no built-in symbol. Foreign markup, sanitised here —
// offline, against an allowlist — and dropped rather than repaired when it
// cannot be made safe. See mint-icons.mjs, which project-doc owns and this
// skill vendors alongside the bundles.
const iconWarns = []
const { markup: iconMarkup } = mintIcons(iconsJson, (m) => iconWarns.push(m))

const { prerenderBrief } = await import(join(HERE, 'prerender.mjs'))
const { html, errors, warns } = prerenderBrief({
  brief, previews, allowlist, config, avatars: avatarStore, icons: iconMarkup,
})

if (errors.length) {
  process.stderr.write(`brief-assemble: ${errors.length} error(s) — nothing written.\n`)
  for (const e of errors) process.stderr.write(`  ${e}\n`)
  process.exit(1)
}
const allWarns = [...warns, ...iconWarns]
if (allWarns.length && !args.quiet) {
  process.stderr.write(`brief-assemble: ${allWarns.length} warning(s)\n`)
  for (const w of allWarns) process.stderr.write(`  ${w}\n`)
}

const css = readAsset('app.css')
const js = readAsset('app.js')

// "The Friday Brief" — the same title the hero carries.
const title = escapeText(`The ${brief?.meta?.weekday ?? 'Daily'} Brief`)

const parts = [
  `<title>${title}</title>`,
  `<script>document.documentElement.classList.add('js')</script>`,
  `<style>${css}</style>`,
  `<div id="root">${html}</div>`,
  embedJson('brief-data', brief),
  embedJson('doc-allowlist', allowlist),
  embedJson('doc-previews', previews),
  ...(Object.keys(config).length ? [embedJson('doc-config', config)] : []),
  ...(seenAvatars.size ? [embedJson('doc-avatars', avatarStore)] : []),
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
      `brief-assemble: wrote ${args.out} — ${kb(out.length)} ` +
      `(css ${kb(css.length)}, js ${kb(js.length)}, body ${kb(html.length)}, ` +
      `${avatars.inline} avatar ref(s) over ${seenAvatars.size} distinct image(s))\n`,
    )
    if (out.length > 16 * 1024 * 1024) {
      process.stderr.write('brief-assemble: WARNING over the 16 MB Artifact limit\n')
    }
  }
} else {
  process.stdout.write(out)
}

// Exit explicitly. The components mount timers whose handles keep the event
// loop alive, so the run would hang after doing all its work — a build step
// must terminate.
process.exit(0)
