/**
 * The prompt badges. `.star` is the section badge (two per page, maximum — the
 * feature card and the schedule card); `.copyp` is the per-to-do "start
 * working" button. Same contract, same copy ladder, so a prompt is copied the
 * same way wherever it is offered.
 *
 * Writing the prompt is the whole feature: it is written TO the reader's agent,
 * in the first person, with enough context to act without this page. Hovering
 * shows it in the shared popover, so the reader knows what they are getting
 * before they take it.
 *
 * The popover was a single reparented element in `shell.js` — moved to `<body>`
 * because `position: fixed` resolves against the nearest transformed ancestor,
 * and inside project-doc's animated panel its coordinates landed far from the
 * button. Base UI's Portal solves the same problem structurally, so there is no
 * reparenting to remember.
 */

import { useRef, useState, type ReactNode } from 'react'
import { Tooltip } from '@base-ui/react/tooltip'
import { Icon } from '../primitives.tsx'
import { copyText } from '../../lib/brief-fx.ts'

const RESTORE_MS = 1600

function useCopy(prompt: string) {
  const [label, setLabel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  async function run() {
    const ok = await copyText(prompt)
    setLabel(ok ? 'copied ✓' : 'press ⌘C')
    setCopied(ok)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setLabel(null)
      setCopied(false)
    }, RESTORE_MS)
  }

  return { label, copied, run }
}

/** The shared popover: what this button will put on your clipboard. */
function Tip({ head, prompt, children }: { head: string; prompt: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children as never} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={12} collisionPadding={12}>
          <Tooltip.Popup className="startip" role="tooltip" aria-hidden="false">
            <div className="startip-head">
              <Icon id="i-spark" />
              <span>{head}</span>
            </div>
            <div className="startip-body">{prompt}</div>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function StarBadge({
  head, prompt, aria, label, variant = 'star',
}: {
  head: string
  prompt: string
  aria: string
  /** The resting label, e.g. "Let's<br>do it". */
  label: ReactNode
  variant?: 'star' | 'star--prep'
}) {
  const { label: copiedLabel, copied, run } = useCopy(prompt)
  return (
    <Tip head={head} prompt={prompt}>
      <button
        className={`${variant === 'star' ? 'star' : 'star star--prep'}${copied ? ' is-copied' : ''}`}
        type="button"
        aria-label={aria}
        onClick={run}
      >
        <span className="star-txt">
          {copiedLabel ?? (
            <>
              {label} <span className="star-arrow">→</span>
            </>
          )}
        </span>
      </button>
    </Tip>
  )
}

/**
 * Every to-do gets one. A to-do tells the reader what is waiting on them; this
 * hands them a running start instead of a link they still have to turn into a
 * question. `--rot` is hand-varied per button — uniform tilt reads as a
 * mistake, varied tilt reads as pinned on — and it withdraws once the item is
 * checked, because you do not start a task you have finished.
 */
export function StartWorking({ head, prompt, aria, rot }: {
  head: string
  prompt: string
  aria: string
  rot?: number
}) {
  const { label, copied, run } = useCopy(prompt)
  return (
    <Tip head={head} prompt={prompt}>
      <button
        className={copied ? 'copyp is-copied' : 'copyp'}
        type="button"
        style={{ ['--rot' as string]: `${rot ?? -3.5}deg` }}
        aria-label={aria}
        onClick={run}
      >
        <Icon id="i-spark" className="" />
        <span className="copyp-t">
          {label ?? (
            <>
              Start
              <br />
              working
            </>
          )}
        </span>
      </button>
    </Tip>
  )
}
