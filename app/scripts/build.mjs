#!/usr/bin/env node
/**
 * Build one document.
 *
 *   node scripts/build.mjs <name> [--out <file>] [--standalone] [--keep]
 *
 *   <name> = a project    ->  project-docs/<name>/__external/  -> the living document
 *   <name> = brief        ->  daily-brief/__external/          -> the standalone brief
 *
 * The app is generic and lives at the repo root; a document owns exactly one
 * directory, and this is what puts the two together.
 *
 * There are two paths, chosen by `hasCustomCards`. A document whose external
 * directory is DATA ONLY is assembled straight from the bundles vendored under
 * its skill's `references/` — no npm, no vite, no node_modules — which is what
 * makes an unattended daily run cheap. A document that registers its own
 * preview cards is CODE, so it is copied to a scratch directory with its
 * external set swapped in, built there, and assembled against bundles that
 * actually contain those cards.
 *
 * The two surfaces do not share an assembler. The document's carries tabs,
 * cursors and a Today fragment; the brief's takes `#brief-data` alone and
 * refuses a `scope: project` payload, because under that scope the brief is not
 * a page at all — it is data returned to `project-doc` and rendered inside its
 * Today tab. So the surface decides the entry, the bundle and the assembler
 * together, and there is no build that mixes them.
 *
 * THE DOCUMENT DIRECTORY IS READ-ONLY HERE. The scratch copy is thrown away, so
 * anything written into it is lost — which is fine, because the two things a run
 * does write, `doc-state.json` and the published Artifact, are the RUN's job and
 * not this script's. It emits a file; delivering it is a step above.
 *
 * `node_modules` is borrowed from the app rather than installed, when it has
 * one: the scratch copy carries the same `package.json` and lockfile, so the
 * installed tree is already exactly right, and an install per build would be the
 * slowest step by an order of magnitude. A clone with nothing installed — a
 * cloud routine — falls back to `npm ci`.
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { APP, BRIEF, REPO, docDir } from './external-path.mjs'

/**
 * True when this document registers at least one preview card, which is the
 * only thing in an external directory that is CODE rather than data — and so
 * the only reason a build needs a toolchain at all.
 *
 * Comments are stripped before the match because an empty registry is often
 * written with a note inside it. The check fails SAFE: anything it cannot read
 * as empty builds from source, which is correct output either way, only slower.
 */
export function hasCustomCards(externalDir) {
  const file = join(externalDir, 'cards.tsx')
  if (!existsSync(file)) return false
  const source = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
  return !/export\s+const\s+cards\s*=\s*\{\s*\}\s*satisfies/.test(source)
}

// Imported by the test for `hasCustomCards`; only a direct run builds.
if (process.argv[1] === fileURLToPath(import.meta.url)) main()

function main() {
  const args = parse(process.argv.slice(2))
  const doc = args._[0]
  if (!doc) die('usage: build.mjs <project|brief> [--out <file>] [--standalone] [--keep]')

  const brief = doc === BRIEF
  const external = join(docDir(doc), '__external')
  if (!existsSync(external)) die(`no __external/ for "${doc}" at ${external}`)

  const out = resolve(args.out ?? join(REPO, '.ignored/build', doc, brief ? 'brief.html' : 'index.html'))
  mkdirSync(join(out, '..'), { recursive: true })

  const ctx = { args, doc, brief, external, out }
  if (!hasCustomCards(external)) return assembleVendored(ctx)

  const scratch = mkdtempSync(join(tmpdir(), `doc-${doc}-`))
  try {
    build({ ...ctx, scratch })
  } finally {
    if (args.keep) process.stderr.write(`build: kept ${scratch}\n`)
    else rmSync(scratch, { recursive: true, force: true })
  }
}

/**
 * The whole build, for a document whose external directory is data only.
 *
 * The bundles vendored under each skill's `references/` are built with no cards
 * registered (see `vendor.mjs`), so they render any such document exactly as a
 * from-source build would — without npm, vite or a node_modules. That is what
 * makes a daily routine cheap, and it is the common case: a document needs a
 * toolchain only to compile preview cards it wrote itself.
 */
function assembleVendored({ args, doc, brief, external, out }) {
  const scratch = mkdtempSync(join(tmpdir(), `doc-${doc}-`))
  try {
    const skill = brief ? 'daily-brief' : 'project-doc'
    const from = join(REPO, '.claude/skills', skill, 'references')
    const assembler = brief ? 'brief-assemble.mjs' : 'assemble.mjs'

    for (const name of ['app.js', 'app.css', 'prerender.mjs', 'mint-icons.mjs', assembler]) {
      cpSync(join(from, name), join(scratch, name))
    }

    run('node', [join(scratch, assembler), ...assembleArgs(scratch, { args, brief, external }), '--out', out], scratch)

    const kb = (readFileSync(out).length / 1024).toFixed(0)
    process.stderr.write(`build: ${doc} -> ${out} (${kb} kB, vendored — no cards to compile)\n`)
  } finally {
    if (args.keep) process.stderr.write(`build: kept ${scratch}\n`)
    else rmSync(scratch, { recursive: true, force: true })
  }
}

function build({ args, doc, brief, external, out, scratch }) {
  // {STAGE THE APP}
  // Everything the build reads, and nothing it produces. `fixtures/` comes
  // along because `main.tsx` reaches for the torture fixture in dev; the DEV
  // guard keeps it out of the bundle either way.
  for (const entry of ['src', 'scripts', 'fixtures', 'index.html', 'brief.html', 'vite.config.ts', 'tsconfig.json', 'package.json', 'package-lock.json']) {
    cpSync(join(APP, entry), join(scratch, entry), { recursive: true })
  }

  // {SWAP IN THE DOCUMENT}
  rmSync(join(scratch, 'src/__external'), { recursive: true, force: true })
  cpSync(external, join(scratch, 'src/__external'), { recursive: true })

  // {DEPENDENCIES}
  const installed = join(APP, 'node_modules')
  if (existsSync(installed)) symlinkSync(installed, join(scratch, 'node_modules'), 'dir')
  else run('npm', ['ci', '--no-audit', '--no-fund'], scratch)

  // {BUILD}
  // Two passes: the browser bundle that gets inlined into the page, and the
  // prerender bundle that renders the same components on node so the page has a
  // first paint and survives with JS off.
  const env = brief ? { BRIEF: '1' } : {}
  const vite = join(scratch, 'node_modules/.bin/vite')
  run(vite, ['build'], scratch, env)
  run(vite, ['build', '--ssr', brief ? 'src/brief-prerender.tsx' : 'src/prerender.tsx', '--outDir', 'dist-ssr'], scratch, env)

  // {ASSEMBLE}
  // An assembler reads its bundles from its OWN directory, so the freshly built
  // ones are staged beside a copy of it rather than left where vite put them.
  // The vendored copies under each skill's `references/` are untouched: this
  // build is this document's, and vendoring is a separate, deliberate act.
  const publish = join(scratch, 'publish')
  mkdirSync(publish)
  const dist = join(scratch, brief ? 'dist-brief' : 'dist')
  cpSync(join(dist, 'app.js'), join(publish, 'app.js'))
  cpSync(join(dist, 'app.css'), join(publish, 'app.css'))
  cpSync(join(scratch, 'dist-ssr/app.js'), join(publish, 'prerender.mjs'))
  cpSync(join(APP, 'src/lib/mint-icons.mjs'), join(publish, 'mint-icons.mjs'))

  const skill = brief ? 'daily-brief' : 'project-doc'
  const assembler = brief ? 'brief-assemble.mjs' : 'assemble.mjs'
  cpSync(join(REPO, '.claude/skills', skill, 'references', assembler), join(publish, assembler))

  run('node', [join(publish, assembler), ...assembleArgs(publish, { args, brief, external }), '--out', out], scratch)

  const kb = (readFileSync(out).length / 1024).toFixed(0)
  process.stderr.write(`build: ${doc} -> ${out} (${kb} kB)\n`)
}

function assembleArgs(publish, { args, brief, external }) {
  const file = (name) => join(external, name)
  const has = (name, as) => (existsSync(file(name)) ? [`--${as}`, file(name)] : [])
  // Artifact form by default — the runtime supplies the document skeleton.
  // `--standalone` wraps it so the file opens in a browser.
  const standalone = args.standalone ? ['--standalone'] : []

  if (!brief) {
    return [
      '--data', file('doc-data.json'),
      ...has('doc-previews.json', 'previews'), ...has('config.json', 'config'),
      ...has('doc-state.json', 'state'), ...has('doc-icons.json', 'icons'),
      ...has('brief-data.json', 'brief'),
      ...standalone,
    ]
  }

  // `brief-assemble.mjs` takes the allowlist as its own file and has no
  // `--config`, so the one the config carries is written out for it. The
  // document's assembler derives the same block from `--config` itself.
  //
  // Which is also why the empty case is warned about HERE for the brief: no
  // schema runs on this path and the assembler never sees the config, so this
  // is the last place that can tell. The document's assembler warns for itself.
  // An empty list is not an error either way — it renders a complete, valid,
  // entirely unlinked page, and publishes it with exit 0.
  const allowlist = join(publish, 'allowlist.json')
  const configFile = file('config.json')
  const config = existsSync(configFile) ? JSON.parse(readFileSync(configFile, 'utf8')) : {}
  const hosts = config.allowlist ?? []
  if (!hosts.length) {
    const why = existsSync(configFile) ? `no allowlist in ${configFile}` : `no ${configFile}`
    process.stderr.write(
      `build: WARNING — ${why}; every citation, source link and to-do href will render as plain text\n`,
    )
  }
  writeFileSync(allowlist, JSON.stringify(hosts))

  return [
    '--brief', file('brief-data.json'),
    ...has('config.json', 'config'),
    ...has('doc-previews.json', 'previews'), ...has('doc-icons.json', 'icons'),
    '--allowlist', allowlist,
    ...standalone,
  ]
}

function run(cmd, argv, cwd, env = {}) {
  execFileSync(cmd, argv, { cwd, stdio: 'inherit', env: { ...process.env, ...env } })
}

function parse(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--keep') args.keep = true
    else if (a === '--standalone') args.standalone = true
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
    else args._.push(a)
  }
  return args
}

function die(message) {
  process.stderr.write(`build: ${message}\n`)
  process.exit(2)
}
