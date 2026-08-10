/**
 * The section-level escape hatch. A novel section renders as eyebrow, title,
 * lead and a list of generic blocks — arbitrary DATA, never arbitrary markup.
 *
 * `unknown` block types fall through to their `text`, matching the renderer:
 * a block shape nobody anticipated still shows what it says rather than being
 * dropped on the floor.
 */

import { Disclosure, Icon } from '../primitives.tsx'
import { SectionShell } from '../SectionShell.tsx'
import type { GenericBlock, SectionOf } from '../../schema/doc-data.ts'

export function GenericBlockView({ block }: { block: GenericBlock }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>
    case 'callout':
      return (
        <div className={block.variant ? `callout ${block.variant}` : 'callout'}>
          <p>{block.text}</p>
        </div>
      )
    case 'disc':
      return (
        <Disclosure headline={block.title} gist={block.gist} flat>
          <p>{block.body}</p>
        </Disclosure>
      )
    case 'fields':
      return (
        <>
          {block.title ? (
            <h3>
              {block.icon ? <Icon id={block.icon} /> : null}
              {block.title}
            </h3>
          ) : null}
          <div className="rows">
            {block.fields.map((f, i) => (
              <div className="row" key={i}>
                <span className="row-t">{f.label}</span>
                <span className="row-g">{f.value}</span>
              </div>
            ))}
          </div>
        </>
      )
    case 'unknown':
      // A shape nobody anticipated still shows what it says, rather than being
      // dropped on the floor.
      return block.text ? <p>{block.text}</p> : null
  }
}

export function Prose({ section }: { section: SectionOf<'prose'> | SectionOf<'generic'> }) {
  return (
    <SectionShell section={section}>
      {section.blocks.map((b, i) => (
        <GenericBlockView block={b} key={i} />
      ))}
    </SectionShell>
  )
}
