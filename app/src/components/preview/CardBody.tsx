/**
 * The card content, per citation kind. Ported from `cite.js`'s `build()`.
 *
 * Every kind renders the same three bands — a top line that identifies it, a
 * title line, and a foot of who and how-much — so a tracker card and a PR card
 * feel like the same object seen from two sides. Slack and Calendar and Drive
 * each replace the bare title with a richer block, because a message read out
 * of its author and its time is not a Slack message any more.
 *
 * Nothing inside a card is clickable: it is a tooltip. A conferencing link is
 * shown as text because it is a fact about the event, not a destination.
 */

import { Icon, Pill } from '../primitives.tsx'
import { CardTop, CardSource, CardAge, CardTitle, CardRows, CardFoot } from './bands.tsx'
import { Avatar, Who } from './Avatar.tsx'
import { useDoc } from '../doc-context.tsx'
import { trackerKind } from '../../schema/doc-config.ts'
import { ago, onDay, lasts } from '../../lib/format.ts'
import { trackerIcon } from '../../lib/tracker.ts'
import { cards } from '@external/cards.tsx'
import type { CardProps, CardRegistry } from '../../cards.ts'

/** `cards.tsx` constrains its registry with `satisfies`, which keeps each
 *  component's real props — and its literal keys. Widening once here is what
 *  lets a lookup miss, which is the normal case. */
const registry: CardRegistry = cards

const PR_STATE: Record<string, [string, string, string]> = {
  merged: ['merged', 'i-merge', 'Merged'],
  closed: ['closed', 'i-x', 'Closed'],
  draft: ['draft', 'i-doc', 'Draft'],
  open: ['open', 'i-fork', 'Open'],
}

/** In Drive these four are four different colours, and that mark is the fastest
 *  thing on the card — so the mimeType picks a brand symbol, not one grey page.
 *  Anything unrecognised falls back to the stroked generic page, which is a
 *  designed state, not a hole. */
const DRIVE_TYPE: Record<string, [string, string, boolean]> = {
  'application/vnd.google-apps.document': ['i-gdoc', 'Google Docs', true],
  'application/vnd.google-apps.spreadsheet': ['i-gsheet', 'Google Sheets', true],
  'application/vnd.google-apps.presentation': ['i-gslide', 'Google Slides', true],
  'application/pdf': ['i-gpdf', 'PDF', true],
}
const DRIVE_FALLBACK: [string, string, boolean] = ['i-file', 'File', false]

const Dot = () => <span className="cprev-dot">·</span>

export function CardBody({ cite, entry }: CardProps) {
  const { config } = useDoc()
  const p = entry.preview ?? {}
  const kind = entry.kind ?? cite.kind
  const raw = entry.raw ?? cite.raw
  const locale = config?.locale ?? 'en-GB'
  const tz = config?.timezone

  // A project's own card wins, by source name first so one `custom` kind can
  // cover many sources, then by kind so a project can replace a built-in card.
  // Missing is the normal case and costs nothing — the kinds below still run.
  const Project = registry[p.source?.toLowerCase() ?? ''] ?? registry[kind]
  if (Project) return <Project cite={cite} entry={entry} />

  switch (kind) {
    case 'pr': {
      const [cls, icon, word] = PR_STATE[p.state ?? 'open'] ?? PR_STATE.open!
      return (
        <>
          <div className="cprev-top">
            <Pill cls={cls} icon={icon} word={word} />
            <span className="cprev-id tok">{p.repo ? `${p.repo}#${p.number}` : `#${p.number}`}</span>
            {/* The age names the PR's terminal event, so a closed PR never
                wears its creation date as if it were fresh. */}
            <span className="cprev-age">{ago(p.mergedAt ?? p.closedAt ?? p.createdAt)}</span>
          </div>
          {p.title ? <div className="cprev-t">{p.title}</div> : null}
          <div className="cprev-foot">
            <Who name={p.author} url={p.authorAvatarUrl} />
            <span className="cprev-stat">
              {p.additions != null ? <span className="cprev-add">+{p.additions}</span> : null}
              {p.deletions != null ? <span className="cprev-del">−{p.deletions}</span> : null}
              {p.changedFiles != null ? (
                <span className="cprev-files">
                  <Icon id="i-file" />
                  {p.changedFiles} {p.changedFiles === 1 ? 'file' : 'files'}
                </span>
              ) : null}
            </span>
          </div>
        </>
      )
    }

    case 'slack': {
      const when = ago(p.ts)
      return (
        <>
          <div className="cprev-top">
            <span className="cprev-src">
              <Icon id="i-slack" brand />
              <span className="cprev-ch">
                <Icon id="i-hash" />
                {String(p.channel ?? '').replace(/^#/, '')}
              </span>
            </span>
          </div>
          <div className="cprev-msg">
            <Avatar url={p.authorAvatarUrl} name={p.author} />
            <div className="cprev-body">
              <div className="cprev-line">
                <span className="cprev-name">{p.author ?? 'unknown'}</span>
                {when ? <span className="cprev-when">{when}</span> : null}
              </div>
              {p.text ? <div className="cprev-t is-quote">{p.text}</div> : null}
            </div>
          </div>
        </>
      )
    }

    case 'tracker': {
      return (
        <>
          <div className="cprev-top">
            <Pill cls="milestone" icon={trackerIcon(raw, trackerKind(config))} word={p.status ?? 'item'} />
            <span className="cprev-id tok">{p.id ?? raw}</span>
            {p.due ? <span className="cprev-age">due {p.due}</span> : null}
          </div>
          {p.title ? <div className="cprev-t">{p.title}</div> : null}
          {p.assignee ? (
            <div className="cprev-foot">
              <Who name={p.assignee} />
            </div>
          ) : null}
        </>
      )
    }

    case 'figma': {
      // Figma exposes no timestamps, so the card claims none.
      return (
        <>
          <div className="cprev-top">
            <span className="cprev-src">
              <Icon id="i-figma" brand />
              <span className="cprev-ch">{p.file ?? 'Figma'}</span>
            </span>
          </div>
          <div className="cprev-t">{p.node ?? p.page ?? raw ?? ''}</div>
          {p.page && p.node ? (
            <div className="cprev-foot">
              <span className="cprev-files">{p.page}</span>
            </div>
          ) : null}
        </>
      )
    }

    case 'cal': {
      const started = p.start ? Date.parse(p.start) : NaN
      const isPast = !Number.isNaN(started) && started < Date.now()
      const howLong = lasts(p.start, p.end)
      const joinAt = p.conferenceUrl ?? p.location
      const guests = p.attendees ?? []
      const total = p.attendeeCount ?? guests.length
      const when: React.ReactNode[] = []
      if (p.day) when.push(p.day)
      if (p.time) when.push(when.length ? <Dot key="d1" /> : null, p.time)
      if (howLong) when.push(when.length ? <Dot key="d2" /> : null, howLong)

      return (
        <>
          <div className="cprev-top">
            <span className="cprev-src">
              <Icon id="i-cal" brand />
              <span className="cprev-ch">Calendar</span>
            </span>
            <span className="cprev-age">{ago(p.start)}</span>
          </div>
          <div className={isPast ? 'cprev-cal is-past' : 'cprev-cal'}>
            <div className="cprev-tile">
              <span className="cprev-tile-m">{p.month ?? ''}</span>
              <span className="cprev-tile-d">{p.dateNum ?? ''}</span>
            </div>
            <div className="cprev-ev">
              {p.title ? <div className="cprev-t">{p.title}</div> : null}
              {when.length ? <div className="cprev-when-l">{when}</div> : null}
              {joinAt ? (
                <div className="cprev-conf">
                  {p.conferenceUrl ? <Icon id="i-meet" brand /> : null}
                  <span>{String(joinAt).replace(/^https?:\/\//, '')}</span>
                </div>
              ) : null}
            </div>
          </div>
          {guests.length || total ? (
            <div className="cprev-foot">
              {/* Faces for the ones we have a face for, a count for everyone. */}
              {guests.length ? (
                <span className="cprev-faces">
                  {guests.slice(0, 5).map((g, i) => (
                    <Avatar url={g.avatarUrl} name={g.name} key={i} />
                  ))}
                </span>
              ) : null}
              {total ? (
                <span className="cprev-guests">
                  <Icon id="i-user" />
                  {total} {total === 1 ? 'guest' : 'guests'}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      )
    }

    case 'drive': {
      const [sym, label, brand] = (p.mimeType && DRIVE_TYPE[p.mimeType]) || DRIVE_FALLBACK
      const modOn = onDay(p.modified, locale, tz)
      return (
        <>
          <div className="cprev-top">
            <span className="cprev-src">
              <Icon id="i-drive" brand />
              <span className="cprev-ch">Drive</span>
            </span>
            <span className="cprev-age">{ago(p.modified)}</span>
          </div>
          <div className="cprev-file">
            <span className="cprev-fmark">
              <Icon id={sym} brand={brand} />
            </span>
            <div className="cprev-fbody">
              {p.title ? <div className="cprev-t">{p.title}</div> : null}
              <div className="cprev-ftype">{label}</div>
            </div>
          </div>
          {p.owner || modOn ? (
            <div className="cprev-foot">
              {p.owner ? <Who name={p.owner} url={p.ownerAvatarUrl} /> : null}
              {modOn ? <span className="cprev-mod">Modified {modOn}</span> : null}
            </div>
          ) : null}
        </>
      )
    }

    case 'path': {
      return (
        <>
          <div className="cprev-top">
            <span className="cprev-id">
              <Icon id="i-file" />
              in the repo
            </span>
            {p.exists === false
              ? <Pill cls="closed" icon="i-x" word="gone" />
              : <Pill cls="milestone" icon="i-check" word="present" />}
          </div>
          <div className="cprev-t tok">{p.path ?? raw ?? ''}</div>
          {p.lines != null ? (
            <div className="cprev-foot">
              <span className="cprev-files">{p.lines} lines</span>
            </div>
          ) : null}
        </>
      )
    }

    // A source with no first-class card, and the fallback for any unrecognised
    // kind — one shape, so a custom source can never render as the wrong card.
    //
    // `custom` is the case init writes a spec for: it carries a minted mark and
    // up to a handful of label/value rows, and that is data, so a new source
    // needs no code. A project that wants more than rows registers a component
    // in `@external/cards.tsx`, which is consulted above.
    case 'custom':
    default: {
      const isCustom = kind === 'custom'
      return (
        <>
          <CardTop>
            <CardSource icon={isCustom ? p.icon : 'i-link'} label={p.source ?? p.host ?? (isCustom ? 'source' : 'link')} />
            <CardAge at={p.modified ?? p.updatedAt ?? p.createdAt} />
          </CardTop>
          {/* A generic link falls back to its raw reference; there is nothing
              else to name it by. A custom card has its rows. */}
          <CardTitle>{isCustom ? p.title : p.title ?? raw}</CardTitle>
          {isCustom && <CardRows rows={p.rows} />}
          <CardFoot>{!!p.author && <Who name={p.author} url={p.authorAvatarUrl} />}</CardFoot>
        </>
      )
    }
  }
}
