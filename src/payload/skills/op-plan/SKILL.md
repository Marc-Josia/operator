---
name: op-plan
description: "Specify and architect a work item before any code: write the lane's spec document with testable acceptance criteria, update Scope and Tasks, then STOP for the operator's approval — the one mandatory human gate. Use it when a standard- or full-lane item sits at stage spec, when the operator asks for a plan, spec, or design, or when an escalated item needs its spec backfilled. Never implement without it."
---

# op-plan — specify and architect

## Purpose

Turn an intaken request into an approved, buildable plan: the lane's spec document, testable
acceptance criteria, an honest Scope, and small ordered Tasks. This procedure ends at the only
mandatory human gate in the pipeline — the operator's approval is the mandate that lets every
later stage run autonomously. It may move work-item state (journal, spec status); it never
writes implementation code.

## Entry criteria

- The work item exists at `.operator/work/<id>/workitem.md` and its `stage:` is `spec`
  (the intake gate has passed). If it is still `intake`, finish op-new first.
- The lane is `standard` or `full`. Quick-lane items never enter this procedure — the quick
  lane has no spec stage. If a quick item turns out to need a plan, that is a triage trigger:
  run `node .operator/bin/op.mjs escalate <id> --to standard` and return here.
- You are the only agent active on this item.

## Steps

### 1. Load context

Read, in this order:

- `.operator/constitution.md` — you are starting a work item; the method binds you.
- The work item's Problem and Triage sections — the requester's terms are the ground truth.
- `.operator/memory/project.md` — stack, commands, layout, quirks.
- `.operator/memory/conventions.md` — every rule whose `paths:` matches the areas you expect
  to touch; rules without `paths:` always apply. Conventions constrain the design, so loading
  them after designing wastes the design.
- `.operator/memory/lessons.md` — scan for triggers matching this kind of work.
- `.operator/memory/decisions/` — skim ADR titles and Status lines. Accepted ADRs are settled
  law: a plan that silently re-decides one will be rejected. To change course, the plan must
  say so and propose a superseding ADR.

### 2. Investigate before you specify

Read the actual code in the areas the work will touch — entry points, existing patterns, the
tests that already cover the area. A spec written from assumptions produces acceptance criteria
that cannot be met and a Scope the build gate will contradict.

Verify external assumptions (library versions, API behavior, docs) if you have web access.
Every assumption you cannot verify goes in the spec's Risks & assumptions section — the
operator must see it before granting the mandate, and it must be resolved before ship.

Ask the operator now about anything that only exists in their head and changes the plan.
Batch the questions; do not trickle them.

### 3. Write the spec document

Create the spec in the work item directory from the lane's template:

- **standard** → copy `.operator/templates/spec-lite.md` to `.operator/work/<id>/spec-lite.md`
- **full** → copy `.operator/templates/spec.md` to `.operator/work/<id>/spec.md`

Fill every section; the spec gate rejects empty sections and `TBD`. Leave `status: draft` in
the frontmatter — it becomes `approved` only in step 6.

**Acceptance criteria** are the heart of the spec. Numbered list, at least one entry, each
independently checkable — a reviewer must be able to answer "met / not met" without
interpretation, because these criteria drive the tests op-build writes and the review op-ship
runs.

- Bad: `1. Rate limiting works well.`
- Good: `1. A client sending more than 100 requests within 60s receives HTTP 429 with a
  Retry-After header; request 100 still succeeds.`

**Non-functional constraints** (both lanes) are the standing targets the result must satisfy
regardless of this change — a performance budget, accessibility, internationalization (no
hard-coded user-facing strings), no secrets in logs. Write each as a measurable met/not-met
criterion so `operator-test-strategy` can map the non-trivial ones to a test, exactly as it does
acceptance criteria. When there are genuinely none, write `None — <reason>`; the gate requires the
section to be non-empty. Keep these distinct from the full-lane `Impact` table, which assesses the
effect of *this* change rather than a target the result must hold.

- Bad: `Should be fast and accessible.`
- Good: `First contentful paint < 1.5s on the staging profile; all interactive text meets WCAG AA
  contrast; no user-facing string is hard-coded (i18n catalog only).`

**Full lane additions:**

- **Design it twice** — before writing Architecture & decisions, for each decision significant
  enough to merit an ADR *and* facing a real trade-off: sketch two or three designs under
  deliberately opposed constraints (e.g. minimal interface / maximal flexibility / optimise the
  common caller), each a few lines of prose — components, flow, contract, never code. If your
  host runs sub-agents, produce each sketch in an isolated context; otherwise write them
  sequentially and do not let the later sketches converge toward the first — the first idea is
  rarely the best, and sketches that can see each other converge. Compare on named criteria —
  interface simplicity, locality of change, testability at the seam, reversibility — then
  recommend one. Skip the pattern when no credible alternative exists; the trigger is a real
  trade-off, not the full lane itself.
- **Architecture & decisions** — components touched or created, data flow, contracts between
  parts. Every significant decision gets a one-paragraph rationale.
- **Rejected alternatives** — each serious alternative and the concrete reason it lost. The
  losing sketches from design-it-twice, with the real reason each lost the comparison, are
  exactly these entries. "We found no other credible approach" is a valid entry if true.
- **ADRs** — for every decision where a real alternative was considered and rejected, file
  `.operator/memory/decisions/ADR-NNN-short-slug.md` from `.operator/templates/adr.md`
  (next NNN = highest existing + 1), cite the work item — and the design-it-twice comparison
  when one ran — and link it from the Architecture &
  decisions section. No ADR for choices that had no alternative — an ADR archive full of
  non-decisions buries the real ones. ADRs are immutable once accepted; to reverse one later,
  a new ADR supersedes it.

If planning reveals the lane is wrong — a standard item that needs architectural decisions,
a protected path, a migration — stop and run
`node .operator/bin/op.mjs escalate <id> --to full`, then write the spec for the new lane.
Escalation is one-way; de-escalation happens only on the operator's instruction, quoted in
the journal.

### 4. Update the work item

In `.operator/work/<id>/workitem.md`:

- **Scope** — the paths or globs the work is expected to touch, one per line. Declare
  honestly: the build gate measures the real git diff against this list, so an optimistic
  Scope guarantees a failed gate, and a padded catch-all Scope defeats the check the operator
  relies on.
- **Tasks** — replace the placeholder with small, ordered, verifiable steps. Each task names
  its proof: how op-build will demonstrate it is done. When the proof is a test, name the
  **seam** it attaches to (see `operator-test-strategy`) — approving the plan then approves
  the test surfaces too. Tasks map onto acceptance criteria.

  - Bad: `- [ ] Implement rate limiting`
  - Good:
    - `- [ ] Add token-bucket middleware in src/api/middleware/rate-limit.js — proof: unit
      test rejects request 101 within the window`
    - `- [ ] Wire middleware into src/api/router.js behind config flag — proof: integration
      test gets 429 with Retry-After (AC 1)`

- Set frontmatter `next:` to `awaiting operator approval of spec` and refresh `updated:`.

### 5. STOP — present the plan to the operator

Do not touch implementation code past this line. Present, concisely and in this order: the
problem as you understood it, the proposed approach (and what was rejected, on the full lane),
the numbered acceptance criteria, the Scope, the risks and unverified assumptions, and any
open questions. Then ask for approval and wait.

**Why building before approval is forbidden:**

- The approval is the mandate. The constitution grants autonomy *within* an approved plan;
  code written before approval has no mandate at all — it is freelancing, whatever its quality.
- It reverses who decides. Presenting a plan whose implementation already exists turns the
  operator's decision into a rubber stamp: sunk code anchors the discussion, and rejecting it
  now costs them an argument instead of a sentence. The entire point of this gate is that
  direction changes are nearly free *here* and expensive everywhere after.
- It corrupts the evidence chain. The spec gate requires the journaled approval, and the build
  gate measures the diff since `base` — premature edits surface in that diff with no approved
  plan covering them. The record would show the process was theater.

If the operator asks for changes, revise the spec and Tasks and present again — as many rounds
as it takes. If they are unavailable, append `- <date> BLOCKED awaiting operator approval` to
the journal and stop; do not interpret silence as consent.

### 6. On approval, journal it and mark the spec approved

Only when the operator has plainly approved:

1. If the approval carries conditions ("approved, but make the TTL configurable"), fold the
   condition into the spec and Tasks first — the quote defines the mandate's boundaries, and
   the documents must match it.
2. Append to the work item Journal, quoting the operator's own words — never a paraphrase:

   ```
   - 2026-07-14 APPROVAL plan granted by operator: "approved, but make the TTL configurable"
   ```

   The `APPROVAL plan granted by operator:` prefix and a non-empty quote are exactly what the
   gate checker verifies. The quote is the audit trail of the mandate; inventing or improving
   it defeats the reason it exists.
3. Set `status: approved` in the spec document's frontmatter.

### 7. Run the spec gate

```
node .operator/bin/op.mjs gate <id>
```

On pass, the checker appends the `GATE spec PASSED` journal line and advances `stage:` to
`build` itself — never do either by hand. Hand off to `op-build`. On failure it prints each
failing check with its fix; fix and re-run. If your environment has no Node runtime, apply the
spec-gate checklist from `.operator/gates.json` manually and journal
`GATE spec PASSED (manual)` with the evidence inline.

## Exit gate

`node .operator/bin/op.mjs gate <id>` at stage `spec` verifies, for both lanes:

- **spec-doc-sections** — the lane's spec document exists, every template section non-empty,
  no `TBD`.
- **acceptance-criteria-present** — a numbered Acceptance criteria list with at least one
  entry.
- **operator-approval** — a journal line `APPROVAL plan granted by operator:` with a
  non-empty quote.

All pass → stage becomes `build`. This procedure is done only when the checker says so.

## Failure modes

- **Item is quick lane or not at spec stage** — wrong procedure. Route quick-lane items to
  op-build; run the intake gate first if the stage is still `intake`.
- **Gate fails on operator-approval** — you ran the gate before journaling the approval, or
  the quote is empty. Get the approval (step 5), journal it verbatim, re-run.
- **Operator says no or asks for changes** — normal, not failure. Revise and re-present.
  Never journal an APPROVAL line for a rejection, a hedge, or your reading of their mood.
- **Temptation to "just prototype" while waiting** — resist it. Exploratory reading is fine;
  writing implementation code is not (see step 5). If a spike is genuinely needed to de-risk
  the design, ask the operator for it explicitly and journal their answer.
- **Scope keeps growing while you write the spec** — the triage was wrong. Escalate (step 3)
  rather than quietly writing a full-lane spec on a standard-lane item; the lane must match
  the artifacts or later gates check the wrong things.
- **A prior ADR conflicts with the best design** — do not ignore it and do not edit it.
  Propose a superseding ADR in the plan and let the operator decide at the approval gate.
- **Approval given in a meeting/verbally with no exact words available** — ask the operator
  to restate it in one sentence you can quote. The journal quote is the mandate's record;
  an unquotable approval is not journaled.
