---
name: daily-brief-setup
description: One-time setup for the standalone Daily Brief — ask what the brief covers and where it goes, build the first one, and optionally schedule it to rebuild every morning as a Claude Code cloud routine. Use when a user wants to set up, configure, or start receiving their daily brief / morning brief automatically on a schedule, or the first time they want a recurring brief.
---

`daily-brief-setup` is the front door to the `daily-brief` skill, the same way
`project-doc-setup` is the front door to `project-doc`. It runs **once**: it
decides what the standalone brief covers and where it is written, builds the
first one, and — if the user wants — schedules it to rebuild every morning
without anyone re-running it.

It is separate from `daily-brief` on purpose. `daily-brief` is a builder: it
renders *today* from scratch every run and overwrites its output. Setup is the
one-time conversation and the scheduling — a different lifecycle, kept apart so
the builder stays a builder.

**The standalone brief is the multi-project one** (`scope: all`): every calendar
event, inbox item, to-do and update across all projects. The per-project brief is
a different thing — it is a fragment `project-doc` embeds in its Today tab, and it
is configured there, not here. This skill only ever sets up the standalone brief.

## First, check this is the one they want

A project doc **already contains a daily brief for its project** — that is its
Today tab, rebuilt every morning by the same skill. So somebody who set one up
and then asks for "a daily brief" often already has the brief they meant, and
setting this up gives them a second page and a second morning notification for
one project's worth of news.

Before the interview, say which is which and get an answer:

> Your project doc's Today tab is already a daily brief for that project. This
> one spans **every** project — one page for the whole day instead of opening
> each doc. Worth it if you are juggling a few; redundant if you have one
> project.

If they have exactly one project doc and no plans for a second, say so plainly
and let them decline. If they have several, or none and want a day view without
tracking a project, carry on. Their answer decides it — do not refuse to build
one because you judged it redundant.

## Why this is simpler than project-doc-setup

The brief is a **stateless snapshot**. There are no cursors, no surgical patch,
no backup, no rollback — each run rebuilds the whole brief for the current day
and overwrites the file. That collapses most of project-doc's machinery:

- **No `state.json`, no refresh protocol.** A scheduled run is just "invoke
  `daily-brief` with the saved config." Yesterday's brief is simply overwritten.
- **No source contract, no goal-finding.** The brief has a fixed set of sources
  and no accumulated record to keep honest.
- **Unattended failure is soft.** A source that is down produces a *thinner*
  brief with a noted gap — never a failed run, never a rollback. The worst case
  is an incomplete brief that tomorrow's run replaces.

## The arc

1. **Interview** — short, see below.
2. **Write `daily-brief/__external/config.json`** — the single standalone-brief
   config (schema below), committed to the docs repo like every other file the
   brief is made of. Not project-scoped: the standalone brief spans every
   project, so it lives beside the brief's own data rather than inside any
   project's repo.

   **Seed the memory.** Write `daily-brief/__external/memory/index.md` with the
   three headings and nothing under them:

       # Brief memory

       These rules take precedence over the skill's defaults. Where a rule and
       `references/components.md` disagree, the rule wins.

       Format, and when to write which: `.claude/skills/daily-brief/references/memory.md`.

       Every rule carries who wrote it — `(agent, 9 Aug)` or `(you, 7 Aug)`. A
       rule with no attribution is yours, and the brief never retires it.

       ## Rules

       ## Observations

       ## References

   The first run needs somewhere to write. Do not invent starting rules — a rule
   the reader never agreed to, disclosed as something the brief "learned", is worse
   than no memory at all.
3. **Build and publish the first brief.** Invoke `daily-brief` with `scope: all`;
   confirm it wrote a complete document, then **publish it as a Claude Artifact**
   and store the returned URL as `artifactUrl` in the config. The brief is
   stateless, so a scheduled run just rebuilds and republishes to that same URL —
   nothing to fetch back, no state to carry.
4. **Persist, before anything is scheduled.** Run
   `node scripts/persist.mjs "brief: set up"` **from the docs repo root**. Nothing
   so far has committed anything — the config with its first `artifactUrl`, and
   `daily-brief/__external/brief-data.json`, are sitting in the working tree. The
   routine step 5 creates clones the remote default branch, so a config that was
   never pushed does not exist as far as its own routine is concerned. Confirm
   `persist.mjs` reported `pushed` or `merged` before continuing.
5. **Offer to schedule** — opt-in, same cloud-routine pattern as
   `project-doc-setup`. See "Scheduling" below.

## Interview

Ask conversationally, one thing at a time. **Offer "decide for me" on every
question a good answer can be derived for** — take a sensible default now and let
it sharpen on later runs. Withhold it only where the answer is the user's to give
(their preference, their identity, where notifications go).

- **What the brief covers.** `scope: all` by default; the answer goes in the
  config's `brief` block. The user may narrow it — specific calendars, Slack
  channels, people, or a Gmail query. **Do not ask for a raw Gmail search
  string:** present a default derived from their domain and let them add to it,
  or offer **"decide for me"** (watch the obvious senders now, refine which mail
  is project-relevant as real mail arrives). "Decide for me" here means: default
  to everything, and narrow only if the brief gets noisy.
- **Which hosts links may point at** — the `allowlist`. **Offer "decide for me"**:
  the schema sample's hosts plus their own Slack workspace host, derived from a
  permalink the user's chat connector already returns. Never leave it empty; see
  the schema below for what an empty one silently does.
- **Who the brief is for** — `you.name`, and the `timezone` the day is dated in.
  **Needs the user** for the name; derive the zone from their calendar and
  confirm it.
- **When it runs** (only if scheduling) — the morning hour. **Offer "decide for
  me"**: default an **off-minute** time like `07:07`, so a fleet of briefs does
  not all wake at `07:00`. This answer goes into the routine, not the config.
- **Where the link is sent** — the `notify` channel. **Needs the user**: only they
  know where they want their morning brief to land.

## Config schema

`daily-brief/__external/config.json` is an **external directory's `config.json`**
like any other — same file name, same schema
([`app/src/schema/doc-config.ts`](../../../app/src/schema/doc-config.ts)), same
required fields as a project's, because `daily-brief/__external/` is an external
directory and the contract for one is
[`project-doc/references/external-dir.md`](../project-doc/references/external-dir.md).
The schema is a **loose object**, so `artifactUrl` and `notify` — the two keys
only the brief has — are carried, not rejected. Write every key in the sample;
nothing at build time will tell you one is missing.

`sources.tracker.kind` earns its place even though the brief reads no sources
itself: it is the only thing that can tell Linear's `MER-431` from Jira's
`MER-431`, and without it every tracker citation falls back to the bead mark.
Three keys reach the page — `timezone`, `locale` and that one — because
`brief-assemble.mjs` prunes the config to them. `notify.target` and `you.name`
stay out of the published brief by construction.

```json
{
  "project": "Daily brief",
  "tagline": "Everything across every project, once each morning.",
  "timezone": "Europe/Lisbon",
  "locale": "en-GB",
  "you": { "name": "Ana Duarte", "role": "Platform — streaming and replay" },
  "brief": { "scope": "all" },
  "sources": { "tracker": { "kind": "linear" } },
  "artifactUrl": null,
  "notify": { "channel": "slack", "target": "#me" },
  "allowlist": ["github.com", "avatars.githubusercontent.com", "slack.com", "docs.google.com", "drive.google.com", "mail.google.com", "calendar.google.com", "meet.google.com"]
}
```

- `allowlist` — the hosts a citation URL must match to render as a link. **The one
  field a wrong config loses silently:** the schema defaults it to `[]`, the brief
  build takes no `--config` and so never validates one, and `isAllowed` then
  refuses every URL — so a brief with no allowlist builds, validates and
  publishes with exit 0 and every citation chip, source link and to-do href as
  plain text. Copy the hosts in the sample above, then add the user's own Slack
  workspace host (`<workspace>.slack.com`) and any host their own tools link to.
  `build.mjs` warns on an empty one; a wrong one it cannot see.
- `brief` — scope and filters, handed to `daily-brief` as its filter config.
  `scope` is always `all` for the standalone brief. Narrow it with the same keys a
  project's `brief` block uses — `slackChannels`, `githubRepo`, `gmailQuery`,
  `calendarMatch`, `trackerProject` (older configs spell that last one
  `pactProject`) — where an absent key filters nothing. They are defined in
  [`project-doc/references/config.md`](../project-doc/references/config.md), which
  is the authority; do not invent a key.
- `artifactUrl` — where the brief is published; each run republishes there in
  place. Null until the first publish. A project doc keeps this in
  `doc-state.json`; the brief has no state file because it has no cursors, so its
  one durable fact rides here.
- `notify` — where the morning link is sent (default Slack). **The brief notifies
  every run** — it is a morning nudge, unlike the project doc which notifies only
  on change.
- `project`, `tagline`, `timezone`, `you` — required by the schema; `locale` is
  optional. The brief page renders none of them; the **run** reads `timezone` and
  `locale` to date the day it is briefing, and `you` to know whose day it is.

There is no output-path key and no cadence key. The build writes
`.ignored/build/brief/brief.html`, a gitignored throwaway — the Artifact is what
the user opens — and the routine created in step 5 owns its own schedule, so a
cron string here would be a second copy that nothing enforces.

The config lives at `daily-brief/__external/config.json` in the docs repo,
beside the brief's own data. It is not a seed and the routine does not carry a
copy: the repo is the state, so a run clones it, reads the config, writes
`brief-data.json` next to it, and commits.

## Scheduling

Identical pattern to `project-doc-setup` — the same rules, for the same reasons:

- The schedule is a **Claude Code cloud routine** (claude.ai/code), because that
  environment has the connector access a background run needs and survives
  detached.
- **Never** use `CronCreate` (session-only, 7-day expiry, dies with the session)
  or a cowork/`scheduled-tasks` task (wrong environment).
- Opt-in. Default cadence calm (daily) and off-minute.

### The routine

| Field | Value |
|---|---|
| Repositories | **the docs repo only.** The standalone brief is `scope: all` — calendar, inbox, to-dos and updates across every project, all of it through connectors. No project repo is a source. |
| Connectors | calendar, mail, tracker, chat. Trim the rest. |
| Cadence | daily, early. |

The prompt ends with, run from the **docs repo root** — `persist.mjs` stages
everything in whatever repo it is invoked in:

    cd <the docs repo> && node scripts/persist.mjs "brief: $(date +%F)"

Then, still once a day and **only after that persist**, the prompt syncs the
template — same steps and same failure handling as
[`update-protocol.md`](../project-doc/references/update-protocol.md) under "Take
the template's updates". A repo whose only routine is the brief has no other
occasion to pick up new skills or a new app.

Yesterday's brief is simply overwritten — the brief is a stateless snapshot, so
the commit is a record, not a cursor. That is why an unattended failure is soft
here and hard in `project-doc`: a thin brief is replaced tomorrow, a lost cursor
is not.

Branch on where setup is running:

- **Claude Code web:** create the routine (it clones the docs repo, reads
  `daily-brief/__external/config.json`, runs `daily-brief`, republishes the
  Artifact, and sends the link to `notify`), then trigger **one supervised
  dry-run now** and confirm it republished a complete brief. Because the brief
  is a snapshot, "verify" is simpler than project-doc's — just: did it produce
  a full document, and did any source come back empty because it is
  unreachable *in the cloud env* rather than genuinely quiet? Surface any
  unreachable source and let the user connect it, before going live.
- **Local CLI:** build the brief, then write a ready-to-paste routine spec to
  `daily-brief/routine.md` and tell the user the one thing to do in Code web.
  Never report a schedule that was never created. State the environment
  plainly.

## Hard don'ts

The brief itself is `daily-brief`'s locked shell — this skill never touches its
CSS, JS, sprite or components, and never redesigns the brief. Setup writes config
and schedules; the builder builds.

## Done when

`daily-brief/__external/config.json` carries every key in the schema above —
including a **non-empty `allowlist`** — and is **committed and pushed** by
`persist.mjs`; the first brief is built as a complete standalone document **whose
citations render as links, not plain text**, and **published as an Artifact** with
its URL stored as `artifactUrl` in that committed config; and the user has either
a live cloud routine
(confirmed by a dry-run that republished a full brief and sent its link) or a
written routine spec plus the one instruction to activate it.
