# ADR-0017: A rejection memory (`out-of-scope/`) alongside the decision memory

- Status: accepted
- Date: 2026-07-18

## Context

Operator's memory records what was *done*: `lessons.md` and `conventions.md` capture experience,
`decisions/` captures why an alternative won. Nothing captures what was *refused*. When the
operator rejects an idea — a feature out of scope, a direction deliberately not taken — the
reasoning evaporates with the session, and the same idea can be re-proposed indefinitely; each
time, the discussion restarts from zero. The `mattpocock/skills` repo solves exactly this with a
`.out-of-scope/` knowledge base: one file per rejected *concept*, matched by concept similarity
during triage, with a critical rule — never record "already implemented" as a rejection, or the
dedup check starts refusing legitimate requests about existing behavior.

## Decision

**Location.** `.operator/memory/out-of-scope/` — one file per rejected concept, plus a seeded
`README.md` stating the format contract. It sits inside `memory/` deliberately: `memory/**` is
already user-owned end to end (`init --force` preserves it, `update` never touches it, `remove`
leaves it), so the rejection files inherit the right ownership semantics with **zero installer
code**. The seed README rides the normal payload copy at `init`.

**No line cap, no file cap.** The capped files (`project.md`, `conventions.md`, `lessons.md`) are
capped because they are *loaded* wholesale; `out-of-scope/` is *consulted* — read at two specific
checkpoints, one file at a time. Rejections are also rare events (an operator saying a considered
"no"), so volume grows slowly. If a concept stops making sense, it is pruned to
`memory/archive/`, the same never-delete channel every other memory file uses. A numeric cap
would add config and checker surface for a problem that archiving already covers.

**Who writes.** `op-new`, when a triaged request is rejected by the operator rather than laned;
`op-discover`, when the operator deliberately discards a direction during the interview (the
brief's "Out of scope" line names the concepts to record); `op-memory` record mode is the common
formatting path, and its write-trigger table gains the corresponding row. Only deliberate
rejections are recorded — **never "already implemented"**, never deferrals ("not now" is not a
rejection).

**Who reads.** `op-discover` at grounding (step 1) and `op-new` before the triage scorecard run a
*prior-rejection check*: read `out-of-scope/`, match the request against recorded concepts by
similarity (not keyword), and on a match surface the file and its reason to the operator. The
check **signals; the operator decides** — a recorded rejection is memory, not a veto. Reopening
is explicit: the operator says so, the file is deleted or rewritten, and normal flow resumes.

## Alternatives considered

- **Fold rejections into `lessons.md` or `decisions/`.** Rejected: ADRs record why we *did*
  something (immutable once accepted); rejections record why we *did not* (revocable at the
  operator's word — reopening deletes the file). Mixing revocable refusals into an immutable
  decision log, or burying them among cause-and-effect lessons, drowns both. The three memories
  answer three different questions.
- **A single `out-of-scope.md` file with a line cap.** Rejected: one file per concept is what
  makes the check cheap (scan filenames, open one file) and reopening surgical (delete one
  file). A monolithic capped file would need gc choreography for entries that are individually
  tiny and rarely written.
- **A mechanical gate for the check.** Rejected: the check's output is a conversation with the
  operator, not a measurable artifact; there is no diff or journal line for `op.mjs` to verify
  at intake time. It stays procedural, like op-discover itself (ADR-0014).

## Consequences

- `src/payload/operator/memory/out-of-scope/README.md` is a new seeded file; `init` copies it
  with the rest of the payload. No changes to `init`/`update`/`remove` logic — `memory/**`
  ownership rules already apply. `doctor` is unchanged: it checks memory *caps*, and this
  directory has none.
- `op-discover` (grounding), `op-new` (before the scorecard), and `op-memory` (write-trigger
  table + record format) each gain the check or the format; the constitution's Memory section
  lists the new directory. The always-loaded block is unchanged — the routing table already
  reaches the three skills that carry the behavior.
- The toolkit repo dogfoods the mechanism: `docs/out-of-scope/` records the adoption rejections
  of 2026-07-18 (dev-environment docs, in French, not distributed).
- Reversal cost is low: delete the seed directory and the skill paragraphs; no checker, config,
  or stage-machine surface was added.
