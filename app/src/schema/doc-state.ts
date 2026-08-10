/**
 * `#doc-state` — cursors and where the document lives. Not content; this is
 * what lets the next run continue without a database.
 *
 * Cursors are deliberately open: `references/source-contract.md` lets any
 * connected tool register as a source with its own cursor shape, so the record
 * is keyed by source id and its values stay `unknown`. Only the fields the
 * publish loop itself reads are typed.
 */

import { z } from 'zod'

/** Bumped from 3 when the React app replaced the node renderer. */
export const DOC_FORMAT = 4

export const DocState = z.object({
  format: z.number().int().optional(),
  lastRun: z.string(),
  /** When the daily tier last ran, so a cheap run knows to skip it. */
  lastDaily: z.string().optional(),
  /** Absent on a first publish; written back once the URL is minted. */
  artifactUrl: z.string().optional(),
  archiveArtifactUrl: z.string().optional(),
  /** Per-source "everything up to here is already in the document". */
  cursors: z.record(z.string(), z.unknown()).default({}),
})
export type DocState = z.infer<typeof DocState>
