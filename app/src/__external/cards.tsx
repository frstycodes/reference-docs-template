/**
 * This project's own preview cards.
 *
 * OPTIONAL. A source the skill has no built-in card for already renders: its
 * citation carries `rows`, and the built-in `custom` card lays them out as a
 * definition list. Register a component here only when the shape of the thing
 * carries meaning that rows flatten — a deploy's state, an incident's severity.
 *
 * Lookup order is `preview.source` lowercased, then the citation kind. The
 * first is how one `custom` kind covers many sources; the second lets a project
 * replace a built-in card outright (`pr`, `slack`, `cal`, …).
 *
 * Compose the bands from `@app/cards`. They are the same pieces the built-in
 * cards are made of, so a card written here cannot drift from the rest of the
 * document — and no class name is ever typed by hand. Nothing in a card is
 * clickable: it is a tooltip, not a destination.
 */

import {
  CardTop, CardSource, CardAge, CardTitle, CardRows, CardFoot, Pill, Who,
  type CardProps, type CardRegistry,
} from '@app/cards.ts'

export const cards = {
  vercel: VercelDeploy,
} satisfies CardRegistry

/** A deploy is a state and a commit before it is a title, so the state leads
 *  as a pill and the rows carry the rest. */
function VercelDeploy({ entry }: CardProps) {
  const p = entry.preview ?? {}
  const state = p.rows?.find((r) => r.label === 'State')?.value
  const rest = p.rows?.filter((r) => r.label !== 'State')

  return (
    <>
      <CardTop>
        <CardSource icon={p.icon} label={p.source ?? 'Vercel'} />
        {!!state && <Pill cls={state === 'Ready' ? 'milestone' : 'draft'} icon="i-check" word={state} />}
        <CardAge at={p.updatedAt} />
      </CardTop>
      <CardTitle>{p.title}</CardTitle>
      <CardRows rows={rest} />
      <CardFoot>{!!p.author && <Who name={p.author} url={p.authorAvatarUrl} />}</CardFoot>
    </>
  )
}
