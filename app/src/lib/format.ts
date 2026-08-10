/**
 * Date and identity formatting for the citation cards, ported from `cite.js`.
 *
 * All of it runs only while a card is open, which is always after a pointer or
 * a focus — so the clock reads here never reach the prerender and cannot cause
 * a hydration mismatch.
 */

const UNITS: Array<[string, number]> = [
  ['y', 31536e6], ['mo', 2592e6], ['d', 864e5], ['h', 36e5], ['m', 6e4],
]

/** Slack stamps a message with epoch seconds and a fractional part
 *  ("1782231991.073999"), which `Date.parse` cannot read — every Slack card
 *  used to show a blank age because of it. */
const EPOCH_S = /^\d{9,11}(\.\d+)?$/

export function ago(value?: string | number | null): string {
  if (!value) return ''
  const s = String(value)
  const t = EPOCH_S.test(s) ? parseFloat(s) * 1000 : Date.parse(s)
  if (Number.isNaN(t)) return ''
  let diff = Date.now() - t
  const future = diff < 0
  diff = Math.abs(diff)
  for (const [label, ms] of UNITS) {
    const n = Math.floor(diff / ms)
    if (n >= 1) return future ? `in ${n}${label}` : `${n}${label} ago`
  }
  return 'just now'
}

/** The document states its own timezone and locale; a date read in the
 *  reader's zone would disagree with every other date on the page. */
export function onDay(iso?: string, locale = 'en-GB', timeZone?: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'short', year: 'numeric', timeZone,
    }).format(new Date(t))
  } catch {
    return ''
  }
}

export function lasts(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return ''
  const a = Date.parse(startIso)
  const b = Date.parse(endIso)
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return ''
  const mins = Math.round((b - a) / 6e4)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h} hr${m ? ` ${m} min` : ''}`
}

/**
 * The hand-pinned wobble, made deterministic.
 *
 * `cite.js` set `--tilt` and `--htilt` per chip with `Math.random()` on every
 * load. Random cannot survive prerender + hydration — the server and the client
 * would disagree on every chip — so the angles are derived from the citation
 * key instead. Each chip still sits at its own angle, which is the whole effect;
 * what changes is that a chip keeps its angle between visits, and that the
 * wobble now survives with JS off, which the random version never did.
 */
function hash(s: string, seed: number): number {
  let h = seed >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h / 4294967296
}

export interface Tilt {
  /** Resting angle, -1.5deg to +1.5deg. */
  tilt: string
  /** Hover angle, -10deg to +10deg — it swings further when you reach for it. */
  htilt: string
}

export function tiltFor(key: string): Tilt {
  return {
    tilt: `${(hash(key, 2166136261) * 3 - 1.5).toFixed(2)}deg`,
    htilt: `${(hash(key, 271828183) * 20 - 10).toFixed(1)}deg`,
  }
}
