/**
 * Anything that reads the clock, the viewport or a media query has to wait for
 * the client. The published document is prerendered on node and hydrated in the
 * browser, so a value that differs between the two is a hydration mismatch —
 * React discards the server markup and the reader sees a flash.
 *
 * Two places in this document genuinely need it, both ported from
 * `doc-shell.js`: the Gantt's today line is computed from `Date.now()` against
 * the chart's own window rather than a baked column (a document refreshed with
 * no lane activity would otherwise carry a today line frozen at its last edit),
 * and the Ask tally counts up rather than appearing.
 */

import { useEffect, useState } from 'react'

/** `false` during prerender and on the first client render, `true` after. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

/** Live `prefers-reduced-motion`, false until hydrated so the server and the
 *  first client render agree. */
export function useReducedMotion(): boolean {
  const [quiet, setQuiet] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setQuiet(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return quiet
}
