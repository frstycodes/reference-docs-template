/** Question cards. The one-line answer sits on the summary so the section is
 *  readable folded; the long form is inside. */

import { Icon } from '../primitives.tsx'
import { SectionShell } from '../SectionShell.tsx'
import type { SectionOf } from '../../schema/doc-data.ts'

export function Primer({ section }: { section: SectionOf<'primer'> }) {
  return (
    <SectionShell section={section}>
      <div className="qa">
        {section.blocks.map((q, i) => (
          <details className="disc" key={i}>
            <summary>
              <span className="qa-q">{q.q}</span>
              <span className="qa-a">{q.a}</span>
              <Icon id="i-chev" className="disc-i" />
            </summary>
            <div className="disc-body">
              <p>{q.body}</p>
            </div>
          </details>
        ))}
      </div>
    </SectionShell>
  )
}
