/**
 * The daily brief, rendered from `#brief-data` — the standalone page and
 * project-doc's Today tab, from one set of components.
 *
 * Scope changes only what SURROUNDS them, exactly as the catalog always said:
 * `all` adds the grain and puts the feature and sections inside a `<main>` of
 * their own, while `project` emits the hero-through-footer run bare, because
 * the host document already owns the grain, the sprite and the `<main>`. The
 * hero sits outside `<main>` either way — the rails scroll away with the
 * painting, so it is not part of the measure.
 *
 * Two things here are fixes rather than ports. `shell.js` hardcoded the
 * countdown target (`new Date(2026,6,24,21,15,0)`), so every brief after that
 * evening counted down to a date in the past — it is computed from the selected
 * schedule item now. And the footer's source tilts were `Math.random()`, which
 * cannot survive hydration; they are derived from the source name, like the
 * citation chips.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { Icon, isBrandIcon } from '../primitives.tsx'
import { Cites } from '../Cite.tsx'
import { StarBadge, StartWorking } from './StarBadge.tsx'
import { playPop, burst, playCompletionFanfare } from '../../lib/brief-fx.ts'
import { tiltFor } from '../../lib/format.ts'
import { avatarSrc } from '../../lib/avatar-src.ts'
import { useDoc } from '../doc-context.tsx'
import { isAllowed } from '../../schema/doc-config.ts'
import type { BriefData, BriefSection, Inline, Learned, Person } from '../../schema/brief-data.ts'
import type { CSSProperties } from 'react'

/* ── Primitives ────────────────────────────────────────────────────────── */

/** The load-in: the first eight blocks rise in sequence, the rest are already
 *  up. Self-scheduling per element rather than a class added by query, so a
 *  re-render cannot wipe it. */
function Rise({ index = 0, className = '', children }: { index?: number; className?: string; children: ReactNode }) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setInView(true), index < 8 ? 40 * index : 0)
    return () => clearTimeout(t)
  }, [index])
  return <div className={`${className} rise${inView ? ' in' : ''}`.trim()}>{children}</div>
}

function Ava({ person }: { person: Person }) {
  const { avatars } = useDoc()
  const [failed, setFailed] = useState(false)
  const src = avatarSrc(person.src, avatars)
  if (failed || !src) return <span className="ava mono">{person.initial}</span>
  return (
    <img
      className="ava"
      data-initial={person.initial}
      src={src}
      alt={person.name}
      onError={() => setFailed(true)}
    />
  )
}

function Avatars({ people }: { people?: Person[] }) {
  if (!people?.length) return null
  return (
    <span className="avas">
      {people.map((p, i) => (
        <span className="av" key={i}>
          <Ava person={p} />
          <span className="avname">{p.name}</span>
        </span>
      ))}
    </span>
  )
}

/** Inline runs. Each variant maps to one element — there is no path here by
 *  which source text becomes markup. */
function Runs({ runs }: { runs?: Inline[] }) {
  const { allowlist } = useDoc()
  if (!runs?.length) return null
  return (
    <>
      {runs.map((r, i) => {
        switch (r.t) {
          case 'text': return <span key={i}>{r.text}</span>
          case 'b': return <b key={i}>{r.text}</b>
          case 'link':
            return isAllowed(r.href, allowlist)
              ? <a href={r.href} target="_blank" rel="noopener" key={i}>{r.text}</a>
              : <span key={i}>{r.text}</span>
          case 'people': return <Avatars people={r.people} key={i} />
        }
      })}
    </>
  )
}

/* ── Hero ──────────────────────────────────────────────────────────────── */

function Clock() {
  // Renders the em dash the original markup shipped until the client ticks, so
  // the prerender and the first client render agree.
  const [time, setTime] = useState('—')
  useEffect(() => {
    const two = (n: number) => String(n).padStart(2, '0')
    const tick = () => {
      const now = new Date()
      const h24 = now.getHours()
      setTime(`${two(h24 % 12 || 12)}:${two(now.getMinutes())} ${h24 < 12 ? 'AM' : 'PM'}`)
    }
    tick()
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [])
  return <div className="hero-edge hero-time" id="clock">{time}</div>
}

function Hero({ data }: { data: BriefData }) {
  const { hero, meta } = data
  return (
    <div className="hero wrap">
      <div className="hero-edge hero-date">{meta.date}</div>
      <Clock />
      <Rise index={0} className="herofig">
        <div className="frame">
          <img src={hero.art.src} alt={hero.art.alt} />
        </div>
        <div className="title">
          <span className="the">The</span>
          <span className="big">{meta.weekday} Brief</span>
        </div>
      </Rise>
      <Rise index={1} className="underhero">
        <p className="blurb">{hero.blurb}</p>
        <p className="credit">{hero.art.credit}</p>
      </Rise>
    </div>
  )
}

/* ── Sections ──────────────────────────────────────────────────────────── */

function SectionHead({ section }: { section: BriefSection }) {
  return (
    <div className="side">
      <div className="eyebrow">{section.eyebrow}</div>
      <h2 className="h">{section.title}</h2>
      {section.lead ? <p className="lead">{section.lead}</p> : null}
    </div>
  )
}

function Todos({ section }: { section: Extract<BriefSection, { kind: 'todos' }> }) {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set())
  const [dismissed, setDismissed] = useState(false)
  const allDone = done.size === section.items.length && !dismissed

  function toggle(id: string, el: HTMLElement | null) {
    const next = new Set(done)
    const checked = !next.has(id)
    if (checked) next.add(id)
    else next.delete(id)
    setDone(next)
    setDismissed(false)
    playPop(checked)
    if (!checked) return
    const r = el?.getBoundingClientRect()
    if (r) burst(r.left + r.width / 2, r.top + r.height / 2)
    if (next.size === section.items.length) {
      setTimeout(() => {
        const card = document.getElementById('alldone')?.getBoundingClientRect()
        if (card) burst(card.left + card.width / 2, card.top + card.height / 2, undefined, 70)
        playCompletionFanfare()
      }, 240)
    }
  }

  return (
    <div className={allDone ? 'list is-all-done' : 'list'} id="todos">
      {section.items.map((it) => {
        const isDone = done.has(it.id)
        return (
          <div
            className={isDone ? 'item is-done' : 'item'}
            key={it.id}
            // The whole row is a hover surface: clicking anywhere toggles it,
            // links, buttons and the checkbox itself excepted.
            onClick={(e) => {
              if ((e.target as Element).closest('a,button,.chk')) return
              toggle(it.id, e.currentTarget.querySelector('.box'))
            }}
          >
            <label className="chk">
              <input type="checkbox" checked={isDone} onChange={(e) => toggle(it.id, e.currentTarget.closest('.item'))} />
              <span className="box">
                <svg viewBox="0 0 14 14"><polyline points="2,7.5 6,11 12,3.5" /></svg>
              </span>
            </label>
            <div className="body">
              <div className="t">
                <TodoTitle item={it} />
                {it.tag ? <span className="tag fill">{it.tag}</span> : null}
                <Cites list={it.cites} />
                <Avatars people={it.people} />
              </div>
              <div className="d">{it.d}</div>
              {/* Withdraws once the item is checked — you do not start a task
                  you have finished. */}
              {isDone ? null : (
                <StartWorking head={it.prompt.head} prompt={it.prompt.prompt} aria={it.prompt.aria} rot={it.rot} />
              )}
            </div>
          </div>
        )
      })}
      <AllDone onClose={() => setDismissed(true)} />
    </div>
  )
}

function TodoTitle({ item }: { item: Extract<BriefSection, { kind: 'todos' }>['items'][number] }) {
  const { allowlist } = useDoc()
  return isAllowed(item.href, allowlist)
    ? <a href={item.href} target="_blank" rel="noopener">{item.title}</a>
    : <>{item.title}</>
}

function AllDone({ onClose }: { onClose: () => void }) {
  return (
    <div className="alldone" id="alldone">
      <div className="alldone-card">
        <button className="alldone-close" id="alldoneClose" type="button" aria-label="Back to to-dos" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="alldone-badge">
          <svg viewBox="0 0 20 20"><path d="M5 10.5L8.25 13.75L15 6.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p className="alldone-t">You cleared the list.</p>
        <p className="alldone-d">Nice work. The rest of the day is yours.</p>
      </div>
    </div>
  )
}

function Updates({ section }: { section: Extract<BriefSection, { kind: 'updates' }> }) {
  const { allowlist } = useDoc()
  return (
    <div className="ups">
      {section.items.map((u, i) => (
        <div className="up" key={i}>
          {/* Numbered because the list is ordered by weight, not by chance. */}
          <span className="up-num">{String(i + 1).padStart(2, '0')}</span>
          <div className="up-body">
            <div className="up-t">
              {isAllowed(u.href, allowlist)
                ? <a href={u.href} target="_blank" rel="noopener">{u.title}</a>
                : u.title}
              {u.tag ? <span className="tag fill">{u.tag}</span> : null}
            </div>
            {/* On an update the chips sit at the END of the paragraph. */}
            <div className="up-d">
              <Runs runs={u.d} />
              <Cites list={u.cites} />
              <Avatars people={u.people} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Countdown({ startIso }: { startIso?: string }) {
  const [text, setText] = useState<ReactNode>('—')
  useEffect(() => {
    const target = startIso ? Date.parse(startIso) : NaN
    if (Number.isNaN(target)) return setText('')
    const tick = () => {
      const diff = target - Date.now()
      if (diff > 0) {
        const h = Math.floor(diff / 3.6e6)
        const m = Math.floor((diff % 3.6e6) / 6e4)
        setText(<>in <b>{h}h {String(m).padStart(2, '0')}m</b> from now</>)
      } else if (diff > -45 * 6e4) {
        setText(<b>happening now</b>)
      } else {
        setText('wrapped for the day')
      }
    }
    tick()
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [startIso])
  return <div className="count" id="countdown">{text}</div>
}

function Schedule({ section }: { section: Extract<BriefSection, { kind: 'schedule' }> }) {
  const [active, setActive] = useState(0)
  const item = section.items[active] ?? section.items[0]!
  const prep = item.prompt ?? section.prompt
  return (
    <div className="sched">
      <div className="sched-list" id="schedList">
        {section.items.map((s, i) => (
          <button
            className={i === active ? 'sched-item is-active' : 'sched-item'}
            type="button"
            data-index={i}
            onClick={() => setActive(i)}
            key={i}
          >
            <span className="sched-time">{s.time}</span>
            <span className="sched-ev">{s.event}</span>
          </button>
        ))}
      </div>
      <div className="sched-detail">
        <div>
          <div className="dt">{item.dt}</div>
          <div className="dd"><Runs runs={item.dd} /></div>
          <Countdown startIso={item.startIso} />
        </div>
        {!!prep && (
          // Keyed by the selected index so switching meetings remounts the
          // badge: it owns a `copied` state, and a button that still reads
          // "Copied" after you pick a different meeting is lying about which
          // prompt is on the clipboard.
          <div className="badgewrap sched-badge">
            <StarBadge
              key={active}
              variant="star--prep"
              head={prep.head}
              prompt={prep.prompt}
              aria={prep.aria}
              label="Prep me"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Reads({ section }: { section: Extract<BriefSection, { kind: 'reads' }> }) {
  const { allowlist } = useDoc()
  return (
    <div className="reads">
      {section.items.map((r, i) => {
        const body = (
          <>
            <div className="k">{r.kicker}</div>
            <div className="rt">
              {r.title}{' '}
              {r.icon ? (
                <svg className="sico-static" style={{ width: 15, height: 15, verticalAlign: -3 }}>
                  <use href={`#${r.icon}`} />
                </svg>
              ) : null}
            </div>
            <div className="rd">{r.desc}</div>
          </>
        )
        return isAllowed(r.url, allowlist)
          ? <a className="read" href={r.url} target="_blank" rel="noopener" key={i}>{body}</a>
          : <div className="read" key={i}>{body}</div>
      })}
    </div>
  )
}

function Section({ section, index }: { section: BriefSection; index: number }) {
  return (
    <Rise index={index} className="">
      <section>
        <div className="grid">
          <SectionHead section={section} />
          <div>
            {section.kind === 'todos' ? <Todos section={section} /> : null}
            {section.kind === 'updates' ? <Updates section={section} /> : null}
            {section.kind === 'schedule' ? <Schedule section={section} /> : null}
            {section.kind === 'reads' ? <Reads section={section} /> : null}
            {section.kind === 'prose' ? <p><Runs runs={section.body} /></p> : null}
          </div>
        </div>
      </section>
    </Rise>
  )
}

/* ── The fragment ──────────────────────────────────────────────────────── */

/** The turbulence wash over the whole page. `scope: all` only — inside a
 *  project doc the host already paints it, and a second one doubles the
 *  opacity. */
function Grain() {
  return (
    <svg className="grain" aria-hidden="true">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} />
      </filter>
      <rect width="100%" height="100%" filter="url(#n)" />
    </svg>
  )
}

function Feature({ feature }: { feature: NonNullable<BriefData['feature']> }) {
  return (
    <Rise index={2} className="feature">
      <div className="grid">
        <div className="side">
          {/* Serif section name here, not a mono eyebrow — this card is the
              one place the brief speaks in its display face. */}
          <h2 className="h">Push your work forward</h2>
          <div className="badgewrap">
            <StarBadge
              head={feature.prompt.head}
              prompt={feature.prompt.prompt}
              aria={feature.prompt.aria}
              label={<>Let&apos;s<br />do it</>}
            />
          </div>
        </div>
        <div>
          <h3 className="fp-topic">{feature.topic}</h3>
          <p className="fp"><Runs runs={feature.body} /></p>
        </div>
      </div>
    </Rise>
  )
}

const LEARNED_LABEL = { rule: 'Rule', watching: 'Watching', retired: 'Retired' } satisfies Record<Learned['kind'], string>

/**
 * What the run changed in its memory this morning, and nothing on a morning it
 * changed nothing. The agent may rewrite how it extracts without being asked;
 * this is the only place the reader finds out, so it sits in the flow rather
 * than in the footer where the eye skips.
 */
function LearnedStrip({ learned }: { learned: readonly Learned[] }) {
  return (
    <aside className="learned" aria-label="What I learned today">
      <p className="learned-kicker">What I learned today</p>
      <dl className="learned-list">
        {learned.map((l, i) => (
          <div className="learned-row" key={i}>
            <dt className={`learned-kind learned-kind--${l.kind}`}>{LEARNED_LABEL[l.kind]}</dt>
            <dd className="learned-text">
              {l.text}
              {!!l.why && <span className="learned-why">{l.why}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

// Not `.wrap`: sections are full-bleed with a constrained inner grid, and the
// footer follows them. `.wrap` capped it at 1040px, which cut the halftone off
// short of the window on every screen wider than that.
function Footer({ footer }: { footer: NonNullable<BriefData['footer']> }) {
  const { allowlist } = useDoc()
  return (
    <footer className="rise in">
      <div className="foot-fade" aria-hidden="true" />
      <div className="foot-halftone" aria-hidden="true" />
      <div className="foot-inner">
        <p className="foot-credit">
          Made for you using <em>your</em>{' '}
          {footer.sources.map((s, i, all) => {
            const t = tiltFor(s.name)
            const style = { ['--tilt']: t.tilt, ['--htilt']: t.htilt } as CSSProperties
            const mark = (
              <>
                <Icon id={s.icon} brand={isBrandIcon(s.icon)} />
                {s.name}
              </>
            )
            return (
              <span key={s.name}>
                {isAllowed(s.url, allowlist)
                  ? <a className="fsrc" style={style} href={s.url} target="_blank" rel="noopener">{mark}</a>
                  : <span className="fsrc" style={style}>{mark}</span>}
                {i < all.length - 2 ? ', ' : i === all.length - 2 ? ', and ' : '.'}
              </span>
            )
          })}
        </p>
      </div>
    </footer>
  )
}

export function Brief({ data }: { data: BriefData }) {
  const standalone = data.meta.scope === 'all'

  const feature = data.feature ? <Feature feature={data.feature} /> : null
  const sections = data.sections.map((s, i) => (
    <Section section={s} index={i + 3} key={s.id} />
  ))
  const footer = data.footer?.sources.length ? <Footer footer={data.footer} /> : null
  const learned = data.learned.length ? <LearnedStrip learned={data.learned} /> : null

  return (
    <>
      {standalone ? <Grain /> : null}
      <Hero data={data} />
      {standalone
        ? <main className="wrap">{feature}{sections}{learned}</main>
        : <>{feature}{sections}{learned}</>}
      {footer}
    </>
  )
}
