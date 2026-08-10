/* Minted source marks — LOCKED.

   A project cites sources the skill has no built-in symbol for: Notion,
   Sentry, a status page, an internal tool. `init` fetches each one's own mark
   and writes it to `<project>/doc-icons.json`; every later run reads that file
   and never fetches again.

   THIS FILE IS THE GUARANTEE ON THAT PATH. A fetched SVG is foreign markup,
   and the app inlines `#doc-icons` through its one `dangerouslySetInnerHTML`.
   The invariant holds only because the markup is sanitised HERE — offline, at
   publish, against an ALLOWLIST — so a document containing an unsanitised mark
   is never written in the first place.

   Allowlist and not blocklist, for a reason that is not hypothetical: Pact's
   own favicon ships

     <style> path { fill: #0f0e0d } </style>

   and a rule like that, inlined into the page, is not scoped to the sprite. It
   repaints every path in the document. A blocklist catches the tags you
   thought of; this catches the ones you did not.

   What survives: geometry and paint. What does not: script, style,
   foreignObject, image, use, animation, every `on*` handler, every href, and
   any attribute carrying `url(`, which is how an external reference sneaks
   back in through a fill.

   A mark that cannot be sanitised is DROPPED, not repaired. The chip falls
   back to its monogram, which is a smaller loss than a page whose markup has
   to be trusted at read time. */

/** Elements a logo legitimately needs. Anything else is removed whole. */
const ELEMENTS = new Set([
  'symbol', 'g', 'defs', 'title', 'desc',
  'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask',
])

/** Attributes that describe shape or paint, and nothing that describes
 *  behaviour or fetches anything. */
const ATTRIBUTES = new Set([
  'id', 'viewBox', 'd', 'points', 'transform',
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height',
  'fill', 'fill-rule', 'fill-opacity', 'clip-rule', 'clip-path', 'mask',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity',
  'stroke-dasharray', 'stroke-miterlimit',
  'opacity', 'offset', 'stop-color', 'stop-opacity',
  'gradientUnits', 'gradientTransform', 'spreadMethod',
  'clipPathUnits', 'maskUnits', 'maskContentUnits',
])

/** Elements whose entire subtree goes, rather than just the tag. `<style>` is
 *  the important one — dropping the tag but keeping its text would paste CSS
 *  into the document body. */
const DROP_SUBTREE = /<\s*(script|style|foreignObject|image|use|animate|animateTransform|animateMotion|set|filter|switch|a)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|style|foreignObject|image|use|animate|animateTransform|animateMotion|set|filter)\b[^>]*\/\s*>/gi

const ID = /^i-[a-z0-9-]{1,40}$/
const VIEWBOX = /^-?[\d.]+\s+-?[\d.]+\s+[\d.]+\s+[\d.]+$/

/**
 * One entry -> one `<symbol>`, or null if it cannot be made safe.
 *
 * @param {string} id     sprite id, `i-<slug>`
 * @param {{viewBox?: string, body?: string}} entry
 * @param {(m: string) => void} [warn]
 */
export function sanitizeSymbol(id, entry, warn = () => {}) {
  // `return warn(…) ?? null` would be shorter and wrong: a warn that returns a
  // value — `Array.push` returns a length — makes a REJECTED icon look
  // accepted. Reject explicitly.
  const reject = (message) => {
    warn(message)
    return null
  }

  if (!ID.test(id)) return reject(`icon id "${id}" is not i-<slug>`)

  const viewBox = String(entry?.viewBox ?? '').trim()
  if (!VIEWBOX.test(viewBox)) return reject(`icon "${id}" has no usable viewBox`)

  let body = String(entry?.body ?? '')
  if (!body.trim()) return reject(`icon "${id}" has no body`)

  // 1. Whole subtrees that must not survive in any form.
  body = body.replace(DROP_SUBTREE, '')
  // Comments can hide a `-->` split across a later replace; drop them first.
  body = body.replace(/<!--[\s\S]*?-->/g, '')

  // 2. Every remaining tag, rebuilt from scratch. Rebuilding rather than
  //    editing is the point: an attribute that is not copied cannot survive a
  //    quoting trick, and a tag name that is not on the list produces nothing.
  const out = []
  const TAG = /<\s*(\/?)\s*([A-Za-z][A-Za-z0-9]*)((?:[^<>"']|"[^"]*"|'[^']*')*?)(\/?)\s*>/g
  let m
  let dropped = 0
  while ((m = TAG.exec(body))) {
    const [, closing, rawName, rawAttrs, selfClosing] = m
    const name = [...ELEMENTS].find((e) => e.toLowerCase() === rawName.toLowerCase())
    if (!name) {
      dropped++
      continue
    }
    if (closing) {
      out.push(`</${name}>`)
      continue
    }
    const attrs = []
    const ATTR = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g
    let a
    while ((a = ATTR.exec(rawAttrs))) {
      const key = [...ATTRIBUTES].find((k) => k.toLowerCase() === a[1].toLowerCase())
      if (!key) continue
      const value = a[3] ?? a[4] ?? ''
      // `fill="url(#x)"` is legal SVG and also the way an external reference
      // gets back in. A gradient a logo actually needs survives as a literal
      // colour or not at all.
      if (/url\s*\(|javascript:|&#|expression\s*\(/i.test(value)) continue
      // Nested symbol ids would collide with the sprite's own namespace.
      if (key === 'id' && name !== 'symbol') continue
      attrs.push(`${key}="${value.replace(/[<>"&]/g, '')}"`)
    }
    // Self-closing is preserved rather than normalised away: in SVG foreign
    // content an unclosed <path> takes its siblings as CHILDREN, which draws a
    // different picture instead of failing.
    const open = `<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}`
    out.push(selfClosing ? `${open}/>` : `${open}>`)
  }
  if (dropped) warn(`icon "${id}": ${dropped} disallowed element(s) removed`)

  const inner = out.join('')
  if (!/<(path|circle|ellipse|rect|line|polyline|polygon)\b/.test(inner)) {
    return reject(`icon "${id}" has nothing left to draw after sanitising`)
  }
  return `<symbol id="${id}" viewBox="${viewBox}">${inner}</symbol>`
}

/**
 * The whole `doc-icons.json` -> one string of `<symbol>`s, plus the set of ids
 * that made it. The caller uses the set to check that every `cite.icon` in the
 * document actually resolves — an unresolved `<use>` renders as empty space
 * with no error anywhere, which is the failure mode `icons.test.ts` exists to
 * prevent for the built-ins.
 */
export function mintIcons(iconsJson, warn = () => {}) {
  const ids = new Set()
  const parts = []
  for (const [id, entry] of Object.entries(iconsJson ?? {})) {
    const symbol = sanitizeSymbol(id, entry, warn)
    if (!symbol) continue
    ids.add(id)
    parts.push(symbol)
  }
  if (!parts.length) return { markup: '', ids }
  return {
    markup: `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${parts.join('')}</defs></svg>`,
    ids,
  }
}
