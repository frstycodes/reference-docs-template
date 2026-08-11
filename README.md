# reference-docs

A living document per project, and a daily brief — built from Slack, GitHub,
Gmail, Calendar, Drive, Figma, your task tracker and the repo itself. Each one is
a single self-contained HTML page, published as a private Claude Artifact.

**This is a template.** You do not clone it; you create your own private copy.
Paste this into Claude Code:

    do https://github.com/frstycodes/reference-docs-template/blob/main/BOOTSTRAP.md

## Your repo is private, and that is the whole guard

A document bakes in private channel names, email content, compensation figures
and colleagues' avatars. It is all committed. Repo visibility is the only thing
protecting it — do not make the repo public, and think before adding a
collaborator.

## Layout

```
.claude/settings.json    lets Claude publish and read back Artifacts without asking
.claude/skills/          four skills; they load in any session that includes this repo
  project-doc/           builds and refreshes a living document
  project-doc-setup/     first run: interview, first build, schedule
  daily-brief/           builds the standalone brief and the Today tab's data
  daily-brief-setup/     first run for the standalone brief
app/                     the React app both surfaces render from
  src/__external/        a complete worked example of a document's files
project-docs/<name>/__external/    one directory per project — this is your data
daily-brief/__external/            the standalone brief
scripts/update.mjs       pull newer skills and app from the template
scripts/persist.mjs      commit and push a run's changes
```

**A document owns exactly one directory.** That is why an update can replace
`.claude/skills/` and `app/` wholesale without touching your work.

## Working on it locally

```bash
cd app && npm ci
DOC=<name> npm run dev        # live view of a real document
DOC=<name> npm run typecheck
npm test
```

`npm run dev` with no `DOC` serves the reference set in `app/src/__external/` —
a complete, valid document that the test suite validates, which is what makes it
a safe thing to copy.

## Updating

See [`UPDATE.md`](UPDATE.md).
