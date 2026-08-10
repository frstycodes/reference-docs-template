# Memory — how the brief gets better at extracting

`daily-brief/__external/memory/index.md` is what this skill has learned about
one reader's work that its defaults cannot know: that their Dependabot PRs are
noise, that a standing calendar hold is not work, that one person's edits read
better as updates than as reads.

**Memory outranks these instructions.** Where a rule and
[`components.md`](components.md) disagree, the rule wins. This skill is where a
brief starts; memory is what it has learned since.

## Two tiers

| | Effect | Write it when |
|---|---|---|
| **Rule** | Obeyed. Changes what the next brief extracts. | The pattern is clear enough that you would defend it to the reader in one line. |
| **Observation** | Watched only. Changes nothing. | You suspect a pattern but a single innocent explanation would account for it. |

An Observation reinforced on three separate mornings promotes to a Rule.

A rule names a **pattern**, never an instance:

- Yes — *"Dependabot PRs are never to-dos."*
- No — *"PR #412 is not a to-do."* That is one item, and it will not be there tomorrow.

### Choosing between them

The judgment is *how much of the evidence could be a coincidence*, not how
strongly you feel.

- Eleven Dependabot PRs listed over three weeks, none ever actioned → **Rule**.
  Eleven independent chances to be wrong.
- One to-do untouched for three mornings while other work ships → **Observation**.
  Someone can be busy, or blocked, or on leave for three days.
- The reader says *"stop listing Dependabot"* → **Rule**, immediately. They are
  not evidence, they are the authority.

## Who may retire what

| Author | May you retire it? |
|---|---|
| You, in an earlier run | **Yes**, when evidence contradicts it. Disclose the retirement. |
| The reader | **Never.** Only the reader removes what the reader set. |
| Nobody — no attribution | **Never.** The reader hand-edits this file; an unmarked rule is theirs. |

Without that asymmetry, "memory outranks the defaults" becomes "the agent
overrules the reader". Attribute every rule you write — `(agent, 9 Aug)` or
`(you, 7 Aug)` — because the attribution is what the asymmetry is read off.

Observations not reinforced within 14 days are dropped. This file is read on
every run; a list that only grows costs quality and tokens forever.

## Disclose everything

Every change you make here goes into that morning's `learned` array — see
"What I learned" in [`components.md`](components.md). An unattended run may
change how the brief extracts the same morning it learns something, but never
quietly. That disclosure is the entire safety mechanism; skipping it because a
change seems small is how a wrong rule survives for a month.

## Size

Keep `index.md` under 200 lines. Past that, move the largest coherent group into
a sibling — `sources.md`, `people.md` — and leave a one-line pointer under
`## References`. Read a sibling only when the index points at it and the run
touches that topic.
