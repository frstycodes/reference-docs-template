/**
 * THE CONTRACT for a project's own preview cards — the only module
 * `@external/cards.tsx` is meant to import.
 *
 * A project cites sources this skill has never heard of. Most need nothing: a
 * `custom` citation carries `rows` and renders as a definition list, no code
 * involved. A card here is the upgrade for the handful where the shape of the
 * thing matters — a deploy with a status and a commit, an incident with a
 * severity — and it is always optional. A source with no entry in the registry
 * still gets its rows.
 *
 * Everything re-exported below is a band or a mark that already renders inside
 * the built-in cards, so a project card composes the document's own pieces
 * rather than restating its CSS.
 */

import type { ReactNode } from 'react'

import type { Cite } from './schema/doc-data.ts'
import type { PreviewEntry } from './schema/doc-previews.ts'

export interface CardProps {
  cite: Cite
  entry: PreviewEntry
}

export type CardComponent = (props: CardProps) => ReactNode

/**
 * How a card is chosen, in order: the lowercased `preview.source` a `custom`
 * citation carries, then the citation kind. The first lets a project add a card
 * for Vercel; the second lets it replace the built-in PR card wholesale.
 */
export type CardRegistry = Record<string, CardComponent>

export { CardTop, CardSource, CardAge, CardTitle, CardRows, CardFoot } from './components/preview/bands.tsx'
export { Avatar, Who } from './components/preview/Avatar.tsx'
export { Icon, Pill, Disclosure } from './components/primitives.tsx'
export { ago, onDay, lasts } from './lib/format.ts'
