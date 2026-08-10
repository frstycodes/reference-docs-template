#!/usr/bin/env node
/**
 * Copies the built app into the skills, where the assemblers read it.
 *
 * The app is BUILT here, on a machine with a toolchain, and VENDORED as plain
 * files an assembler can use without one. Rebuilding these is the "re-shell"
 * operation — its own named run, on a skill version bump.
 *
 * `build.mjs` DOES NOT USE THESE. A document owns an `__external/` directory
 * that can carry its own components, so it is built from source per document
 * and assembled against bundles that were built with those components in them
 * — a bundle vendored here could not contain code that did not exist when it
 * was built. What these are for is invoking an assembler DIRECTLY, the way each
 * SKILL.md documents, on a machine with no toolchain. That path renders a
 * document without its own cards, which is correct for every document that has
 * none and wrong for one that does.
 *
 * This vendors into TWO skills. `daily-brief` used to own the
 * shell and `project-doc` inlined its CSS and citation layer; the components
 * live here now, so the brief is built from this app and copied next door.
 * `daily-brief/references/components.md` stays the spec for what each part IS
 * — it is no longer what renders it.
 *
 * The single-file promise is asserted rather than assumed. `codeSplitting:
 * false` is set in vite.config.ts through a spread, because Vite 8.2.1 omits it
 * from its own types — so this checks the actual output instead of trusting the
 * option took.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { APP, REPO } from './external-path.mjs'

const SKILLS = join(REPO, '.claude', 'skills')
const REFERENCES = join(SKILLS, 'project-doc', 'references')
const BRIEF_REFERENCES = join(SKILLS, 'daily-brief', 'references')

function fail(message) {
  process.stderr.write(`vendor: ${message}\n`)
  process.exit(1)
}

function only(dir, predicate, what) {
  let entries
  try {
    entries = readdirSync(join(APP, dir)).filter(predicate)
  } catch {
    fail(`${dir}/ is missing — run \`npm run build\` and \`npm run build:ssr\` first`)
  }
  if (entries.length !== 1) {
    fail(`expected exactly one ${what} in ${dir}/, found ${entries.length}: ${entries.join(', ')}. ` +
      `A second chunk cannot be published — there is nowhere to serve it from.`)
  }
  return join(APP, dir, entries[0])
}

// mint-icons.mjs is SOURCE, not a build artifact. It lives in the app because
// three things import it — the app itself, `assemble.mjs` and
// `brief-assemble.mjs` — and it is copied out to both. One sanitiser, three
// consumers: a second copy is a second thing to get right, and this one is a
// security boundary.
const SANITISER = join(APP, 'src/lib/mint-icons.mjs')

// The neutral-cards alias is set by the `vendor` npm script, not here, because
// it has to be in effect during the four vite builds that ran before this. If
// it was missed, the bundles carry the reference set's card and every document
// rendered from them inherits it — so this refuses to vendor rather than
// shipping that.
function assertNeutral(bundle) {
  if (!readFileSync(bundle, 'utf8').includes('Vercel')) return
  fail(`${bundle} carries the reference set's Vercel card — run \`npm run vendor\`, ` +
    `which sets NEUTRAL_CARDS=1, rather than the four build scripts by hand`)
}

const sources = [
  // project-doc — the living document.
  [only('dist', (f) => f.endsWith('.js'), 'JS bundle'), REFERENCES, 'app.js'],
  [only('dist', (f) => f.endsWith('.css'), 'stylesheet'), REFERENCES, 'app.css'],
  [only('dist-ssr', (f) => f.endsWith('.js'), 'prerender bundle'), REFERENCES, 'prerender.mjs'],
  // daily-brief — the standalone morning page. Its own bundles rather than the
  // document's: the brief needs neither the layouts nor the panel machinery,
  // and the whole point of a separate entry is not to ship them.
  [only('dist-brief', (f) => f.endsWith('.js'), 'brief JS bundle'), BRIEF_REFERENCES, 'app.js'],
  [only('dist-brief', (f) => f.endsWith('.css'), 'brief stylesheet'), BRIEF_REFERENCES, 'app.css'],
  [only('dist-brief-ssr', (f) => f.endsWith('.js'), 'brief prerender bundle'), BRIEF_REFERENCES, 'prerender.mjs'],
]

for (const dir of [REFERENCES, BRIEF_REFERENCES]) {
  sources.push([SANITISER, dir, 'mint-icons.mjs'])
}

assertNeutral(sources[0][0])
assertNeutral(sources[3][0])

const kb = (n) => `${(n / 1024).toFixed(1)} kB`
for (const [from, dir, name] of sources) {
  mkdirSync(dir, { recursive: true })
  copyFileSync(from, join(dir, name))
  const skill = dir.split('/').slice(-2)[0]
  process.stderr.write(`vendor: ${`${skill}/${name}`.padEnd(28)} ${kb(statSync(from).size)}\n`)
}
