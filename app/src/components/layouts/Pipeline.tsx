/**
 * A real left-to-right pipeline diagram with an inspector beneath it. One
 * stage's depth at a time; numbers and stage ids are derived from order and
 * title, never authored.
 *
 * The panels are `[hidden]` divs rather than conditional renders, so with JS
 * off every stage's depth reads open, in order — the same degradation the
 * locked pair had.
 */

import { useState } from 'react'
import { Icon, slug } from '../primitives.tsx'
import { SectionShell } from '../SectionShell.tsx'
import { sndTick } from '../../lib/sound.ts'
import type { SectionOf } from '../../schema/doc-data.ts'

export function Pipeline({ section }: { section: SectionOf<'pipeline'> }) {
  const stages = section.blocks
  // -1: nothing open. That is the initial state, as in doc-shell.js.
  const [openIndex, setOpenIndex] = useState(-1)

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? -1 : i))
    sndTick()
  }

  const idOf = (title: string) => `stage-${slug(title)}`
  const numOf = (i: number) => String(i + 1).padStart(2, '0')

  return (
    <SectionShell section={section}>
      <div className="pipe-wrap">
        <div className="pipe-rail">
          <ol className="pipe">
            {stages.map((s, i) => (
              <li key={i}>
                <button
                  className="stage-btn"
                  type="button"
                  aria-expanded={openIndex === i}
                  aria-controls={idOf(s.title)}
                  onClick={() => toggle(i)}
                >
                  <span className="stage-n">{numOf(i)}</span>
                  <span className="stage-t">{s.title}</span>
                  <span className="stage-g">{s.gist}</span>
                </button>
                {/* The last stage has no arrow. */}
                {i < stages.length - 1 ? <Icon id="i-arrow" className="pipe-arrow" /> : null}
              </li>
            ))}
          </ol>
        </div>
        <div className="pipe-detail">
          {stages.map((s, i) => (
            <div className="stage-d" id={idOf(s.title)} hidden={openIndex !== i} key={i}>
              <h4>
                {numOf(i)} · {s.title}
              </h4>
              <p>{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}
