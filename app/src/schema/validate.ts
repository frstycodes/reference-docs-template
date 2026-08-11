/**
 * The publish gate. Zod covers shape; this covers the cross-references it
 * cannot express — a gantt bar pointing at a real lane item, a citation that
 * promises a preview payload, exactly one changelog run marked latest.
 *
 * Ported from the locked `references/doc-data-check.mjs`, which this replaces.
 * Pure and dependency-light so `assemble.mjs` can run it on plain node with
 * nothing installed.
 */

import { DocData, type SectionNode, type Cite } from './doc-data.ts'
import { previewFor, type PreviewEntry } from './doc-previews.ts'

export interface ValidationReport {
  ok: boolean
  errors: string[]
  warns: string[]
  /** Present only when the shape parsed. */
  data?: DocData
}

type Previews = Record<string, PreviewEntry>

function citesOf(section: SectionNode): Cite[] {
  const out: Cite[] = []
  const take = (c?: Cite[]) => { if (c) out.push(...c) }
  switch (section.layout) {
    case 'timeline': section.blocks.forEach((e) => take(e.cites)); break
    case 'state': section.blocks.forEach((g) => g.rows.forEach((r) => take(r.cites))); break
    case 'lane': section.blocks.forEach((i) => take(i.cites)); break
    case 'ask': [...section.blocks.open, ...section.blocks.done].forEach((q) => take(q.cites)); break
    case 'goal': section.blocks.shifts.forEach((s) => take(s.cites)); break
    case 'whatsnew':
      section.blocks.runs.forEach((r) => r.bullets.forEach((b) => take(b.cites)))
      break
  }
  return out
}

export function validate(raw: unknown, previews: Previews = {}): ValidationReport {
  const errors: string[] = []
  const warns: string[] = []

  const parsed = DocData.safeParse(raw)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join('.') || '#doc-data'}: ${issue.message}`)
    }
    return { ok: false, errors, warns }
  }
  const data = parsed.data

  const seenSections = new Set<string>()
  const laneIds = new Set<string>()
  const ganttTargets: Array<[string, string]> = []
  const allCites: Cite[] = []
  let latestRuns = 0
  let hasWhatsNew = false

  // Lane ids first — gantt bars in an earlier section may target a later lane.
  for (const s of data.sections) {
    if (s.layout === 'lane') for (const item of s.blocks) laneIds.add(item.id)
  }

  for (const s of data.sections) {
    if (seenSections.has(s.id)) errors.push(`duplicate section id "${s.id}"`)
    seenSections.add(s.id)
    allCites.push(...citesOf(s))

    if (s.layout === 'gantt') {
      for (const row of s.blocks.rows) {
        if (row.laneId) ganttTargets.push([s.id, row.laneId])
      }
      const { cols, todayC1 } = s.blocks.window
      if (todayC1 !== undefined && (todayC1 < 1 || todayC1 > cols + 1)) {
        warns.push(`gantt "${s.id}": todayC1 ${todayC1} falls outside the ${cols}-column window`)
      }
      for (const row of s.blocks.rows) {
        if (row.c1 < 1 || row.c1 + row.span - 1 > cols) {
          warns.push(`gantt "${s.id}": bar "${row.title}" runs outside the window`)
        }
      }
    }

    if (s.layout === 'whatsnew') {
      hasWhatsNew = true
      latestRuns += s.blocks.runs.filter((r) => r.latest).length
    }
  }

  if (hasWhatsNew && latestRuns !== 1) {
    errors.push(`${latestRuns} What's New runs marked latest, expected exactly 1`)
  }

  for (const [sectionId, laneId] of ganttTargets) {
    if (!laneIds.has(laneId)) {
      errors.push(`gantt "${sectionId}": bar laneId "${laneId}" matches no lane item`)
    }
  }

  const seenCiteKeys = new Map<string, string>()
  for (const c of allCites) {
    // The chip resolves its payload from `#doc-previews` OR from the citation's
    // own `preview`, so this fails only when neither place has one — a chip
    // promising a card that does not exist anywhere.
    if (c.preview && !previewFor(c, previews)) {
      errors.push(`cite "${c.key}" carries a preview but neither #doc-previews nor the citation has a payload`)
    }
    const prior = seenCiteKeys.get(c.key)
    if (prior !== undefined && prior !== c.raw) {
      warns.push(`cite key "${c.key}" is reused for two different things ("${prior}" and "${c.raw}")`)
    }
    seenCiteKeys.set(c.key, c.raw)
  }

  return { ok: errors.length === 0, errors, warns, data }
}
