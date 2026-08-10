/**
 * A decision, folded, with its argument inside. Shared because a fork shows up
 * in more than one grammar — Goal's shifts today, anywhere else a choice needs
 * its rationale attached rather than summarised away.
 *
 * There is no Decisions tab: a decision is a timeline event, and this is how it
 * carries its depth in place. One record of what happened, not two.
 */

import { Pill, Icon } from './primitives.tsx'
import { Cites } from './Cite.tsx'
import type { DecisionRow as DecisionRowData } from '../schema/doc-data.ts'
import type { z } from 'zod'

type Data = z.infer<typeof DecisionRowData>

const DEC_PILL: Record<Data['kind'], [string, string, string]> = {
  decision: ['decision', 'i-fork', 'decision'],
  pivot: ['pivot', 'i-pivot', 'pivot'],
  milestone: ['milestone', 'i-check', 'milestone'],
}

export function DecisionRow({ d }: { d: Data }) {
  const [cls, icon, word] = DEC_PILL[d.kind] ?? DEC_PILL.decision
  return (
    <details className="disc">
      <summary>
        <span className="dec-date">{d.date}</span>
        <span className="dec-t">
          {d.title} <Pill cls={cls} icon={icon} word={word} />
        </span>
        <span className="dec-v">{d.verdict}</span>
        <Icon id="i-chev" className="disc-i" />
      </summary>
      <div className="disc-body">
        {d.why ? (
          <>
            <h4>Why</h4>
            <p>{d.why}</p>
          </>
        ) : null}
        {d.cites?.length ? (
          <p className="cites">
            <Cites list={d.cites} />
          </p>
        ) : null}
      </div>
    </details>
  )
}
