/**
 * The shared marks, ported from `doc-render.mjs`'s {PRIMITIVES} block.
 *
 * Two things the string renderer had to do by hand are gone here. Escaping is
 * React's job now, so `esc()` and `escAttr()` have no successors — which
 * removes the failure mode where one forgotten call is an XSS hole. And the
 * markup no longer has to agree with a separate `doc-shell.js` that re-attaches
 * behaviour to it, because behaviour and markup are the same declaration.
 */

import type { ReactNode } from 'react'

/** `ic-b` marks are brand logos carrying their own colour; `ic-s` are stroked
 *  `currentColor`. Getting the class wrong makes the icon invisible. */
export function Icon({ id, brand = false, className }: { id: string; brand?: boolean; className?: string }) {
  return (
    <svg className={`${className ?? 'ic'} ${brand ? 'ic-b' : 'ic-s'}`} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  )
}

export function Pill({ cls, icon, word }: { cls: string; icon?: string | null; word: string }) {
  return (
    <span className={`pill ${cls}`}>
      {/* Asks rather than assumes: a pill takes whatever mark its status maps
          to, and the milestone pill's is a filled logo. */}
      {icon ? <Icon id={icon} brand={isBrandIcon(icon)} /> : null}
      {word}
    </span>
  )
}

/** Status is never colour alone — every coloured mark keeps its icon and its
 *  word. This one carries neither because it is not a status: it means "since
 *  you last looked". */
export function FlagPill() {
  return <span className="pill flag">new</span>
}

/**
 * The one depth idiom. Sparseness is achieved by folding, never by cutting:
 * the visible line is a headline plus a one-line gist, and the full prose goes
 * in here.
 */
export function Disclosure({
  headline, gist, flat = false, className, children,
}: {
  headline: ReactNode
  gist?: string | null
  flat?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <details className={[flat ? 'disc flat' : 'disc', className].filter(Boolean).join(' ')}>
      <summary>
        <span className="disc-t">{headline}</span>
        {gist ? <span className="disc-g">{gist}</span> : null}
        <Icon id="i-chev" className="disc-i" />
      </summary>
      <div className="disc-body">{children}</div>
    </details>
  )
}

/** An in-document jump. Always a real anchor, so it works with JS off. */
export function Goto({ target, label }: { target: string; label: string }) {
  return (
    <a className="goto" href={`#${target}`}>
      {label}
      <Icon id="i-arrow" />
    </a>
  )
}

/** `slug()` from the renderer — stage ids are derived from titles, never authored. */
export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Which sprite symbols paint themselves.
 *
 * `ic-b` marks are filled — usually with baked brand colour, sometimes with
 * `currentColor` for a monochrome logo like Pact's. `ic-s` are stroked
 * `currentColor` outlines. Getting it wrong makes the icon invisible (a filled
 * path under `fill: none`, a stroked one under no stroke), and the caller
 * usually cannot tell, so the fact lives here once rather than at each call
 * site.
 */
const BRAND_ICONS = new Set([
  'i-slack', 'i-gmail', 'i-cal', 'i-github', 'i-drive', 'i-figma',
  'i-meet', 'i-gdoc', 'i-gsheet', 'i-gslide', 'i-gpdf',
  // Pact's mark is filled like the rest of these, but with `currentColor`
  // rather than a baked brand colour — hence "paints itself" above, not
  // "carries its own colour". `i-bead`, the generic tracker chip, is NOT here:
  // it is still a stroked outline, and deliberately not any one vendor's logo.
  'i-pact',
])

export function isBrandIcon(id: string): boolean {
  return BRAND_ICONS.has(id)
}
