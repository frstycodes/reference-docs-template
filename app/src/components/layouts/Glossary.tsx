/**
 * A scannable term grid with a letter rail and a filter, ANDed.
 *
 * The rail is derived from the terms present. Letters with no term are
 * DISABLED rather than hidden, so the rail never reflows under the cursor.
 */

import { useState } from 'react'
import { Icon } from '../primitives.tsx'
import { SectionShell } from '../SectionShell.tsx'
import { sndTick } from '../../lib/sound.ts'
import type { SectionOf } from '../../schema/doc-data.ts'

const initialOf = (term: string) => term.trim().charAt(0).toUpperCase()

export function Glossary({ section }: { section: SectionOf<'glossary'> }) {
  const [query, setQuery] = useState('')
  const [letter, setLetter] = useState('')

  const cats = section.blocks
  const present = new Set(cats.flatMap((c) => c.terms.map((t) => initialOf(t.term))).filter(Boolean))
  // The rail spans A–Z so it never reflows; only the present letters are live.
  const rail = [...present].sort()

  const q = query.trim().toLowerCase()
  const hit = (term: string, def: string) =>
    (q === '' || `${term} ${def}`.toLowerCase().includes(q)) &&
    (letter === '' || initialOf(term) === letter)

  const anyHit = cats.some((c) => c.terms.some((t) => hit(t.term, t.def)))

  function pick(l: string) {
    setLetter((prev) => (prev === l ? '' : l))
    sndTick()
  }

  return (
    <SectionShell section={section}>
      <div className="gtools">
        <div className="gsearch-wrap">
          <Icon id="i-search" />
          <input
            className="gsearch"
            id="gsearch"
            type="search"
            placeholder="Filter terms…"
            aria-label="Filter glossary terms"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="galpha" id="galpha" role="group" aria-label="Jump to letter">
          {rail.map((l) => (
            <button
              type="button"
              data-letter={l}
              aria-pressed={letter === l}
              disabled={!present.has(l)}
              onClick={() => pick(l)}
              key={l}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {cats.map((c, ci) => {
        const shown = c.terms.filter((t) => hit(t.term, t.def))
        return (
          <div className="gcat" hidden={shown.length === 0} key={ci}>
            <h3>{c.name}</h3>
            <dl className="gterms">
              {c.terms.map((t, ti) => (
                <div className="gterm" hidden={!hit(t.term, t.def)} key={ti}>
                  <dt>{t.code ? <code>{t.term}</code> : t.term}</dt>
                  <dd>{t.def}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}

      <p className="gempty" id="gempty" hidden={anyHit}>
        No terms match that filter.
      </p>
    </SectionShell>
  )
}
