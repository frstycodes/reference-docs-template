/**
 * Turn whatever a payload carries into something an `<img>` can use.
 *
 * Three forms reach here: `avatar:<id>`, a reference into `#doc-avatars`, which
 * is what a published document actually carries; a bare `data:` URI, which is
 * what authoring data and un-hoisted fixtures carry; and anything else, which
 * is a remote URL the CSP would block, so it resolves to nothing and the caller
 * renders its monogram.
 */
export function avatarSrc(value: string | undefined, store: Record<string, string> | undefined): string | undefined {
  if (!value) return undefined
  if (value.startsWith('avatar:')) return store?.[value.slice('avatar:'.length)]
  if (value.startsWith('data:')) return value
  return undefined
}
