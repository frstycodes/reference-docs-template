# First-live-run verification

Everything below the unit tests can only be checked live — publish, cloud routine,
connectors, the sandboxed Artifact. Work top to bottom; stop at the first hard
failure and fix before continuing. **Do the first run in Claude Code web**, not
local — that is the environment the routine will use.

## 0. Preflight (local, before web)

- [ ] `npm test` in `app/` → all pass (schema, fixtures, icons)
- [ ] `npm run typecheck` in `app/` → clean
- [ ] `node references/doc-coverage.test.mjs` → `24 passed`
- [ ] `node --check` passes on `assemble.mjs`, `doc-coverage.mjs`
- [ ] **The vendored bundle matches the app**: `npm run vendor` in `app/` leaves
      `references/app.js`, `app.css` and `prerender.mjs` unchanged in `git status`.
      A stale bundle is the one failure that looks like nothing at all — the
      document builds and publishes, just from last week's components.
- [ ] `assemble.mjs` runs against a fixture on a machine with **no `node_modules`**
      — that is the environment the cloud routine actually has

## 1. Setup (`project-doc-setup`, in Code web)

- [ ] `gh repo view --json visibility` returns `PRIVATE`; the document's home is `project-docs/<name>/__external/`
- [ ] Source menu pre-checks connected tools; **inclusion is your explicit choice**, not auto
- [ ] **Asked which task tracker** the team uses — no tracker assumed; `itemNoun` is the team's own word
- [ ] Figma offered **only** if the connector is present, with its no-history limit stated out loud
- [ ] Gmail: offered a plain-language default + "decide for me" — **never asked to type a raw query**
- [ ] Goal: drafted from real sources (README/pinned/kickoff), then grill-or-"decide for me"
- [ ] "Decide for me" offered on derivable questions, withheld on `you`/notify/consent
- [ ] Sharing caveat stated out loud: *sharing the doc shares its scope*

## 2. Init build + first publish

- [ ] Swept per [`references/init-protocol.md`](references/init-protocol.md): every source read to its **beginning**, threads and PR bodies opened, prose captured verbatim into `init-notes.md`
- [ ] Build writes `#doc-data` (JSON), runs `renderBody`, assembles the document
- [ ] `node references/doc-coverage.mjs <file> --init` → clean, or every unmet floor explained to the user (**never padded**)
- [ ] Spot-check the coverage claim by eye: pivots and incidents present, decisions name who decided, contradictions surfaced, first changelog entry is project news
- [ ] `assemble.mjs` wrote the file and reported no warnings — it refuses to write on any validation error, so a written file is a valid one
- [ ] **Zero external requests** with the network panel open — a blocked font, sprite or avatar degrades quietly and looks like a design choice
- [ ] Published as a **private** Artifact; **`doc-state.json`'s** `artifactUrl` now holds the returned URL — check the file, not the built page's `#doc-state` block, which the next build overwrites from the file
- [ ] `doc-state.json`'s `format` is **4**; `cursors` seeded at newest-seen per source
- [ ] Both sprites inlined (open the URL: brand icons — Slack/GitHub/Cal/Drive — are visible, not empty boxes)

## 3. Render fidelity + interactivity (open the Artifact)

- [ ] Opens straight into Today's painting — **no masthead**
- [ ] Dial bottom-right names the current tab; opens on hover/click/focus; arrows move tabs; Esc closes
- [ ] Deep link `#timeline` activates Timeline **and** scrolls
- [ ] **Timeline filters are multi-select**; `pivot` has its own chip and its own icon (arrow, not fork)
- [ ] Timeline spark heights + legend match the events; a month with all events filtered disappears
- [ ] State tiles filter; each count equals its group; a zero group's tile is disabled
- [ ] Gantt: one continuous today line, dated axis, bars link to lane items
- [ ] Callouts are **subtle** (faint accent wash, readable ink) — not bright-yellow slabs
- [ ] **Copy button works in the Artifact sandbox** (the hardened ladder) — copies, or falls back to selected text; never dead "copy failed"
- [ ] Copy tooltip lands **on** its button, not offset across the page
- [ ] Every resolvable citation chip is a link; hover cards open with no network request
- [ ] **Today's chips open cards too** — the brief's preview payloads were merged into `#doc-previews`, so Today is not the one tab whose citations go nowhere
- [ ] No `.sico` anywhere — the brief's old source anchor is retired in favour of `.cite`
- [ ] Each to-do carries a **"Start working"** button: appears on row hover *and* on focus, always visible on touch, gone once the item is checked
- [ ] Its prompt copies in the Artifact sandbox (hardened ladder) — never a dead "copy failed"; falls back to `press ⌘C` with the text selected
- [ ] The prompts are real: actual PR/branch/paths, the open question, the check command — not a restatement of the to-do title
- [ ] Toggle `prefers-reduced-motion`: no motion, no sound anywhere (incl. the chip tooltip)
- [ ] Disable JS: every panel visible, no-JS nav present, content intact (it was baked, not client-rendered)

## 4. Data-model plumbing

- [ ] **In the built page** — `#doc-data`, `#doc-state`, `#doc-config`, `#doc-allowlist`, `#doc-previews` all present and parse. These are build output, baked from `__external/`; the check is that the build emitted them, not that anything writes here
- [ ] A source-fetched string containing `<` `&` `"` renders escaped, not as markup (pick a message with a bracket)
- [ ] A custom / unknown source renders as the generic `#i-link` chip + generic card, not a broken card
- [ ] A `tracker` chip renders with the tracker icon and the item's **real id**, and its card shows status/assignee/due
- [ ] A `figma` chip shows the Figma mark (five colours, not an empty box) and its card names the file and frame — and claims no date or author

## 5. Cloud routine (the risky part — this is why we test live)

- [ ] `Artifact` is actually available in the cloud routine (not just locally) — there is no fetch in the loop any more, so it is the only tool the publish step needs
- [ ] Routine created as a **Claude Code cloud routine** (not `CronCreate`, not a cowork task)
- [ ] Routine lists the docs repo and the project's repo; connectors trimmed to the document's sources; cadence daily unless the user asked for hourly
- [ ] **Supervised dry-run**: trigger one run now, wait, confirm it **republished to the same URL** (URL unchanged)
- [ ] `node scripts/persist.mjs` ran and reported `pushed` or `merged`, not an error
- [ ] Dry-run reached GitHub (the connector cowork lacks) — no "couldn't reach GitHub" in the notify
- [ ] Any source unreachable *in the cloud env* is surfaced by name before going live

## 6. Refresh behaviours

- [ ] Run reads `project-docs/<name>/__external/*.json` **directly off disk** — the published Artifact's rendered markup never enters model context (matters most at the hourly end of the cadence)
- [ ] Run with nothing new → **publishes nothing**, no changelog entry, notify silent (doc only notifies on change); cost is only the file reads + source queries
- [ ] Run with real activity → exactly one new `.wn-run` marked latest; `new` flags moved to touched items only
- [ ] A patch is a **data** edit: confirm the `git diff` touched `doc-data.json`, not hand-edited HTML
- [ ] Cursor advanced **only** for sources that succeeded this run
- [ ] Auto-check: merge a watched PR (or close a watched tracker item) → its gantt bar flips to `shipped` + a `res` bullet appears
- [ ] Intraday: a newly-assigned PR or tracker item appears as a new lane item on the next run, daily tier or not
- [ ] Daily gate: two runs same day → the **second** does not rebuild Today / re-evaluate the goal (`lastDaily` unchanged)

## 7. Failure modes

- [ ] Hand-break the data → `assemble.mjs` writes **nothing**, exits non-zero, and nothing is committed — the last-good Artifact and the last-good `doc-state.json` both stay exactly as they were
- [ ] Simulate a source outage → that source skipped, its cursor **unchanged**, an `inferred` "couldn't reach X" note added, other sources still update
- [ ] Publish failure (if reproducible) → build kept, last-good URL stays, failure notified — not treated as corruption

---

**Green means:** the data model round-trips through a real publish, the cloud
routine republishes with GitHub access, auto-check and the daily gate behave, and
every failure degrades instead of corrupting. That is the whole rearchitecture,
proven on live rails.
