# Publishing and persisting

The document is hosted as a **Claude Artifact**: private by default, one stable
URL, republished in place every run. The Artifact is the delivery. The **repo is
the state** — see [`update-protocol.md`](update-protocol.md) for the editorial
protocol and `SKILL.md` for the layout.

## The loop

1. **Read** `project-docs/<name>/__external/doc-state.json` for `cursors`,
   `lastRun`, `lastDaily` and `artifactUrl`, and `doc-data.json` for the content.
   These are files. Do not fetch the published Artifact to find out what is in
   it.
2. **Patch** the JSON per the refresh protocol — cheap-tier field flips and
   appends every run, the daily tier when `lastDaily` says so.
3. **Build.** `node app/scripts/build.mjs <name>`. Not clean → do not publish.
4. **Publish** with the `Artifact` tool, passing the existing
   `doc-state.artifactUrl` as `url` so it redeploys in place. A first publish has
   no URL; write the returned one back into `doc-state.json`.
5. **Persist.** `node scripts/persist.mjs "docs(<name>): refresh <date>"`, **from
   the docs repo root**. A refresh has the project's own repo cloned too, and this
   commits whatever repo it runs in.

## Rollback

There is no `.bak` file and no restore step. Step 3 failing means nothing was
published and nothing was committed, so the repo still holds the last good
state — `git checkout -- project-docs/<name>/__external/` discards the bad patch.
A bad publish that already committed is `git revert` plus a rebuild.

This is the whole reason the repo is the state: the backup is a real one, it is
diffable, and it did not have to be remembered.

## What used to be here

A `curl` of the Artifact, a slicer script to cut the JSON blocks back out of the
rendered HTML, a patch, a validate and a `.bak`. All of it existed because a run
had nowhere durable to write. It has a repo now.
