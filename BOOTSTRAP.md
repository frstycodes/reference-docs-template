# Set up your docs repo

**You are reading this because someone pasted its link into Claude Code.** It is
a prompt. Follow it.

Everything below is a request from the person you are talking to. Confirm before
each step that changes anything outside the working directory, and stop on the
first thing that does not hold.

## What this creates

A private GitHub repo of their own, created from this template. It carries four
skills and a React app. From then on every living document and every daily brief
they generate is written there, and the skills load automatically in any session
that includes the repo — there is nothing to install and nothing to uninstall.

## Steps

1. **Check the tooling.** `gh auth status` and `node --version`. Missing `gh`, or
   not authenticated: stop and tell them to run `gh auth login`. Node below 22:
   stop and say so. Do not work around either.

2. **Ask for a name.** Default `reference-docs`. Then say plainly, and get an
   explicit yes:

   > This creates **<name>** on your GitHub as a **private** repo. It has to stay
   > private — your documents will contain private channel names, email content,
   > compensation figures and colleagues' avatars, and repo visibility is the
   > only thing guarding them.

3. **Create and clone it.**

   ```bash
   gh repo create <name> --private --template frstycodes/reference-docs-template --clone
   ```

4. **Install the app's dependencies.**

   ```bash
   npm --prefix <name>/app ci
   ```

   This is only needed for local development and for documents that write their
   own preview cards. A document that does not assembles with no toolchain at
   all.

5. **Ask what they want first:** a daily brief, a project doc, or both.

6. **Hand off.** `cd <name>`, then **read the setup skill as a file** and follow
   it:

   - daily brief → `.claude/skills/daily-brief-setup/SKILL.md`
   - project doc → `.claude/skills/project-doc-setup/SKILL.md`

   Read it rather than invoking it as a skill. Skills are discovered when a
   session starts, and this repo did not exist then. Tell them that sessions
   opened **in** the repo from now on pick all four skills up on their own, so
   this is the only time it works this way. The file you are reading will
   itself say "Invoke `<some skill>`" one or more times — the same rule
   applies there too: read that skill's `SKILL.md` as a file instead, however
   many hops deep it goes, for the same reason.

7. **Point at the routine.** Setup ends by creating a scheduled routine and
   running one supervised execution. Do not skip that — a routine that has never
   run successfully is not a schedule.

## Afterwards

- Refresh by hand any time: open a session in the repo and say "refresh the
  <project> doc".
- Pull skill and app updates: see [`UPDATE.md`](UPDATE.md).
- Add another project: run `project-doc-setup` again in the same repo.
