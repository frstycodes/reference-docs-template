/** A dated spine — one rail, runs hanging off it, one level of surface, never
 *  a card in a card. The newest run carries `is-latest`. */

import { Icon, Goto } from '../primitives.tsx'
import { Cites } from '../Cite.tsx'
import { SectionShell } from '../SectionShell.tsx'
import type { SectionOf, WhatsNewBullet } from '../../schema/doc-data.ts'
import type { z } from 'zod'

type Bullet = z.infer<typeof WhatsNewBullet>

const WN_KIND: Record<Bullet['kind'], [string, string, string]> = {
  dec: ['dec', 'i-fork', 'Decision'],
  risk: ['risk', 'i-alert', 'Risk'],
  res: ['res', 'i-check', 'Resolved'],
  add: ['add', 'i-ship', 'Added'],
  upd: ['upd', 'i-flight', 'Updated'],
  watch: ['watch', 'i-search', 'Watch'],
}

export function WhatsNew({ section }: { section: SectionOf<'whatsnew'> }) {
  const b = section.blocks
  return (
    <SectionShell section={section}>
      <div className="wn">
        {b.runs.map((run, ri) => (
          <article className={run.latest ? 'wn-run is-latest' : 'wn-run'} key={ri}>
            <header className="wn-when">
              <time className="wn-d" dateTime={run.iso}>
                {run.date}
              </time>
              <span className="lbl">{run.time}</span>
              <span className="lbl">{run.sources}</span>
            </header>
            <ul className="wn-bul">
              {run.bullets.map((x, bi) => {
                const [cls, icon, label] = WN_KIND[x.kind] ?? WN_KIND.upd
                return (
                  <li key={bi}>
                    <span className={`wn-k ${cls}`}>
                      <Icon id={icon} />
                      {label}
                    </span>
                    <p className="wn-x">
                      {x.strong ? <strong>{x.strong} </strong> : null}
                      {x.text}
                    </p>
                    {/* Emitted unconditionally, as the locked renderer did — the
                        grammar's spacing depends on the row being present. */}
                    <p className="wn-m">
                      <Cites list={x.cites} />
                      {x.goto ? <Goto target={x.goto.target} label={x.goto.label} /> : null}
                    </p>
                  </li>
                )
              })}
            </ul>
          </article>
        ))}
      </div>
      {b.srcNote ? <p className="src-note">{b.srcNote}</p> : null}
    </SectionShell>
  )
}
