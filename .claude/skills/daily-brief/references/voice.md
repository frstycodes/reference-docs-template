# Voice, typography, painting, floor

## Typography

| Role | Stack |
|---|---|
| Serif | `'Exposure',Georgia,'Times New Roman',serif` |
| Sans (default) | `-apple-system,BlinkMacSystemFont,'Manrope',system-ui,sans-serif` |
| Mono | `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace` |

**Serif is rationed** to exactly four things: the hero title, the blurb, section
titles (`.h`), and the all-done line. Never body copy, eyebrows, item titles,
tags, times, or metadata. Weights 400 and 500 only — never bold. Sentence case
everywhere except mono eyebrows.

Icons and avatars sit on `vertical-align:middle` — never a hand-tuned negative
offset.

## Voice

- The blurb states today's **situation** and lands a light pun, usually by tying
  the day's work to the painting above it. Never a count.
  > Friday, and the calendar is as calm as the harbour — one standup, late in the
  > evening. Everything still open is, fittingly, a shipping problem.
- Every paragraph names a person, a document, or a decision. "Ivan opened a
  starter doc and Nick piled on thoughts" beats "there is ongoing discussion."
- Say why it's theirs: "As the frontend owner, you can turn that into a proposal."
- Section titles are verb-led and plain, two or three words.
- Two to three sentences per item. Hard ceiling.
- No AI narrator — never "I noticed", "I've summarized", "Here's your brief".
- No exclamation marks except the cleared-the-list line.

## Painting

Public domain, free, no API key. Seed the pick on `YYYY-MM-DD` so it is stable
all day. Cache to disk and keep the last good one — a dead CDN must never blank
the hero.

```
Art Institute of Chicago
  https://api.artic.edu/api/v1/artworks/search?q={q}
    &query[term][is_public_domain]=true
    &fields=id,title,artist_title,date_display,medium_display,image_id,thumbnail
  image: https://www.artic.edu/iiif/2/{image_id}/full/1400,/0/default.jpg
  ⚠ the IIIF image host 403s without an `AIC-User-Agent` header (the JSON API doesn't).

The Met
  .../v1/search?q={q}&medium=Paintings&hasImages=true → objectIDs
  .../v1/objects/{id} → isPublicDomain, primaryImageSmall, title, artistDisplayName, objectDate
  use primaryImageSmall; the originals are multi-MB

Cleveland Museum of Art
  https://openaccess-api.clevelandart.org/api/artworks/?q={q}&cc0=1&has_image=1&type=Painting
```

- **Landscape only** — check the downloaded file's real pixel dimensions;
  collection metadata lies and a portrait gets mauled by the 16:9 frame.
- Prefer figurative work: landscapes, interiors, harbours. A clear focal subject
  beats an empty vista.
- Reject martyrdoms, battles, nudity, anything gruesome. It's 7am.
- **Base64-embed it**, as you do every image in the brief. The museum host is
  simply the loudest case — it 403s without a custom header a browser `<img>`
  cannot send — but the published page's CSP blocks external requests anyway, so
  a live URL never loads whatever the host would have said. Icons are inline SVG
  for the same reason. The schema requires a `data:` URI here; there is no way to
  write a live URL into the hero even by accident.
- Credit format: `{title}, {artist}, {date}. {medium in lowercase}`

For `scope: project`, the painting is picked and blurbed exactly the same way —
seeded on the date, not on the project.

## Floor

- Responsive to 360px: rails hide, grids go single-column, hero title drops to
  ~64px, the shared tooltip is suppressed.
- Visible `:focus-visible` ring in `--accent`.
- `prefers-reduced-motion` kills every animation, transition, confetti, and sound.
  The components already handle this — it is resolved once at the root. There is
  **no mute toggle**; reduced-motion is the only sound switch.
- `--ink-3` on `--page` clears 4.5:1.
- Every URL is host-allowlisted at render, not while authoring: a link whose host
  is not in `#doc-allowlist` comes out as plain text. That is a backstop, not a
  licence — write real permalinks.

## Hard don'ts

- Never inject a model-generated string as markup. Prose carrying emphasis or
  links is a list of typed runs; the renderer maps each variant to one element,
  and there is no path by which authored text becomes HTML.
- No `localStorage` — in-memory state only.
- No second accent colour. No semantic red/green/blue. `--accent` does exactly
  three jobs: hero title, star badges, one filled tag per section. A `.tag` is a
  quiet serif-italic byline by default; `.tag.fill` is the single accent chip,
  reserved for genuine priority ("blocks V1"), never a category label.
- No emoji anywhere.
- No progress rings, streaks, scores, or "productivity" metrics.
- No 3-up card grid. No gradient hero. No big-number stat blocks.
- No bold weights, no uppercase outside mono eyebrows.
- At most two boxed cards on the page (the feature and the schedule).
- Never reuse Dia's wordmark, dot mark, sign-off, `dia-report://` scheme, or the
  "With love from BCNY" line. The yellow was sampled from their render — change it
  before anything public.
