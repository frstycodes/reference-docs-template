#!/usr/bin/env node
/**
 * Pull the skills and the app from the template this repo was created from.
 *
 *   node scripts/update.mjs [--from <git-url-or-local-path>]
 *
 * An update is a REPLACEMENT, not a merge. That is only safe because a document
 * owns exactly one directory — `<doc>/__external/` — and the app owns
 * everything else, so there is no file both sides could have edited. Widening
 * REPLACED to a path a document writes into would turn every update into
 * silent data loss.
 *
 * Replacing `app/` deletes `app/node_modules` with it, so `npm --prefix app ci`
 * is unconditional after every update — not "only if package.json changed".
 *
 * `cpSync`/`rmSync` rather than rsync: a cloud routine's image is not
 * guaranteed to carry it, and node already does this.
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const REPLACED = ['.claude/skills', 'app']

const DEFAULT_UPSTREAM = 'https://github.com/frstycodes/reference-docs-template.git'

export function update(repo, upstream) {
  // Check every source before touching anything: REPLACED is deleted in order,
  // so a per-path check could delete .claude/skills and then throw on a
  // missing app/, leaving the repo with neither the old app nor a new one.
  for (const path of REPLACED) {
    if (!existsSync(join(upstream, path))) {
      throw new Error(`update: upstream has no ${path} at ${join(upstream, path)}`)
    }
  }
  for (const path of REPLACED) {
    rmSync(join(repo, path), { recursive: true, force: true })
    cpSync(join(upstream, path), join(repo, path), { recursive: true })
  }
  // Written, never copied: it records when THIS repo took an update, which the
  // template cannot know.
  writeFileSync(join(repo, '.template-version'), `${new Date().toISOString()}\n`)
  return REPLACED
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const flag = process.argv.indexOf('--from')
  if (flag !== -1 && process.argv[flag + 1] === undefined) {
    throw new Error('update: --from requires a value')
  }
  const from = flag === -1 ? DEFAULT_UPSTREAM : process.argv[flag + 1]

  const scratch = mkdtempSync(join(tmpdir(), 'template-'))
  try {
    let source = from
    if (/^(https?:|git@)/.test(from)) {
      execFileSync('git', ['clone', '--depth', '1', from, scratch], { stdio: 'inherit' })
      source = scratch
    }
    for (const path of update(process.cwd(), source)) {
      process.stderr.write(`update: replaced ${path}\n`)
    }
    process.stderr.write('update: now run `npm --prefix app ci` — replacing app/ deleted app/node_modules\n')
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}
