/**
 * `layout` -> grammar. The successor to `doc-render.mjs`'s {DISPATCH}.
 *
 * There is no fallback branch here, and that is the point: the schema rewrites
 * an unknown layout to `prose` before a section ever reaches this switch, so
 * every case is a layout that exists. TypeScript's exhaustiveness check then
 * makes adding a layout to the schema without adding its component a compile
 * error rather than a silent prose section.
 */

import type { SectionNode } from '../../schema/doc-data.ts'

import { Timeline } from './Timeline.tsx'
import { State } from './State.tsx'
import { Ask } from './Ask.tsx'
import { WhatsNew } from './WhatsNew.tsx'
import { Tldr } from './Tldr.tsx'
import { Goal } from './Goal.tsx'
import { Primer } from './Primer.tsx'
import { Glossary } from './Glossary.tsx'
import { Pipeline } from './Pipeline.tsx'
import { Gantt } from './Gantt.tsx'
import { Lane } from './Lane.tsx'
import { Prose } from './Prose.tsx'

export function Section({ section }: { section: SectionNode }) {
  switch (section.layout) {
    case 'timeline': return <Timeline section={section} />
    case 'state': return <State section={section} />
    case 'ask': return <Ask section={section} />
    case 'whatsnew': return <WhatsNew section={section} />
    case 'tldr': return <Tldr section={section} />
    case 'goal': return <Goal section={section} />
    case 'primer': return <Primer section={section} />
    case 'glossary': return <Glossary section={section} />
    case 'pipeline': return <Pipeline section={section} />
    case 'gantt': return <Gantt section={section} />
    case 'lane': return <Lane section={section} />
    case 'prose':
    case 'generic': return <Prose section={section} />
    default: {
      const never: never = section
      return never
    }
  }
}
