/**
 * Which mark a tracker citation wears.
 *
 * `tracker` is a CATEGORY, not a product — the same cite kind covers Pact,
 * Linear, Jira, GitHub issues and whatever the next project uses. So the
 * generic `i-bead` outline is the default, and a vendor logo is only shown
 * once we actually know the vendor. Showing one project's tracker logo on
 * another project's items is worse than showing no logo at all.
 *
 * Two ways to know, in order:
 *
 * 1. **The config says so.** `sources.tracker.kind` is authoritative, because
 *    the sweep knows which MCP server it read the item out of and the document
 *    does not have to guess. The kinds are config.md's list — `pact`, `linear`,
 *    `jira`, `github-issues`, `asana`, `shortcut`, `notion`, `trello`, or any
 *    other id. A kind with no mark here is not an error, just generic.
 *
 * 2. **The id shape is unambiguous.** Only two shapes are:
 *
 *    - `PACT-0036` / `BEAD-0036` — Pact's own naming. Pact's MCP calls its
 *      items beads and numbers them `PACT-nnnn`; the older `BEAD-nnnn` form
 *      is the same thing, so both get Pact's mark.
 *    - `bd-a1b2`, `bd-a3f8.1` — the OSS `beads` tracker (steveyegge/beads),
 *      which is a DIFFERENT product that also calls its items beads. Hash
 *      ids, lowercase, optional dotted sub-tasks. It gets the generic bead
 *      glyph, which happens to be exactly right for it.
 *
 *    Everything else — `ENG-431`, `PROJ-12` — is Linear and Jira and half a
 *    dozen others sharing one format. Unresolvable from the string, so it
 *    stays generic rather than becoming a coin flip.
 */

/** Sprite id per vendor. A vendor absent here has no mark and falls back. */
const VENDOR_ICON: Record<string, string> = {
  pact: 'i-pact',
  linear: 'i-linear',
  jira: 'i-jira',
  'github-issues': 'i-github',
  // The OSS tracker. Its mark IS the bead — no logo to fetch, and none needed.
  beads: 'i-bead',
}

export const TRACKER_VENDORS = Object.keys(VENDOR_ICON)

/** `PACT-0036`, `BEAD-0036` — Pact, and nothing else uses these prefixes. */
const PACT_ID = /^(pact|bead)-\d+$/i
/** `bd-a1b2`, `bd-a3f8.1.1` — the OSS beads hash form, always lowercase hex. */
const BEADS_ID = /^[a-z][a-z0-9]{0,9}-[0-9a-f]{3,8}(\.\d+)*$/

export function trackerIcon(raw: string, vendor?: string): string {
  if (vendor && VENDOR_ICON[vendor]) return VENDOR_ICON[vendor]
  const id = raw.trim()
  if (PACT_ID.test(id)) return 'i-pact'
  if (BEADS_ID.test(id)) return 'i-bead'
  return 'i-bead'
}
