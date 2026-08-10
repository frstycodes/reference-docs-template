# Update your docs repo

**A prompt.** Run it in the docs repo when you want newer skills or a newer app.

```bash
node scripts/update.mjs
npm --prefix app ci     # always — replacing app/ took node_modules with it
```

Both lines, every time. The update deletes `app/` before copying the new one, so
`app/node_modules` goes with it; skip the install and the next command in this
file has no `tsc` and no `vite` to run.

This replaces `.claude/skills/` and `app/` outright from the template and stamps
`.template-version`. It never touches `project-docs/` or `daily-brief/` — your
documents live only in `__external/` directories, and nothing there comes from
the template.

You're running this inside a repo that already carries private channel names,
email content, compensation figures and colleagues' avatars, committed. An
update doesn't touch any of it — but it's not the moment to make the repo
public or add a collaborator either.

Then, before trusting it:

```bash
cd app && npm run typecheck && npm test
```

Commit the result. If a document has its own `cards.tsx`, typecheck it too:
`cd app && DOC=<name> npm run typecheck` — an app update can change the card
contract, and that is the one place a document holds code.
