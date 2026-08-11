# Who does the work, and on which model

A first init on a real project reads months of Slack, every PR with its review
thread, every meeting note and every closed tracker item. Done inline, all of
that source text lands in the main context, and the run costs a multiple of what
the document is worth — one reported init burned a five-hour session window in
minutes.

Almost none of that reading needs the model doing the composing. So split the
run in two, and pay for each half at its own rate.

## The split

**Extraction is delegation.** Paginating a source, opening threads, copying
quotes, noting who said what and when, resolving a citation key — mechanical
work with a right answer, checkable by whether the note carries the quote.

**Judgement is the main thread.** Deciding two entries are one event, setting the
event bar, spotting a reversal, noticing the record contradicts itself, choosing
the questions, writing `#doc-data`, writing the changelog. This is the whole
value of the document and it is where a cheaper model quietly costs you the
thing you were paying for.

| Work | Who | Model |
|---|---|---|
| Sweep one source to its beginning, capture verbatim | subagent, one per source | `haiku` |
| Fetch a source's mark for minting | subagent | `haiku` |
| Resolve a batch of citation URLs against the allowlist | subagent | `haiku` |
| Join the notes into events | main thread | the session's own |
| The event bar, the reversals, the contradictions, the questions | main thread | the session's own |
| Compose `#doc-data`, the changelog, `#goal` | main thread | the session's own |
| Read a gate's failure and decide what to do | main thread | the session's own |

`haiku` names the cheapest tier the Agent tool offers. If the tool in this
environment takes no `model`, delegate anyway — a subagent that keeps a source's
raw text out of the main context is most of the saving even at the same rate.

## The subagent contract

**A sweep subagent writes its notes to a file and returns a receipt.** This is
the point. Returning the corpus puts every quote back in the main context and
buys nothing.

Give each one:

- the source and its scope, from `config.json` — channel ids, repo, folder,
  query, and the date to read back to;
- its own notes file, `.ignored/project-doc/<name>/notes-<source>.md`;
- the note format from "Capture verbatim" in
  [`init-protocol.md`](init-protocol.md) — quote, who, when (ISO), the citation
  key, one line on why it might matter;
- the instruction to **paginate to the beginning**, which is the one thing a
  cheap model skips.

Ask it to return only: how many items it read, the date range it covered,
whether it reached the beginning, and anything it could not reach. Nothing else.

Send every source's subagent **in one message** so they run concurrently. Then
read the notes files yourself and do the join.

**What a subagent never does:** decide whether something is news, merge two
entries into one event, write or patch `doc-data.json`, run a gate, publish, or
commit. It reads and it quotes. Everything downstream of the notes is yours.

## On a refresh

The cheap tier of a refresh already reads a window of hours across a handful of
sources — that is a few tool calls and it belongs inline. Delegate only when a
window is genuinely large: a run picking up after a nine-day gap, or a source
that returns hundreds of items. The daily tier's synthesis is judgement and
never delegates.

A refresh that fans out for a quiet hour has spent more on the fan-out than the
reading would have cost.

## Also: don't read what you already have

The other half of the bill is re-reading. The cursors exist so a refresh reads
the window and not the history; `init-notes.md` exists so the compose pass does
not re-open the sources it already quoted. A run that re-reads a source because
the quote is no longer in context has paid for it twice.
