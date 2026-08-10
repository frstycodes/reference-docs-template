/**
 * A Gantt chart of your work across time, above the same items in full.
 *
 * The month band and the day band are DERIVED from `window.start`/`unit`/`cols`
 * — the axis cannot disagree with the bars. `is-tight` is derived from a span
 * under three columns.
 *
 * The today line is computed from the chart's own window against the real
 * clock, never from a baked column: a document refreshed with no lane activity
 * would otherwise carry a today line frozen at its last edit. That makes it the
 * one piece of this document that differs between prerender and hydration, so
 * it renders the baked `todayC1` first (the no-JS fallback the build ships) and
 * corrects itself once mounted.
 */

import { Icon } from '../primitives.tsx'
import { SectionShell } from '../SectionShell.tsx'
import { useHydrated } from '../../lib/client-only.ts'
import type { SectionOf, State as StateKey, GanttWindow } from '../../schema/doc-data.ts'
import type { z } from 'zod'

type Win = z.infer<typeof GanttWindow>

const G_STATUS: Record<StateKey, [string, string]> = {
  shipped: ['i-ship', 'Shipped'],
  flight: ['i-flight', 'In flight'],
  blocked: ['i-block', 'Blocked'],
  risk: ['i-alert', 'At risk'],
}

const G_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Columns grouped into month spans, plus the day number each column starts on. */
function axis(win: Win) {
  const [y, m, d] = win.start.split('-').map(Number)
  const base = Date.UTC(y!, m! - 1, d!)
  const stepDays = win.unit === 'month' ? 30 : 7

  const days: number[] = []
  const monthOfCol: number[] = []
  for (let i = 0; i < win.cols; i++) {
    const dt = new Date(base + i * stepDays * 864e5)
    days.push(dt.getUTCDate())
    monthOfCol.push(dt.getUTCMonth())
  }

  const groups: Array<{ month: number; c1: number; span: number }> = []
  for (let i = 0; i < win.cols; i++) {
    const last = groups[groups.length - 1]
    if (last && last.month === monthOfCol[i]) last.span++
    else groups.push({ month: monthOfCol[i]!, c1: i + 1, span: 1 })
  }

  return { groups, days, dense: win.cols > 14 }
}

/** The column today falls in, or null when today is outside the window. */
function todayColumn(win: Win): number | null {
  const start = Date.parse(`${win.start}T00:00:00`)
  if (Number.isNaN(start)) return null
  // A month column is approximated at 30.44 days — close enough to land the
  // line in the right column of a 12-16 column window.
  const unit = win.unit === 'month' ? 30.44 : 7
  const col = Math.floor((Date.now() - start) / (unit * 864e5)) + 1
  return col < 1 || col > win.cols ? null : col
}

export function Gantt({ section }: { section: SectionOf<'gantt'> }) {
  const hydrated = useHydrated()
  const win = section.blocks.window
  const { groups, days, dense } = axis(win)

  const todayC1 = hydrated ? todayColumn(win) : (win.todayC1 ?? null)

  return (
    <SectionShell section={section}>
      <div className="gantt-wrap">
        <div
          className="gantt"
          style={{ ['--cols' as string]: win.cols }}
          data-start={win.start}
          data-unit={win.unit}
        >
          <div className="g-head">
            <span />
            <div className="g-axis">
              <div className="g-ticks g-months">
                {groups.map((g, i) => (
                  <span className="g-tick" style={{ ['--c1' as string]: g.c1, ['--span' as string]: g.span }} key={i}>
                    {G_MONTHS_SHORT[g.month]}
                  </span>
                ))}
              </div>
              <div className={dense ? 'g-ticks g-days is-dense' : 'g-ticks g-days'}>
                {days.map((n, i) => (
                  <span className="g-tick" style={{ ['--c1' as string]: i + 1 }} key={i}>
                    {n}
                  </span>
                ))}
              </div>
              {win.vh ? <span className="vh">{win.vh}</span> : null}
            </div>
          </div>

          <ol className="g-rows">
            {todayC1 !== null ? <span className="g-today" style={{ ['--c1' as string]: todayC1 }} /> : null}
            {section.blocks.rows.map((r, i) => {
              const [icon, word] = G_STATUS[r.status] ?? G_STATUS.flight
              // A bar links to its lane item — an in-document fragment, which
              // is always safe; anything else is not a link at all.
              const href = r.laneId ? `#${r.laneId}` : undefined
              const bar = (
                <>
                  <Icon id={icon} />
                  <span>{word}</span>
                  {r.vh ? <span className="vh">{r.vh}</span> : null}
                </>
              )
              const barClass = r.span < 3 ? 'g-bar is-tight' : 'g-bar'
              const barStyle = { ['--c1' as string]: r.c1, ['--span' as string]: r.span }
              return (
                <li className="g-row" data-status={r.status} key={i}>
                  <span className="g-lab">
                    {r.title}
                    {r.dep ? (
                      <span className="g-dep">
                        <Icon id="i-link" />
                        {r.dep}
                      </span>
                    ) : null}
                  </span>
                  <span className="g-track">
                    {href ? (
                      <a className={barClass} href={href} style={barStyle}>
                        {bar}
                      </a>
                    ) : (
                      <span className={barClass} style={barStyle}>
                        {bar}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <div className="g-legend">
        {(['shipped', 'flight', 'blocked', 'risk'] as const).map((s) => {
          const [icon, word] = G_STATUS[s]
          const key = s === 'shipped' ? 'g-key' : `g-key k-${s}`
          return (
            <span key={s}>
              <span className={key} aria-hidden="true" />
              <Icon id={icon} />
              {word.toLowerCase()}
            </span>
          )
        })}
      </div>
    </SectionShell>
  )
}
