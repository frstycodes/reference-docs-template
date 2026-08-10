/**
 * The one image a card may carry.
 *
 * It is either bytes already in the document — a base64 data URI baked into the
 * payload, so no request, no host, nothing to allowlist — or a URL whose host
 * clears the allowlist. Anything else, and any load error, becomes a monogram,
 * so a blocked or dead CDN can never leave a hole in the card. Under the
 * Artifact's CSP the remote case is blocked outright, which is exactly why the
 * error fallback is not optional.
 */

import { useState } from 'react'
import { useDoc } from '../doc-context.tsx'
import { avatarSrc } from '../../lib/avatar-src.ts'

export function Avatar({ url, name }: { url?: string; name?: string }) {
  const { avatars } = useDoc()
  const [failed, setFailed] = useState(false)
  const initial = (name ?? '?').trim().charAt(0) || '?'
  const src = avatarSrc(url, avatars)

  // No resolvable picture is a designed state, not a hole: people outside the
  // workspace genuinely have no face here.
  if (failed || !src) return <span className="cprev-av mono">{initial}</span>
  return <img className="cprev-av" alt="" src={src} onError={() => setFailed(true)} />
}

/** An avatar and a name, the foot band's identity unit. */
export function Who({ name, url }: { name?: string; url?: string }) {
  return (
    <span className="cprev-who">
      <Avatar url={url} name={name} />
      {name ?? 'unknown'}
    </span>
  )
}
