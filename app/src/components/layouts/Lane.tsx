/**
 * Your work in full, under the Gantt that charts it. Item ids are the bars'
 * link targets, so the numbering is derived from order and never authored.
 *
 * `watch` is metadata the renderer ignores — which PR or tracker item decides
 * whether this row is still true. It is read by the refresh run, not by the
 * page: the document is a record, and reconciling it is a run's job.
 */

import { Disclosure } from '../primitives.tsx'
import { Cites } from '../Cite.tsx'
import { SectionShell } from '../SectionShell.tsx'
import { useDoc } from '../doc-context.tsx'
import { isAllowed } from '../../schema/doc-config.ts'
import type { SectionOf } from '../../schema/doc-data.ts'

type Item = SectionOf<'lane'>['blocks'][number]

function LaneItem({ item, index }: { item: Item; index: number }) {
  const { allowlist } = useDoc()
  const linked = isAllowed(item.href, allowlist)

  return (
    <li className="item" id={item.id}>
      <span className="item-n">{index + 1}</span>
      <div className="body">
        <div className="t">
          {linked ? <a href={item.href}>{item.title}</a> : item.title}
          {item.tag ? <span className="tag fill"> {item.tag}</span> : null}
        </div>
        <div className="d">{item.d}</div>
        {item.cites?.length ? (
          <p className="cites">
            <Cites list={item.cites} />
          </p>
        ) : null}
        {item.disc ? (
          <Disclosure headline={item.discHead ?? "What's involved"}>
            <p>{item.disc}</p>
          </Disclosure>
        ) : null}
      </div>
    </li>
  )
}

export function Lane({ section }: { section: SectionOf<'lane'> }) {
  return (
    <SectionShell section={section}>
      <ol className="list lane-list">
        {section.blocks.map((it, i) => (
          <LaneItem item={it} index={i} key={it.id} />
        ))}
      </ol>
    </SectionShell>
  )
}
