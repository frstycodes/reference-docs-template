/** Types for the sanitiser. `mint-icons.mjs` stays plain JS because both
 *  assemblers run it on bare node with nothing installed; this is only so the
 *  app and its tests can import it without going untyped. */

export interface MintedIcon {
  viewBox?: string
  body?: string
}

export function sanitizeSymbol(
  id: string,
  entry: MintedIcon | undefined,
  warn?: (message: string) => void,
): string | null

export function mintIcons(
  iconsJson: Record<string, MintedIcon> | undefined,
  warn?: (message: string) => void,
): { markup: string; ids: Set<string> }
