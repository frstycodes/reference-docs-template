---
name: project-doc-setup
description: One-time interactive setup for a project's living document — interview the user for sources and goal, discover connected tools, write the config, build the first document, and optionally schedule an unattended refresh as a Claude Code cloud routine. Use when a user wants to set up, onboard, configure or start a project doc / project brief for a repo for the first time, or when project-doc reports no config exists yet.
---

`project-doc-setup` is the front door to the `project-doc` skill. It runs **once
per project**: it decides *what* the living document watches and *why*, writes
the config, hands off to `project-doc init` to build, and — if the user wants —
puts the document on a schedule so it stays live without anyone re-running it.

It is deliberately separate from `project-doc` because it has a different
lifecycle and a different failure mode. Setup is conversational, run once, and
decision-heavy; a bad setup is a bad *interview*. `project-doc` is a builder, run
many times, and a bad run is a bad *build*. Keeping them apart keeps each honest.

**Setup owns the decisions; `project-doc` owns the execution.** Nothing here
writes document markup or `#doc-data` — it writes the config and drafts the goal,
then invokes `project-doc init`, which assumes a valid config and builds.

## The arc

Run these in order. Each step is detailed in the references; do not summarise
them away.

1. **Claim the document directory.** A document lives at
   `project-docs/<name>/__external/` in this docs repo — never in the project's
   own repo. `<name>` is a slug the user picks; default to the project repo's
   name. If that directory already exists, this is not a first setup: say so,
   and point the user at `project-doc` to refresh or at editing `config.json`
   directly. Never silently overwrite a document.
2. **Verify the repo is private.** `gh repo view --json visibility` must return
   `PRIVATE`. A document bakes in compensation figures, private channel names,
   client email content and avatars; repo visibility is the only thing guarding
   them, because everything here is committed. On a public repo, stop and tell
   the user — do not offer to proceed. (The old guard was keeping the document
   out of git entirely; under repo-as-truth everything is committed, so this
   check replaces that guard one-for-one — it is not a relaxation.)
3. **Detect the environment**, and say it out loud. See "Environment" below —
   it decides whether step 8 can schedule and dry-run, or only writes a spec.
4. **Interview for sources**, then **draft and sharpen the goal.** Follow
   [`references/interview.md`](references/interview.md) exactly — the source menu
   is discovery-hinted and every inclusion is the user's explicit choice, and the
   goal is drafted from the sources just read, then grilled to a point. Two
   questions there are **never** answered by assumption: **which task tracker**
   the team uses, and **whether design lives in Figma**.
5. **Write the config.** Author `config.json` (schema in
   [`project-doc/references/config.md`](../project-doc/references/config.md)) at
   `project-docs/<name>/__external/config.json`, committed to the docs repo like
   every other file the document is made of. It is also baked inline into the
   document as `#doc-config` at build, but that inline copy is a rendering
   detail, not the state — **the repo is the state; the Artifact is the
   delivery.** Custom sources register against
   [`project-doc/references/source-contract.md`](../project-doc/references/source-contract.md).
   Seed `doc-state.json` with `{"format": 4, "lastRun": null, "lastDaily": null,
   "artifactUrl": null, "archiveArtifactUrl": null, "cursors": {}}` — empty
   cursors mean init reads each source from the beginning. **`format` must be
   4**: a document seeded at an older number is read by every later refresh as
   needing migration.
6. **Hand off, build, and publish.** Invoke `project-doc` in its `init` branch: it
   reads the config, sweeps every source **to the project's beginning**, builds the
   document, passes both gates — `assemble.mjs` for structure and
   `doc-coverage.mjs --init` for substance — and **publishes the first Artifact**,
   writing the returned URL back into `doc-state.json`'s `artifactUrl` — the file,
   not the `#doc-state` block baked into the built page, which the next build
   regenerates from the file and throws away
   (see [`project-doc/references/publishing.md`](../project-doc/references/publishing.md)).
   Init writes the whole of `project-docs/<name>/__external/` — see
   [`../project-doc/references/external-dir.md`](../project-doc/references/external-dir.md)
   for the file set. Do not re-implement the build. Init is the expensive run and
   the only one that ever reads the whole project — tell the user it will take a
   while rather than letting a long silence look like a hang. If it fails either
   gate, surface it and stop — a schedule pointing at a broken or threadbare build
   is worse than no schedule.
   **Warn about sharing:** the document is private by default, and its inline
   scope (channel ids, Gmail query) travels with it — *sharing the doc shares what
   it watches* (not credentials). Say this plainly.
7. **Persist, before anything is scheduled.** Run
   `node scripts/persist.mjs "docs(<name>): set up"` **from the docs repo root**.
   Nothing so far has committed anything: `config.json`, `doc-state.json` with the
   first `artifactUrl`, and the rest of `project-docs/<name>/__external/` are all
   sitting in the working tree. The routine step 8 creates clones the remote
   default branch, so a document that was never pushed does not exist as far as
   its own routine is concerned — it would find no `__external/` and stop. Confirm
   `persist.mjs` reported `pushed` or `merged` before continuing.
8. **Offer to schedule.** Opt-in, calm default cadence, and pick the **notify
   channel** (default Slack) — the routine sends the doc's stable URL there, but
   only on runs that produced a change. The routine clones both the docs repo
   and the project's own repo fresh each run, refreshes and republishes the
   document, and its prompt ends with the persist step — a run that publishes
   without persisting has done nothing durable. Follow
   [`references/scheduling.md`](references/scheduling.md): in Claude Code web,
   create the cloud routine and run one supervised dry-run against the real
   environment; run locally, write a ready-to-paste routine spec instead. Never
   strand the user with a built doc and no way forward.

## Environment

The refresh is meant to run **unattended, in the background** — and the right
home for that is a **Claude Code cloud routine** (claude.ai/code), because that
environment has GitHub access and survives detached. A cowork/session scheduled
task is the wrong tool: it cannot reach GitHub the way Code web can, and the
in-session `CronCreate` scheduler is session-only (7-day expiry, dies with the
session) — **never use it for this.**

Setup itself, though, runs wherever the user invoked it. Detect which:

- **Claude Code web (cloud):** step 8 can create the routine *and* run the
  supervised dry-run in the same environment the routine will use. This is the
  seamless path — interview → build → verify-in-real-env → live.
- **Local CLI (or anywhere else):** setup still builds the document fully, but it
  cannot provision or verify a cloud routine from here. Step 8 writes the routine
  spec to `project-docs/<name>/routine.md` and tells the user the
  one thing to do in Code web. State the environment plainly so the user knows
  which path they got — never pretend a local run scheduled anything.

## Done when

`config.json` and `doc-state.json` are **committed and pushed** by `persist.mjs`
from `project-docs/<name>/__external/`, and the config is also baked inline as
`#doc-config`; every chosen source is either a documented built-in or a
contract-valid `custom` entry; the goal is written into `#goal` from real source
evidence, not invented; the first document is built, `assemble.mjs` exits clean,
and it is **published as an Artifact** with the URL stored in
`doc-state.json`'s `artifactUrl`; the user has been told sharing the doc shares its
scope; and they have either a live cloud routine (verified by a supervised
dry-run that republished cleanly) or a written routine spec plus the one
instruction to activate it.
