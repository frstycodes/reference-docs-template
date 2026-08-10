/**
 * An activity strip, then month clusters on one rail. A decision is an event
 * here, its depth folded in place.
 *
 * The spark, the filter chips, the legend and the month clustering are all
 * DERIVED from the events — the LLM supplies only events, so none of them can
 * drift. That was the locked renderer's central claim and it survives intact;
 * what changes is that the derivation and the filtering are now the same
 * declaration instead of a renderer and a shell script that had to agree.
 *
 * The filters are multi-select: each kind is an independent toggle so a reader
 * can ask for "decisions AND incidents" at once, an empty selection means All,
 * and the All chip is the clear-all. A month whose events are all filtered out
 * disappears with them.
 *
 * **Newest first by default.** The reader who opens this document is catching
 * up, and catching up starts at the end. Reading forward is the second
 * question, not the first, so it is a toggle rather than the default.
 *
 * Filtering ANIMATES rather than cutting: a filtered-out event leaves the list
 * instead of being `hidden`, and the survivors slide into their new positions
 * under Motion's `layout`. That is not decoration — a hard cut from twenty
 * rows to four gives the reader no way to see that the rows they were looking
 * at are still there, three inches up. `popLayout` is what makes the two
 * halves of that overlap rather than queue.
 */

import { useRef, useState } from 'react'
// Plain `motion`, not LazyMotion + `m`. The usual reason to reach for the
// latter is bundle size, and here it is not one: layout animations live in the
// `domMax` feature tier, so importing it synchronously — which a single-file
// artifact must — bundles exactly what `motion` already pulls in. Measured at
// 287 bytes LARGER, for an extra provider and an import indirection.
import { AnimatePresence, motion } from 'motion/react'
import { Disclosure, Icon, Pill } from '../primitives.tsx'
import { Cites } from '../Cite.tsx'
import { SectionShell } from '../SectionShell.tsx'
import { useDoc } from '../doc-context.tsx'
import { sndTick, prefersReducedMotion } from '../../lib/sound.ts'
import { TIMELINE_KINDS, type SectionOf, type TimelineEvent } from '../../schema/doc-data.ts'
import type { z } from 'zod'

type Event = z.infer<typeof TimelineEvent>
type Kind = Event['kind']

/** kind -> [css class, sprite id, the word, what it means] */
const TL_KIND: Record<Kind, [string, string, string, string]> = {
  decision: ['decision', 'i-fork', 'decision', 'a choice was made'],
  pivot: ['pivot', 'i-pivot', 'pivot', 'a choice was reversed'],
  incident: ['incident', 'i-alert', 'incident', 'it needs a response'],
  milestone: ['milestone', 'i-check', 'milestone', 'a point was reached'],
  build: ['build', 'i-ship', 'built', 'it shipped'],
  meeting: ['meeting', 'i-user', 'meeting', 'people talked'],
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

type Order = 'newest' | 'oldest'

const monthKey = (iso: string) => iso.slice(0, 7)

/** Chronological in, reading order out. One helper for months and for the
 *  events inside them, so the two can never disagree about which way is up. */
function ordered<T>(list: T[], order: Order): T[] {
  return order === 'newest' ? list.slice().reverse() : list
}

/** A stable identity for an event, so Motion tracks the SAME row across a
 *  filter or a re-sort instead of animating the index. An array index would
 *  make row 3 morph into a different event rather than move. */
const eventKey = (e: Event) => `${e.iso}|${e.kind}|${e.title}`

/** Quick out, gentle settle — the list is already where it is going by the
 *  time the eye arrives. */
const ENTER = { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const }
function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

export function Timeline({ section }: { section: SectionOf<'timeline'> }) {
  const events = section.blocks
  const { quiet } = useDoc()
  const [active, setActive] = useState<ReadonlySet<Kind>>(new Set())
  const [order, setOrder] = useState<Order>('newest')
  const filtersRef = useRef<HTMLDivElement>(null)

  // Chronological, always — this is the ordering the SPARK is drawn from, and a
  // chart with a time axis reads left to right whichever way the list below it
  // runs. The list applies `order` to a copy.
  const keys = [...new Set(events.map((e) => monthKey(e.iso)))].sort()
  const byMonth = new Map(keys.map((k) => [k, events.filter((e) => monthKey(e.iso) === k)]))

  const visible = (e: Event) => active.size === 0 || active.has(e.kind)

  // The spark measures the whole timeline, not the filtered view: it is the
  // overview you filter *from*.
  const counts = keys.map((k) => byMonth.get(k)!.length)
  const max = Math.max(1, ...counts)

  // Only kinds actually present get a chip and a legend entry.
  const present = TIMELINE_KINDS.filter((t) => events.some((e) => e.kind === t))

  function toggle(kind: Kind | 'all') {
    setActive((prev) => {
      if (kind === 'all') return new Set()
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
    // Filtering re-lays out everything below the buttons; bring the list back
    // under them rather than leaving the reader mid-page.
    const top = filtersRef.current?.getBoundingClientRect().top
    if (top !== undefined && top < 0) {
      filtersRef.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    sndTick()
  }

  function reorder(next: Order) {
    if (next === order) return
    setOrder(next)
    sndTick()
  }

  return (
    <SectionShell section={section}>
      <ul className="tl-spark" aria-label="Events per month">
        {keys.map((k, i) => {
          const n = counts[i]!
          return (
            <li style={{ ['--h' as string]: Math.max(1, Math.round((n / max) * 100)) }} key={k}>
              <a href={`#tl-${k}`} aria-label={`${monthLabel(k)}: ${n} ${n === 1 ? 'event' : 'events'}`} />
            </li>
          )
        })}
      </ul>
      <div className="tl-spark-ax" aria-hidden="true">
        {keys.map((k) => (
          <span className="lbl" key={k}>
            {monthLabel(k).replace(/ \d+$/, '')}
          </span>
        ))}
      </div>

      <div className="filters" id="tl-filters" role="group" aria-label="Filter timeline" ref={filtersRef}>
        <button type="button" data-filter="all" aria-pressed={active.size === 0} onClick={() => toggle('all')}>
          All
        </button>
        {present.map((t) => {
          const word = TL_KIND[t][2]
          return (
            <button type="button" data-filter={t} aria-pressed={active.has(t)} onClick={() => toggle(t)} key={t}>
              {word.charAt(0).toUpperCase() + word.slice(1)}s
            </button>
          )
        })}

        {/* Sort sits in the same row but not in the same group: filters are a
            multi-select and this is a single choice, so it is a radiogroup and
            it is pushed to the far end rather than reading as a seventh kind. */}
        <div className="filters-sort" role="radiogroup" aria-label="Sort timeline">
          <Icon id="i-arrow" />
          {([['newest', 'Newest'], ['oldest', 'Oldest']] as const).map(([value, label]) => (
            <button
              type="button"
              role="radio"
              aria-checked={order === value}
              onClick={() => reorder(value)}
              key={value}
            >
              {label} first
            </button>
          ))}
        </div>
      </div>

      <div className="timeline" id="timeline-list">
        {ordered(keys, order).map((k) => {
          // Filtered-out events are REMOVED, not hidden: `hidden` leaves them
          // occupying no space but still in the list, which gives Motion
          // nothing to animate between. A cluster with nothing left goes too.
          const items = ordered(byMonth.get(k)!.slice().sort((a, b) => a.iso.localeCompare(b.iso)), order)
            .filter(visible)
          if (!items.length) return null
          return (
            <section className="tl-month" id={`tl-${k}`} key={k}>
              <h3>{monthLabel(k)}</h3>
              <ol>
                {/* `popLayout` takes an exiting row OUT of the flow the
                    instant it starts leaving, so the survivors begin sliding
                    up immediately. Under the default `sync` the exiting rows
                    keep their space until their own animation finishes, and
                    the list sits still for the first 260ms of a filter —
                    which is the whole moment the animation exists for. */}
                <AnimatePresence initial={false} mode="popLayout">
                {items.map((e) => {
                  const [cls, icon, word] = TL_KIND[e.kind]
                  return (
                    <motion.li
                      data-type={e.kind}
                      key={eventKey(e)}
                      layout={quiet ? false : 'position'}
                      initial={quiet ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={quiet ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={quiet ? { duration: 0 } : ENTER}
                    >
                      <span className="t-date">{e.date}</span>
                      <span className="t-dot" />
                      <div className="t-body">
                        <div className="t-head">
                          <Pill cls={cls} icon={icon} word={word} />
                          {e.flag ? <span className="pill flag">new</span> : null}
                          <span className="t-title">{e.title}</span>
                        </div>
                        {e.gist ? <p className="t-desc">{e.gist}</p> : null}
                        <Cites list={e.cites} wrapClass="t-src" />
                        {e.body ? (
                          <Disclosure headline={e.bodyHead ?? 'Detail'} flat>
                            <p>{e.body}</p>
                          </Disclosure>
                        ) : null}
                      </div>
                    </motion.li>
                  )
                })}
                </AnimatePresence>
              </ol>
            </section>
          )
        })}
      </div>

      <div className="legend">
        {present.map((t) => {
          const [, icon, word, desc] = TL_KIND[t]
          return (
            <span data-type={t} key={t}>
              <span className="t-dot" />
              <Icon id={icon} />
              <span className="lg-w">{word}</span> — {desc}
            </span>
          )
        })}
      </div>
    </SectionShell>
  )
}
