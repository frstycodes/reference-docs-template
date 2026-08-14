# Scheduling the unattended refresh

The payoff of the whole setup is a document that stays live without anyone
re-running it. That means a **Claude Code cloud routine** — created in
claude.ai/code, where GitHub access exists and a scheduled agent survives
detached. This step is **opt-in**: ask once, default the cadence to something
calm, and never force it.

## What NOT to use

- **`CronCreate`** (the in-session scheduler) is session-only: in-memory, gone
  when the session ends, auto-expires after 7 days. It cannot run a durable
  background refresh. Never use it for this.
- **A cowork / `scheduled-tasks` task** runs in an environment without the GitHub
  access the refresh needs. Wrong tool.

The only correct target is a Claude Code cloud routine.

## Ask, then create

Ask: *"Keep this live? I can refresh it every morning so it's current when you
open it."*

**Default the cadence to daily**, at an off-minute so a fleet does not all wake
together. **One hour is the floor** — a routine cannot be scheduled more often
than that, so do not offer a 15- or 5-minute doc however live the user wants it.
Hourly is available and the document supports it — most hours publish
nothing, because the expensive synthesis is self-gated on `doc-state.lastDaily`.
But routines have a per-account daily **run** cap, and a run that publishes
nothing still counts against it. Three projects at hourly is 72 runs a day.
Offer hourly for the one project the user actually watches; default the rest to
daily.

## The routine

| Field | Value |
|---|---|
| Repositories | **the docs repo and the project's own repo** — both. The docs repo is where the document is read and written; the project repo is a source. |
| Connectors | trim to the sources in `config.json`. All connectors are included by default and a routine can use every tool from an included one, including writes, without asking. |
| Prompt | self-contained: refresh `project-docs/<name>/`, publish, persist, then sync the template. It runs with no human present. |

The prompt must end with the persist step, spelled out — and it must name the
directory, because **two repos are cloned** and `persist.mjs` commits whatever
repo it is run in:

    cd <the docs repo> && node scripts/persist.mjs "docs(<name>): refresh $(date +%F)"

It stages everything (`git add -A`), so run from the **docs repo root**. Run it
from the project's repo and it commits the project's working tree and leaves the
document's patched JSON exactly where the run found it.

A run that publishes but does not persist has done nothing durable — the next
run clones the same cursors and re-reports what it already reported.

After that, once a day, the prompt syncs the template so the user keeps getting
new skills and a new app unattended — the exact steps, and what to do when they
fail, are in
[`update-protocol.md`](../../project-doc/references/update-protocol.md) under
"Take the template's updates". Order matters: sync last, never before the
document is published.

## Supervised dry-run

**Run one now and wait for it.** This exercises the real environment: the cloud
env's connector set, `Artifact` access, and — the first time any routine runs —
whether a push to `main` is accepted or falls back to a branch and a merge.
`persist.mjs` handles both, but you need to see which happened, because the
fallback opening a PR per run is worth knowing about before it does it daily.

1. Trigger a single execution and wait.
2. Read what it published, and read what `persist.mjs` reported.
3. A source skipped in the cloud env: drop it from `config.json` with the user's
   ok, or tell them how to connect it there. Then re-run.
4. **Only go live once a dry-run published and persisted cleanly.** A routine
   that has never succeeded is not a schedule, it is a 7am surprise.

## When you cannot create it

Local CLI cannot provision or verify a cloud routine. Do not pretend to. Write
the spec to `project-docs/<name>/routine.md` — cadence, the two repositories, the
connector list, the prompt including the persist line — and tell the user to
create it at claude.ai/code/routines, and that its first run self-verifies.
