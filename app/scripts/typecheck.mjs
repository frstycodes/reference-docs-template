/**
 * `npm run typecheck`, aimed at whichever project `PROJECT` names.
 *
 * A project's `cards.tsx` is real TypeScript that ships in the published
 * bundle, and the project directory has no toolchain of its own — this is the
 * only place its types get checked. Without the redirect a bare `tsc` would
 * happily check the reference set instead and report success for code it never
 * looked at.
 *
 * The generated config is a sibling of `tsconfig.json` rather than a temp file,
 * because `paths` and `include` resolve relative to the config's own directory.
 */

import { execFileSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { APP, REFERENCE_EXTERNAL, externalPath } from './external-path.mjs'

const external = externalPath()
const generated = join(APP, 'tsconfig.project.json')

if (external === REFERENCE_EXTERNAL) {
  run(join(APP, 'tsconfig.json'))
} else {
  // Posix separators, and explicitly relative: TypeScript 7 removed `baseUrl`
  // and rejects a bare path.
  const rel = `./${relative(APP, external).split(/[\\/]/).join('/')}`
  writeFileSync(generated, JSON.stringify({
    extends: './tsconfig.json',
    compilerOptions: { paths: { '@app/*': ['./src/*'], '@external/*': [`${rel}/*`] } },
    include: ['src', 'vite.config.ts', `${rel}/**/*`],
  }, null, 2))
  try {
    run(generated)
  } finally {
    rmSync(generated, { force: true })
  }
}

function run(config) {
  execFileSync(join(APP, 'node_modules/.bin/tsc'), ['--noEmit', '-p', config], { stdio: 'inherit' })
}
