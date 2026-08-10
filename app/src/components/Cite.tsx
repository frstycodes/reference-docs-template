/**
 * The citation chip — the one component both surfaces share, so the Today tab
 * and the Timeline tab cite things identically.
 *
 * Three things ride on it, and all three are the experience rather than the
 * information:
 *
 * - **The wobble.** Every chip's icon sits at its own small angle (`--tilt`) and
 *   swings further when you reach for it (`--htilt`). `cite.css` has always had
 *   the rules; without something setting the properties they fall back to
 *   `0deg`, which leaves the bare `scale(1.16)` and none of the character.
 * - **The tip.** A linked chip names where it goes on hover and on focus. An
 *   unlinked one does not, because it goes nowhere — same icon, no tooltip, and
 *   never a fabricated href.
 * - **The card.** A chip with a baked payload opens a hover card, built from
 *   `#doc-previews` with no request. Base UI's PreviewCard supplies the intent
 *   delay, collision-aware placement, pointer/keyboard parity and Escape
 *   dismissal; `cprev` styling and every pixel of the content stay ours.
 *
 * The allowlist is applied HERE rather than trusted from the data — a URL that
 * does not clear `#doc-allowlist` cannot become an href regardless of what
 * wrote it into `#doc-data`.
 */

import { PreviewCard } from '@base-ui/react/preview-card'
import { Icon, isBrandIcon } from './primitives.tsx'
import { CardBody } from './preview/CardBody.tsx'
import { useDoc } from './doc-context.tsx'
import { isAllowed, trackerKind } from '../schema/doc-config.ts'
import { tiltFor } from '../lib/format.ts'
import { trackerIcon } from '../lib/tracker.ts'
import type { Cite } from '../schema/doc-data.ts'
import type { CSSProperties } from 'react'

/** kind -> [sprite id, wrap the label in `.tok`, where it goes]
 *
 *  Whether the mark is filled or stroked is NOT here: `isBrandIcon` already
 *  knows, and two places knowing meant the tracker chip kept its old stroked
 *  flag after its symbol became a filled logo. */
const CITE_KIND: Record<Cite['kind'], [string, boolean, string]> = {
  pr: ['i-github', true, 'Open in GitHub'],
  slack: ['i-slack', false, 'Open in Slack'],
  gmail: ['i-gmail', false, 'Open in Gmail'],
  cal: ['i-cal', false, 'Open in Calendar'],
  drive: ['i-drive', false, 'Open in Drive'],
  tracker: ['i-bead', true, 'Open the item'],
  figma: ['i-figma', false, 'Open in Figma'],
  commit: ['i-commit', true, 'Open the commit'],
  path: ['i-file', true, 'Open the file'],
  thread: ['i-thread', false, 'Open the thread'],
  link: ['i-link', false, 'Open the link'],
  // A minted source overrides this mark via `cite.icon`; the generic link
  // glyph is what it falls back to if the mint never happened.
  custom: ['i-link', false, 'Open the item'],
}

/** Intent delays, from cite.js: brushing past must not flash a card, and the
 *  pointer needs grace to cross the gap on the way out. */
const CARD_IN = 350
const CARD_OUT = 120

export function CiteChip({ cite }: { cite: Cite }) {
  const { allowlist, previews, quiet, config } = useDoc()
  const [kindIcon, tok, tip] = CITE_KIND[cite.kind] ?? CITE_KIND.link
  // `tracker` is a category, so its mark is resolved rather than looked up;
  // a minted source names its own. Both beat the kind's default.
  const iconId = cite.icon
    ?? (cite.kind === 'tracker' ? trackerIcon(cite.raw, trackerKind(config)) : kindIcon)

  const linked = isAllowed(cite.url, allowlist)
  const entry = cite.preview ? previews[cite.key] : undefined

  // Nothing moves and nothing sounds when the reader asked for stillness — the
  // wobble is decoration, so it simply is not applied.
  const style = quiet
    ? undefined
    : ({ '--tilt': tiltFor(cite.key).tilt, '--htilt': tiltFor(cite.key).htilt } as CSSProperties)

  const inner = (
    <>
      <Icon id={iconId} brand={isBrandIcon(iconId)} />
      {tok ? <span className="tok">{cite.raw}</span> : cite.raw}
      {linked ? <span className="cite-tip">{tip}</span> : null}
    </>
  )

  const chip = linked ? (
    <a className="cite" style={style} href={cite.url} target="_blank" rel="noopener" data-cite={entry ? cite.key : undefined}>
      {inner}
    </a>
  ) : (
    // A chip with a card but no link still has to be reachable by keyboard.
    <span className="cite" style={style} data-cite={entry ? cite.key : undefined} tabIndex={entry ? 0 : undefined}>
      {inner}
    </span>
  )

  if (!entry) return chip

  return (
    <PreviewCard.Root>
      {/* Base UI 1.7 carries the intent delays on the Trigger, not the Root. */}
      <PreviewCard.Trigger delay={CARD_IN} closeDelay={CARD_OUT} render={chip} />
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="top" sideOffset={8} collisionPadding={12}>
          <PreviewCard.Popup className="cprev" role="tooltip" aria-hidden="false">
            <CardBody cite={cite} entry={entry} />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  )
}

/** A run of chips, optionally wrapped. Renders nothing for an empty list —
 *  never an empty tag. */
export function Cites({ list, wrapClass }: { list?: Cite[]; wrapClass?: string }) {
  if (!list?.length) return null
  const chips = list.map((c, i) => <CiteChip key={`${c.key}-${i}`} cite={c} />)
  return wrapClass ? <div className={wrapClass}>{chips}</div> : <>{chips}</>
}
