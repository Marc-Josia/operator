# ADR-0014: A problem-discovery interview precedes intake for vague requests

- Status: accepted
- Date: 2026-07-15

## Context

Nearly all new work enters through `op-new`, whose job is to triage a request into a lane and
create a work item. But `op-new` assumes the request is already a discrete unit of work — its
"restate and clarify" step only asks the few questions that change the lane, scope, or approach. A
genuinely vague, exploratory, or problem-shaped ask ("onboarding feels bad", "we should speed up
the dashboard", "look into the billing flow") has nothing solid to triage yet. Forcing it through
intake anyway produces a confidently-scoped work item aimed at the wrong problem — the exact
failure the constitution's first two Laws exist to prevent (understand before you build; code is
never the first step).

The gap is an upstream stage: reach a shared, confirmed understanding of the *problem* before any
triage. The alternative — bolting deep discovery onto `op-new` — was rejected: it would bloat
intake, blur its single responsibility, and run a heavy interview even on precise requests that
need none.

## Decision

Add `op-discover`, a problem-discovery interview that runs *before* `op-new`. Modeled on the
"grilling" interview style: one question at a time, a recommended answer to each, facts researched
from the codebase and memory rather than asked, converging on a written problem brief the operator
explicitly confirms. It then hands that brief to `op-new` for triage.

- It is an `op-*` procedure (part of the process), but like `op-status` it moves no work-item state
  — no item exists yet — and it passes no mechanical gate. `gates.json` is unchanged; the pipeline
  still begins at intake. Its deliverable is the confirmed understanding, not gated state.
- It is calibrated to the autonomy policy: interview only genuinely fuzzy asks; a request precise
  enough to restate in one sentence skips straight to `op-new`. Vague *bugs* still go to `op-fix`,
  whose reproduction step pins a fuzzy defect down.
- The router carries it: the AGENTS.md block and the constitution both route vague/exploratory asks
  to `op-discover → op-new`, and `op-new`'s entry criteria bounce a too-vague request back to it.

## Consequences

- Skills go from 11 to 12 (8 `op-*` procedures + 4 `operator-*` packs); the `op-*` / `operator-*`
  two-contract model (ADR-0005) is preserved — `op-discover` is a procedure, not a third category.
- The doctor `expertise-invariant` lint only inspects `operator-*` dirs, so an `op-*` procedure that
  moves no state needs no lint change.
- Vague requests now get framed into a shared problem statement before any triage, making
  "understand before you build" the literal first step of the pipeline rather than an aspiration.
