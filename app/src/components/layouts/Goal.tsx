/** The current framing, the shifts that got us here as folded decision rows,
 *  and the historical note kept quiet at the bottom. */

import { SectionShell } from '../SectionShell.tsx'
import { DecisionRow } from '../DecisionRow.tsx'
import type { SectionOf } from '../../schema/doc-data.ts'

export function Goal({ section }: { section: SectionOf<'goal'> }) {
  const b = section.blocks
  return (
    <SectionShell section={section}>
      {b.current ? (
        <div className="callout key">
          <p>{b.current}</p>
        </div>
      ) : null}
      {b.shifts.length ? (
        <div className="decisions">
          {b.shifts.map((d, i) => (
            <DecisionRow d={d} key={i} />
          ))}
        </div>
      ) : null}
      {b.historical ? (
        <div className="callout quiet">
          <p>{b.historical}</p>
        </div>
      ) : null}
    </SectionShell>
  )
}
