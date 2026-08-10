/**
 * The registry a build uses when it must not carry any document's cards.
 *
 * `vendor.mjs` aliases `@external/cards.tsx` here, because a vendored bundle is
 * rendered for documents that have no cards of their own — baking the reference
 * set's Vercel card into it would hand that card to every one of them.
 */

import type { CardRegistry } from './cards.ts'

export const cards = {} satisfies CardRegistry
