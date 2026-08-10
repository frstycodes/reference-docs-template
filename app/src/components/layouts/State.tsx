/**
 * Status tiles that are also the filter; rows recede under them.
 *
 * The counts are derived from the rows, so a tile can never disagree with what
 * is under it. A tile whose group has nothing is disabled — a button that
 * filters to blankness is a promise the page cannot keep.
 */

import { useState } from 'react'
import { Icon, Pill, FlagPill } from '../primitives.tsx'
import { Cites } from '../Cite.tsx'
import { SectionShell } from '../SectionShell.tsx'
import { sndTick } from '../../lib/sound.ts'
import { STATES, type SectionOf, type State as StateKey } from '../../schema/doc-data.ts'

const STATE_GROUP: Record<StateKey, [string, string, string]> = {
  risk: ['is-risk', 'i-alert', 'at risk'],
  blocked: ['is-blocked', 'i-block', 'Blocked'],
  flight: ['is-flight', 'i-flight', 'in flight'],
  shipped: ['is-done', 'i-ship', 'shipped'],
}

/** Known statuses get an icon and a phrase; anything else is shown verbatim,
 *  because the project's own word for a state beats a wrong guess. */
const STATUS_PILL: Record<string, [string, string, string]> = {
  done: ['done', 'i-check', 'done'],
  progress: ['progress', 'i-flight', 'in progress'],
  notstarted: ['notstarted', 'i-block', 'not started'],
  review: ['review', 'i-doc', 'in review'],
}

export function State({ section }: { section: SectionOf<'state'> }) {
  const [only, setOnly] = useState<StateKey | null>(null)

  const byState = new Map(section.blocks.map((g) => [g.state, g]))
  const present = STATES.filter((s) => (byState.get(s)?.rows.length ?? 0) > 0)

  function toggle(s: StateKey) {
    setOnly((prev) => (prev === s ? null : s))
    sndTick()
  }

  return (
    <SectionShell section={section}>
      <div className="tiles">
        {present.map((s) => {
          const [cls, icon, label] = STATE_GROUP[s]
          return (
            <button
              className={`tile ${cls}`}
              type="button"
              data-state={s}
              aria-pressed={only === s}
              onClick={() => toggle(s)}
              key={s}
            >
              <span className="tile-n">{byState.get(s)!.rows.length}</span>
              <span className="tile-k">
                <Icon id={icon} />
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {present.map((s) => {
        const [, icon, label] = STATE_GROUP[s]
        return (
          <div className="state-group" data-state={s} hidden={only !== null && only !== s} key={s}>
            <h3>
              <Icon id={icon} />
              {label}
            </h3>
            <div className="rows">
              {byState.get(s)!.rows.map((r, i) => {
                const p = r.status ? STATUS_PILL[r.status] : undefined
                return (
                  <div className="row" key={i}>
                    <span className="row-t">
                      {r.title}
                      {r.status ? (
                        <>
                          {' '}
                          <Pill cls={p?.[0] ?? r.status} icon={p?.[1]} word={p?.[2] ?? r.status} />
                        </>
                      ) : null}
                    </span>
                    <span className="row-m">
                      <Cites list={r.cites} />
                    </span>
                    <span className="row-g">
                      {r.gist ?? ''}
                      {r.flag ? (
                        <>
                          {' '}
                          <FlagPill />
                        </>
                      ) : null}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </SectionShell>
  )
}
