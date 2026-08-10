/**
 * Chrome is data: eyebrow, title, lead and icon are the LLM's editorial call,
 * and the section's presence and order are just its position in the array.
 * The layout inside is locked.
 *
 * Inner sections keep their own ids so a link to a section resolves wherever
 * the section lives — the tab it belongs to is worked out at runtime from the
 * data, never authored into the link.
 */

import type { ReactNode } from 'react'
import { Icon } from './primitives.tsx'
import type { SectionNode } from '../schema/doc-data.ts'

export function SectionShell({ section, children }: { section: SectionNode; children: ReactNode }) {
  return (
    <section className="sec" id={section.id}>
      {section.eyebrow ? (
        <p className="eyebrow">
          {section.icon ? <Icon id={section.icon} /> : null}
          {section.eyebrow}
        </p>
      ) : null}
      <h2>{section.title}</h2>
      {section.lead ? <p className="sec-lead">{section.lead}</p> : null}
      {children}
    </section>
  )
}
