/**
 * The whole document body: the no-JS jump list, the six tab panels (sections
 * grouped by their `tab`), and the dial. No masthead — the document opens
 * straight into the painting, and the project's identity lives in the dial's
 * popover.
 *
 * Panels ship UNHIDDEN and the popover ships hidden, so a JS failure degrades
 * to every panel visible plus a plain anchor list at the top. That is why the
 * hidden state is applied only once mounted.
 *
 * Deep links resolve by section id, not by tab: `#timeline` activates the
 * owning panel and then scrolls. The id -> tab map is built from the data at
 * runtime, so a section can move between tabs without any link changing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './primitives.tsx'
import { Section } from './layouts/index.tsx'
import { useHydrated } from '../lib/client-only.ts'
import { sndOpen, sndClose, sndSwitch, sndTick, prefersReducedMotion } from '../lib/sound.ts'
import { TABS, type DocData, type Tab } from '../schema/doc-data.ts'
import type { ReactNode } from 'react'

interface TabDef {
  tab: Tab
  panel: string
  id: string
  icon: string
  label: string
  short: string
}

const TAB_DEFS: TabDef[] = [
  { tab: 'today', panel: 'panel-today', id: 'tab-today', icon: 'i-sun', label: 'Today', short: 'Today' },
  { tab: 'whatsnew', panel: 'panel-whatsnew', id: 'tab-whatsnew', icon: 'i-pulse', label: "What's New", short: "What's New" },
  { tab: 'orientation', panel: 'panel-orientation', id: 'tab-orientation', icon: 'i-compass', label: 'Orientation', short: 'Orientation' },
  { tab: 'project', panel: 'panel-project', id: 'tab-project', icon: 'i-layers', label: 'Project', short: 'Project' },
  { tab: 'timeline', panel: 'panel-timeline', id: 'tab-timeline', icon: 'i-clock', label: 'Timeline', short: 'Timeline' },
  { tab: 'you', panel: 'panel-you', id: 'tab-you', icon: 'i-user', label: 'You', short: 'You' },
]

export function Doc({ data, today }: { data: DocData; today?: ReactNode }) {
  const hydrated = useHydrated()

  // A tab exists when it has sections. Today is present whenever a brief was
  // supplied — it is the one panel whose content is not in `sections`.
  const present = useMemo(
    () => TAB_DEFS.filter((t) => (t.tab === 'today' ? today != null : data.sections.some((s) => s.tab === t.tab))),
    [data.sections, today],
  )

  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const pinned = useRef(false)
  const dialRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const refocusing = useRef(false)

  /** Section id -> tab index, so a link into any section resolves. */
  const sectionTab = useMemo(() => {
    const map = new Map<string, number>()
    present.forEach((t, i) => {
      map.set(t.panel, i)
      for (const s of data.sections) if (s.tab === t.tab) map.set(s.id, i)
    })
    return map
  }, [present, data.sections])

  const scrollTo = useCallback((el: Element | null) => {
    el?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [])

  const routeFromHash = useCallback(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''))
    if (!id) return setIndex(0)
    const next = sectionTab.get(id) ?? 0
    setIndex(next)
    const target = document.getElementById(id)
    if (!target || target.classList.contains('panel')) return
    // The panel became visible only just now, so scroll after layout settles.
    requestAnimationFrame(() => scrollTo(target))
  }, [sectionTab, scrollTo])

  useEffect(() => {
    routeFromHash()
    window.addEventListener('hashchange', routeFromHash)
    return () => window.removeEventListener('hashchange', routeFromHash)
  }, [routeFromHash])

  const closeDial = useCallback((silent = false) => {
    setOpen((was) => {
      if (was && !silent) sndClose()
      return false
    })
    pinned.current = false
  }, [])

  const openDial = useCallback((silent = false) => {
    setOpen((was) => {
      if (!was && !silent) sndOpen()
      return true
    })
  }, [])

  const refocusTrigger = useCallback(() => {
    refocusing.current = true
    btnRef.current?.focus()
    refocusing.current = false
  }, [])

  // Proximity, not hover: the dial answers when the pointer comes near, so you
  // never have to land on a 40px target. Hysteresis so it cannot flicker on the
  // edge, and a distance test rather than an invisible padded hit area — that
  // would put a dead zone over the page's bottom-right corner.
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const NEAR = 132
    const FAR = NEAR + 90
    let raf = 0
    let px = 0
    let py = 0
    let inside = false

    const reach = () => {
      const btn = btnRef.current?.getBoundingClientRect()
      if (!btn) return null
      const pop = open ? dialRef.current?.querySelector('.dial-pop')?.getBoundingClientRect() : undefined
      if (!pop || (!pop.width && !pop.height)) return btn
      return {
        left: Math.min(btn.left, pop.left), right: Math.max(btn.right, pop.right),
        top: Math.min(btn.top, pop.top), bottom: Math.max(btn.bottom, pop.bottom),
      }
    }

    const measure = () => {
      raf = 0
      if (inside) return openDial()
      const r = reach()
      if (!r) return
      const dx = Math.max(r.left - px, 0, px - r.right)
      const dy = Math.max(r.top - py, 0, py - r.bottom)
      const dist = Math.hypot(dx, dy)
      if (dist <= NEAR) openDial()
      else if (dist > FAR && !pinned.current) closeDial(true)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      px = e.clientX
      py = e.clientY
      inside = e.target instanceof Element && !!dialRef.current?.contains(e.target)
      if (!raf) raf = requestAnimationFrame(measure)
    }
    const onLeave = () => { if (!pinned.current) closeDial(true) }
    const onDown = (e: PointerEvent) => {
      if (!open || (e.target instanceof Node && dialRef.current?.contains(e.target))) return
      closeDial(true)
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerdown', onDown)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [open, openDial, closeDial])

  // In-document links (the spark strip, .goto chips, the jump list) switch tab
  // first and then glide, rather than jumping.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null
      const href = a?.getAttribute('href')
      if (!href) return
      const id = decodeURIComponent(href.slice(1))
      if (!id || !document.getElementById(id)) return
      e.preventDefault()
      if (location.hash === `#${id}`) routeFromHash()
      else location.hash = `#${id}`
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [routeFromHash])

  function activate(next: number, opts: { focus?: boolean; sound?: boolean } = {}) {
    setIndex(next)
    if (opts.sound) sndSwitch()
    const panel = present[next]?.panel
    if (panel) history.replaceState(null, '', `#${panel}`)
    if (opts.focus) {
      requestAnimationFrame(() => {
        dialRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
      })
    }
  }

  function onTabKey(e: React.KeyboardEvent, i: number) {
    let delta = 0
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1
    else if (e.key === 'Home') delta = -present.length
    else if (e.key === 'End') delta = present.length
    else return
    e.preventDefault()
    const next = Math.min(present.length - 1, Math.max(0, i + delta))
    if (next !== i) activate(next, { focus: true, sound: true })
  }

  const current = present[index] ?? present[0]

  return (
    <>
      <nav className="nojs-nav wrap" aria-label="Sections">
        {present.map((t) => (
          <a href={`#${t.panel}`} key={t.tab}>
            {t.label}
          </a>
        ))}
      </nav>

      <main className="wrap">
        {present.map((t, i) => (
          <div
            className="panel"
            role="tabpanel"
            id={t.panel}
            aria-labelledby={t.id}
            hidden={hydrated && i !== index}
            key={t.tab}
          >
            {t.tab === 'today'
              ? today
              : data.sections.filter((s) => s.tab === t.tab).map((s) => <Section section={s} key={s.id} />)}
          </div>
        ))}
      </main>

      <div className="dial" ref={dialRef}
        onFocus={() => { if (!refocusing.current) openDial(true) }}
        onBlur={(e) => { if (!e.relatedTarget || !dialRef.current?.contains(e.relatedTarget)) closeDial(true) }}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !open) return
          e.stopPropagation()
          closeDial()
          refocusTrigger()
        }}
      >
        <div
          className="dial-pop"
          id="doc-dial-pop"
          role="tablist"
          aria-orientation="vertical"
          aria-label="Sections"
          hidden={!hydrated || !open}
          data-open={open ? 'true' : 'false'}
        >
          {present.map((t, i) => (
            <button
              className="dial-tab"
              type="button"
              role="tab"
              id={t.id}
              aria-controls={t.panel}
              aria-selected={i === index}
              tabIndex={i === index ? 0 : -1}
              data-short={t.short}
              style={{ ['--i' as string]: i }}
              onClick={() => {
                activate(i, { sound: true })
                closeDial(true)
                refocusTrigger()
              }}
              onKeyDown={(e) => onTabKey(e, i)}
              key={t.tab}
            >
              <Icon id={t.icon} />
              <span className="dial-tab-t">{t.label}</span>
            </button>
          ))}
          <div className="dial-id">
            <span className="dial-name">{data.meta.project}</span>
            <span className="dial-meta">updated {data.meta.updatedAt}</span>
          </div>
        </div>

        <button
          className="dial-btn"
          type="button"
          id="doc-dial-btn"
          ref={btnRef}
          aria-expanded={open}
          aria-controls="doc-dial-pop"
          aria-label="Sections"
          onClick={() => {
            if (open && pinned.current) return closeDial()
            pinned.current = true
            if (!open) openDial()
            else sndTick()
          }}
        >
          <Icon id={current!.icon} />
          <span className="dial-cur">{current!.short}</span>
          <Icon id="i-chev" className="ic dial-caret" />
        </button>
      </div>
    </>
  )
}

export { TAB_DEFS, TABS }
