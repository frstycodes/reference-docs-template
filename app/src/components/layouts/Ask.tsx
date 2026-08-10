/**
 * An open ledger: a running tally of what is unanswered, then the questions on
 * a rail, answered ones folded into a settled tray.
 *
 * The strokes beside the count are a hand tally — four uprights and a cross for
 * every five — because it is a count of what is still owed.
 *
 * One deliberate improvement over the locked pair. `doc-render.mjs` shipped a
 * literal `0` and `doc-shell.js` counted the rows at runtime, which meant a
 * reader with JS off was told there were zero open questions. Here the count is
 * derived at render, so the prerendered markup carries the true number, and the
 * count-up runs from a layout effect — before paint, so the final value never
 * flashes before the animation starts.
 */

import { useEffect, useLayoutEffect, useState } from 'react'
import { Icon } from '../primitives.tsx'
import { Cites } from '../Cite.tsx'
import { SectionShell } from '../SectionShell.tsx'
import type { SectionOf } from '../../schema/doc-data.ts'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/** Groups of five: four uprights, then a cross laid over them. */
function Strokes({ n }: { n: number }) {
  const groups: number[] = []
  for (let drawn = 0; drawn < n; drawn += 5) groups.push(Math.min(5, n - drawn))
  return (
    <span className="ask-strokes" id="ask-strokes" aria-hidden="true">
      {groups.map((size, gi) => (
        <span className="ask-grp" key={gi}>
          {Array.from({ length: Math.min(size, 4) }, (_, i) => (
            <span className="ask-stroke" style={{ ['--i' as string]: gi * 5 + i }} key={i} />
          ))}
          {size === 5 ? <span className="ask-stroke is-cross" style={{ ['--i' as string]: gi * 5 + 4 }} /> : null}
        </span>
      ))}
    </span>
  )
}

export function Ask({ section }: { section: SectionOf<'ask'> }) {
  const { open, done } = section.blocks
  const [shown, setShown] = useState(open.length)

  useIsomorphicLayoutEffect(() => {
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (quiet || open.length < 2) return
    setShown(0)
    let n = 0
    const step = setInterval(() => {
      n++
      setShown(n)
      if (n >= open.length) clearInterval(step)
    }, Math.max(40, Math.round(420 / open.length)))
    return () => clearInterval(step)
  }, [open.length])

  return (
    <SectionShell section={section}>
      <div className="ask">
        <div className="ask-tally">
          <span className="ask-n" id="ask-count">{shown}</span>
          <span className="ask-n-k">open questions</span>
          <Strokes n={open.length} />
        </div>

        <ol className="ask-open" id="ask-open">
          {open.map((q, i) => (
            <li className="ask-q" key={i}>
              <span className="ask-mark">
                <Icon id="i-ask" />
              </span>
              <p className="ask-t">{q.q}</p>
              <div className="ask-body">
                {q.who ? <p className="ask-who">{q.who}</p> : null}
                {q.ctx ? <p className="ctx">{q.ctx}</p> : null}
              </div>
            </li>
          ))}
        </ol>

        <details className="disc flat ask-tray">
          <summary>
            <span className="disc-t">Settled</span>
            <span className="disc-g">
              <span className="ask-tray-n" id="ask-done-n">{done.length}</span> answered, kept on the record
            </span>
            <Icon id="i-chev" className="disc-i" />
          </summary>
          <div className="disc-body">
            <ol className="ask-done" id="ask-done">
              {done.map((q, i) => (
                <li className="ask-q is-answered" key={i}>
                  <span className="ask-mark">
                    <Icon id="i-check" />
                  </span>
                  <p className="ask-t">{q.q}</p>
                  <div className="ask-body">
                    {q.answer ? <p className="ask-ans">{q.answer}</p> : null}
                    <Cites list={q.cites} wrapClass="cites" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </div>
    </SectionShell>
  )
}
