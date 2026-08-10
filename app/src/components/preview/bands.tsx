/**
 * The bands a card is made of.
 *
 * Every card renders the same three: a top line that identifies it, a title
 * line, and a foot of who and how-much. `CardBody` open-coded the wrappers at
 * each of its ten kinds; they live here once so a project's own card in
 * `@external/cards.tsx` composes the same pieces the built-in cards do and
 * cannot drift from them. That is the whole contract — a custom card never
 * types a class name, so it cannot look like it belongs to another document.
 *
 * Each band renders nothing when it has nothing, so a card can hand over
 * whatever the source actually supplied without guarding every line. "Nothing
 * fabricated" stays cheap to obey.
 */

import type { ReactNode } from 'react'

import { Icon, isBrandIcon } from '../primitives.tsx'
import { ago } from '../../lib/format.ts'

export function CardTop({ children }: { children: ReactNode }) {
  return <div className="cprev-top">{children}</div>
}

/** The mark and name of where this came from — the top band's identity unit. */
export function CardSource({ icon = 'i-link', label }: { icon?: string; label: string }) {
  return (
    <span className="cprev-id">
      <Icon id={icon} brand={isBrandIcon(icon)} />
      {label}
    </span>
  )
}

/** Relative age. Renders nothing rather than "unknown" when the source has no
 *  timestamp — a card that claims no date is honest; one that claims a wrong
 *  date is not. */
export function CardAge({ at }: { at?: string | number }) {
  const when = ago(at)
  return !!when && <span className="cprev-age">{when}</span>
}

export function CardTitle({ children }: { children?: ReactNode }) {
  return !!children && <div className="cprev-t">{children}</div>
}

/** Label/value rows as a definition list — the shape a source with no
 *  first-class card gets. Capped, because a hover card is a glance. */
export function CardRows({ rows }: { rows?: readonly { label: string; value: string }[] }) {
  return !!rows?.length && (
    <dl className="cprev-rows">
      {rows.slice(0, 6).map((r, i) => (
        <div key={i}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CardFoot({ children }: { children?: ReactNode }) {
  return !!children && <div className="cprev-foot">{children}</div>
}
