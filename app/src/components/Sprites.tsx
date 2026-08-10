/**
 * Both sprites, inlined. Every `<use href="#i-…">` in the document resolves
 * against these — miss one and the icons render as empty space with no error
 * anywhere, which is why `icons.test.ts` checks every reference.
 *
 * The brand sprite carries the source marks and the whole citation set; the doc
 * sprite carries this document's own markers, status marks and tab symbols. A
 * symbol lives in exactly one of them.
 *
 * THE ONE `dangerouslySetInnerHTML` IN THE APP. Two things now reach it, and
 * they are not the same kind of thing:
 *
 * 1. **The two sprites** — static build-time assets authored by the skill and
 *    inlined by the bundler. There is no interpolation; nothing fetched or
 *    generated can reach them.
 *
 * 2. **`#doc-icons`** — marks minted at init for sources the skill has no
 *    built-in symbol for, fetched from the source's own site. That IS foreign
 *    markup, and the invariant survives only because it is sanitised OFFLINE,
 *    in `assemble.mjs`, against an element and attribute allowlist, before it
 *    is ever written into the page. The rule is: this component trusts
 *    `#doc-icons` because a document containing an unsanitised one was never
 *    written. Enforcing it at publish rather than at render is deliberate —
 *    a run that cannot sanitise a mark drops it and ships a monogram, which
 *    is a smaller loss than a page that must be trusted at read time.
 *
 * The `<style>` case is why an allowlist and not a blocklist: Pact's own
 * favicon ships `path { fill: #0f0e0d }`, and a rule like that inlined into
 * the page is not scoped to the sprite — it repaints every path in the
 * document.
 *
 * Rendering them as a component rather than having `assemble.mjs` paste them in
 * means the icons are present in dev, in the prerender and in the published
 * file from one declaration.
 */

import brand from '../sprites/brand.svg?raw'
import doc from '../sprites/doc.svg?raw'
import { useDoc } from './doc-context.tsx'

export function Sprites() {
  const { icons } = useDoc()
  return (
    <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: brand + doc + (icons ?? '') }} />
  )
}
