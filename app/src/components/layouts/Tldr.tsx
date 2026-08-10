/** Four big numbers and one accent line; the prose is folded. */

import { Disclosure } from '../primitives.tsx'
import { SectionShell } from '../SectionShell.tsx'
import type { SectionOf } from '../../schema/doc-data.ts'

export function Tldr({ section }: { section: SectionOf<'tldr'> }) {
  const b = section.blocks
  return (
    <SectionShell section={section}>
      <div className="tiles">
        {b.tiles.map((t, i) => (
          <div className={`tile ${t.risk ? 'is-risk' : 'is-done'}`} key={i}>
            <span className="tile-n">{t.n}</span>
            <span className="tile-k">{t.label}</span>
            {t.gist ? <span className="tile-g">{t.gist}</span> : null}
          </div>
        ))}
      </div>
      {b.key ? (
        <div className="callout key">
          <p>{b.key}</p>
        </div>
      ) : null}
      {b.long ? (
        <Disclosure headline="The long version" gist={b.longGist} flat>
          <p>{b.long}</p>
        </Disclosure>
      ) : null}
    </SectionShell>
  )
}
