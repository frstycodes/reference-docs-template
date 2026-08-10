# Component catalog

> **This describes what the parts ARE, not what to emit.** The brief is rendered
> by React components in `app/src/components/brief/`, from data —
> `#brief-data`, whose schema is
> [`app/src/schema/brief-data.ts`](../../../../app/src/schema/brief-data.ts)
> and is authoritative. Both scopes go through the same components; you write the
> same JSON either way, and `meta.scope` decides what surrounds it.
>
> There used to be two representations of this design — markup templates here and
> components there — kept in agreement by hand. There is one now. The schema names
> its fields after the classes below, so a rule stated here still tells you what a
> part is for; it just no longer tells you how to spell it.

Drop any optional part that has no data. If a section would be empty, it does not
exist: no zero-states, no "Nothing here!" cards, no placeholder rows. A quiet day
gets a short page — `.min(1)` on every section list enforces it rather than
trusting you to remember.

The renderer has five section kinds — `todos`, `updates`, `schedule`, `reads`,
`prose`. An invented one-off section is a `prose` section with its own eyebrow
and title; there is no path by which new markup enters the page.

## Page skeleton

Not yours to emit. `scope: all` renders the grain, the sprites, the hero, a
`<main class="wrap">` around the feature and sections, and the footer.
`scope: project` renders the same run without the grain and without the `<main>`,
because the host document owns both. The hero sits outside `<main>` either way —
the rails scroll away with the painting, so it is not part of the measure.

`scope: project` is also not a page. It is data handed back to `project-doc`,
which renders it inside its Today tab; `brief-assemble.mjs` refuses it.

## Hero — `hero`, `meta`

Rails live **inside** the hero and scroll away with the painting; the title sits
**on** it. The date comes from `meta.date`, the clock is live, and the title is
"The {`meta.weekday`} Brief".

```
hero.art.src      the painting, a data: URI (see "The art" below)
hero.art.alt      what it shows — real alt text, not the title
hero.art.credit   "Title, Artist, Date. medium in lowercase"
hero.blurb        one or two sentences, a situation with a pun
```

## Section shell (every section)

Left rail is sticky: eyebrow, title, optional lead. Content on the right.

```
id        unique on the page
eyebrow   MONO EYEBROW
title     verb-led, two or three words
lead      optional, one sentence
kind      todos | updates | schedule | reads | prose
```

## Feature — "Push your work forward"

The day's single highest-leverage move. One boxed card, directly under the hero,
before everything else. Carries one of the page's two star badges. Absent on a
quiet day — do not manufacture one.

The left column carries the section name in **serif** — no mono eyebrow here —
and the right column carries `topic` as a sans title above the paragraph.
Avatars go at the **end of the paragraph**, never in the left column where the
badge would cover them. The badge hangs off the card's bottom-left edge and never
expands the card.

```
feature.topic    the move, verb-led — the actual headline
feature.body     2–4 sentences as inline runs, naming people, docs, PRs
feature.prompt   a StarPrompt (see "Star badges")
```

### Inline runs

Prose that carries emphasis, links or avatar chips mid-sentence is a list of
typed runs, never a string of markup:

```
{t:'text',   text}            plain
{t:'b',      text}            the key noun
{t:'link',   text, href}      href is checked against #doc-allowlist at RENDER —
                              a URL that does not clear it renders as plain text,
                              not as a link
{t:'people', people:[…]}      avatar chips mid-sentence
```

`feature.body`, `Update.d`, `ScheduleItem.dd` and a `prose` section's `body` are
runs. A to-do's `d` is a plain string — it carries no inline markup by design.

## To-do — `kind: 'todos'`

The whole row is a hover surface: clicking anywhere toggles the item, links,
buttons and the checkbox excepted. Checking plays a rising blip and a confetti
burst; clearing the list plays a chime and reveals the all-done card.

```
id       unique within the section — the checkbox state is keyed on it
title    what is waiting on them
href     optional permalink; allowlisted at render like every other link
tag      optional, e.g. "Blocks 3"
d        two or three sentences, plain text
cites    chips, after the title
people   avatar chips, after the title
prompt   required — every to-do gets a "start working" button
rot      hand-varied, roughly -4 to +3
```

`rot` is per-item and hand-varied. Uniform tilt reads as a mistake; varied tilt
reads as pinned on. Vary it across the list.

### The "start working" button

**Every to-do gets one.** A to-do tells the reader what is waiting on them; this
hands them a running start instead of a link they still have to turn into a
question. It appears on row hover and on focus, and withdraws once the item is
checked — you do not start a task you have finished.

Copying runs through a hardened ladder, so it can never end on a dead "copy
failed": worst case it leaves the text selected and says `press ⌘C`.

**Writing `prompt.prompt` is the whole feature.** A prompt that just restates the
title is worse than no button. Write it as the reader would type it, in the first
person, and include:

1. **Who and where** — their role and the repo (`I am the frontend contractor on
   northwind/meridian.`).
2. **The specific artefact**, with its real URL, number and branch — the PR, the
   tracker item, the file path. Not "the review screen"; `apps/web/src/routes/…`.
3. **What is actually being asked**, stated as the open question rather than a
   vague task. Where the record already narrows it to a few options, say so and
   ask which — a prompt that offers the fork gets a decision back instead of an
   essay.
4. **How to check the work** — the project's own commands (`pnpm check-types`),
   because a prompt that ends at "make the change" hands back something unverified.
5. **What to hand back** — the reply to post, the summary to send. The task is
   not done when the code changes; it is done when the person waiting has heard.

Never invent a path, a branch or a command. Everything in the prompt is something
the sweep actually read; a prompt built from guesses sends the reader somewhere
that does not exist.

`prompt.aria` names what the prompt is about, because "start working" alone tells
a screen-reader user nothing.

## Numbered update — `kind: 'updates'`

Read-only news, numbered because the list is ordered by weight, not by chance.

```
title    what changed
href     optional permalink
tag      optional label — "Decision", "Shipped"
d        two sentences, as inline runs
cites    chips, at the END of the paragraph
people   avatar chips, at the END of the paragraph
```

Keep the placement difference: on a **to-do** the chips and avatars sit after the
title; on an **update** they sit at the end of the paragraph.

## Schedule — `kind: 'schedule'`

Two flat columns, both top-aligned — no card background, no divider on desktop.
Times sit left as pills; detail at the same top edge on the right, star badge
hanging off its bottom-right. Clicking a time selects it. Carries the page's
second star badge — on the **selected item's** `prompt`.

```
time      compact, as it appears in the list — "9:15p"
event     the name in the list
dt        the detail line, spelling the range out — "Standup — 9:15 PM – 9:45 PM"
dd        who's on it, what to bring — inline runs, so the meet link is a run
startIso  drives the live countdown
endIso    optional
prompt    THIS meeting's "Prep me" — a StarPrompt, see "Star badges"
```

**Write a `prompt` per item, not one for the section.** Prepping for a standup
and prepping for a client review are not the same request, and a badge that
copies the same text whichever meeting is selected is worse than no badge — the
reader pastes it and gets a prompt about somebody else's meeting. `section.prompt`
still renders as a fallback for briefs written before items had their own; do not
write one.

The countdown is computed from `startIso`. The old shell hardcoded its target
date, so every brief after that evening counted down to a moment in the past;
there is nothing left to hardcode.

## What I learned — `learned`

A strip after the sections, above the footer. Renders only when the run changed
its memory; a morning that learned nothing shows nothing.

```
kind   rule | watching | retired
text   the rule itself, one line, naming a pattern rather than an instance
why    the evidence, one line — optional but almost always worth it
```

`rule` is the only kind that changed behaviour today, and it is accented to say
so. `watching` is the agent thinking out loud; `retired` is it taking something
back. An Observation dropped for going 14 days unreinforced is `retired` too —
it was disclosed as `watching`, so it is taken back the same way. Write `text` as
the rule reads in memory, so the reader can find it there.

**This is the disclosure the whole memory design rests on.** See
[`memory.md`](memory.md).

## Reading item — `kind: 'reads'`

```
kicker   MONO KICKER
title    doc title
url      the whole card is the link
desc     why it matters to YOU specifically
icon     optional sprite id, decoration inside the already-linked card
```

## All-done card

Not authored — it is part of the to-do section. When every box is checked the
rows blur out and it fades up centred over them, with a staged reveal, a confetti
burst and a chime. The checked circle greys to `--ink-4` rather than filling
accent: a finished row recedes, it does not shout.

## Citation chip — `cites`

Never a bare decorative icon. Every item that came from somewhere carries a chip
naming where — the same chip `project-doc` uses in its tabs, so the Today tab and
the Timeline tab cite things identically.

```
key      unique; also the key into #doc-previews
kind     slack | pr | commit | gmail | cal | drive | tracker | figma | path |
         thread | link
raw      what the project calls it in plain text — "PR #53", "BEAD-0082"
url      optional; linked only if it clears the allowlist at render
preview  truthy means #doc-previews carries a payload under `key`
```

The chip renders from its **kind**, so an item you can name but not link still
gets its icon, unlinked, with no fabricated href. An unknown kind degrades to
`link` rather than failing the page. The kinds, the resolution rules and the
per-kind preview fields are the "Citations" section of
[`project-doc/references/sections.md`](../../project-doc/references/sections.md);
that is the one spec both skills follow.

A chip whose key has a payload opens a hover card, built with no network request.
Return the payloads alongside the brief — under `scope: project` the caller
merges them into its own `#doc-previews`, and under `scope: all`
`brief-assemble.mjs` takes them with `--previews`.

Tag each **item**, not the section — one list often mixes a Slack ask and a
GitHub PR. Never put a brand icon on a section eyebrow.

**`.sico` is retired.** It did this job with a hand-picked icon, no kind, no
unlinked fallback and no card, and it left the brief looking less sourced than
every other surface in the family. A read's `icon` survives for the one case it
was right about: decoration *inside* something already linked.

## Avatar chips — `people`

```
name     full name; shown on hover
initial  1–2 characters, the monogram fallback
src      optional — a data: URI
```

- **Every avatar is embedded, never linked.** The brief is published as an
  Artifact, and its CSP blocks every external request — a `ca.slack-edge.com`
  URL is not a picture that loads, it is a request the browser attempts, fails,
  and falls back from. The reader sees the monogram either way; embedding is
  what actually puts the face on the chip. The schema rejects an `http(s)` src
  outright, and the assembler strips any that slips through.
- **Fetch the `_72` variant, then base64 it.** Slack's API hands back
  `…_original.png`, which is around 250 kB against 6 kB for `_72` — a fortyfold
  difference that used to cost only bandwidth and now costs page weight, because
  the bytes live in the file. Rewrite the URL before fetching:
  `…_original.png` → `…_72.png`.
- Write the data URI plainly wherever the person appears. The assembler hoists
  every distinct face into one `#doc-avatars` block and leaves an `avatar:<id>`
  reference behind, so citing the same nine people eighty times costs nine
  images, not eighty.
- Someone with no picture is a monogram by design, not a gap to apologise for.
  Omit `src` and give the `initial`.

## Footer — `footer.sources`

Prose, not a nav bar: real "and", italic *your*, every source a live link. List
only the sources you actually drew on today.

```
name   "Slack"
icon   sprite id — i-slack, i-gmail, i-cal, i-github, i-drive
url    the source's home
```

The tilts were `Math.random()` in the old shell, which cannot survive hydration;
they are derived from the source name now, like the citation chips.

## Star badges — `StarPrompt`

- **Two per page, maximum.** One per section. In practice: the feature card and
  the schedule card. The schedule's belongs to whichever meeting is selected, so
  it is still one badge however many meetings the day holds. To-do buttons are
  not star badges and do not count.
- Clicking copies the prompt; hovering shows it in a popover so the reader knows
  what they are getting before they take it.
- Badges sit at a hand-pinned angle and swing further on hover with a prismatic
  sheen. Label is serif italic, counter-rotated.
- The prompt is written **to the reader's agent**, in full, with enough context to
  act without this page. Not a summary of the item — an instruction.

```
head    tooltip heading — "Start a chat about this"
prompt  the whole thing, first person
aria    what it is about
```

## The art

`hero.art.src` is one field, written once, and it is the only large data URI you
author by hand. Do not paste the base64 while drafting the rest of the brief —
write the JSON first, then fill this field last, or every edit in between drags a
quarter of a megabyte through it.
