---
name: operator-code-review
description: Expertise pack for reviewing code the way a senior engineer does — read the spec and acceptance criteria before the diff, review against intent with priority correctness > security > maintainability > style, walk a concrete defect checklist (error paths, edge cases, concurrency, resource cleanup, API contracts, naming, dead code, test quality), grade findings on a blocker/major/minor/nit severity ladder with promotion rules, and apply specific tactics for AI-generated code (plausible-but-wrong logic, hallucinated APIs, over-abstraction). Consult it every time a diff, pull request, or work item is reviewed — op-ship's review stage consumes it (via a reviewer sub-agent or a fresh-context pass), and op-build consults it to self-check a task before the build gate. Advisory only — it returns findings to the procedure that invoked it and never changes work-item stage, lane, or journal.
---

# operator-code-review — reviewing like a senior engineer

## Boundary: advise only

This pack is expertise, not a procedure. Use it to produce findings, then return them to the
procedure that invoked you — op-ship at the review stage, op-build for a pre-gate self-check.
Never edit source files, never fix what you find, and never write work-item state (stage, lane,
journal) or memory files: the invoking procedure owns every state change and records your
findings. Review has value only while reviewer and author remain separate roles — a reviewer who
starts fixing stops seeing.

## Priority order

Spend attention in this order, and never let a lower level crowd out a higher one:

1. **Correctness** — does the change do what the spec says, and nothing else?
2. **Security** — does it open an exposure? When the diff touches security-relevant surfaces or
   any `protectedPaths` entry in `.operator/config.json`, the dedicated checklists in
   `.agents/skills/operator-security-review/SKILL.md` apply (op-ship runs that as its own pass).
   Per the constitution's value ranking, a real security exposure outranks every other concern.
3. **Maintainability** — will the next person understand this and change it safely?
4. **Style** — consistency and polish. Real, but never blocking on its own.

Thirty style nits plus one missed correctness bug is a failed review. Depth on the top of this
list beats coverage of the bottom.

## The method: intent first, diff second

Read the diff first and it becomes its own spec: you end up reviewing the code for plausibility
instead of against what was asked — and plausible is exactly what generated code always looks
like. So:

1. **Load the intent.** Read, in this order: the work item's Problem, Scope, and Definition of
   done (`.operator/work/<id>/workitem.md`); the lane's spec document and its numbered
   acceptance criteria (`spec-lite.md` or `spec.md`; the quick lane has none — there the
   Problem statement and Definition of done are the contract); and every rule in
   `.operator/memory/conventions.md` whose `paths:` matches files in the diff.
2. **Measure the real diff.** Diff from the work item's `base` sha (`git diff <base>`, plus
   staged and untracked files). Review what actually changed, never a summary or a memory of it.
3. **First pass — intent.** For each acceptance criterion, answer two questions: where does the
   diff implement it, and which test proves it? An AC with no implementation or no proving test
   is a finding. Then reverse the mapping: every hunk must trace back to an AC, a task, or the
   declared Scope. Changes that explain nothing — drive-by refactors, unrelated formatting —
   are findings; the constitution forbids silent scope widening.
4. **Second pass — the checklist.** Walk the checklist below over every changed file, and read
   the call sites of changed functions. Many regressions live in the callers the diff does not
   show.
5. **Third pass — the tests.** Read the tests as code under review, not as evidence of virtue
   (see "Test quality" below).
6. **Write the findings** in the exact output format, grade each with the severity ladder, and
   return them (see "What you return").

## The checklist

Work through every group. Skipping a group is a decision — name it in your summary so the
invoking procedure knows the review's actual coverage.

**Error paths**

- [ ] Every call that can fail (IO, network, parse, lookup) has a failure behavior someone
      chose, not one that happened by accident
- [ ] No swallowed exceptions: catch blocks handle, translate, or rethrow — never silently
      continue
- [ ] Error messages carry enough context to act on (what failed, with what input)
- [ ] Partial failure leaves state consistent — no half-written files or half-applied updates

**Edge cases**

- [ ] Empty, zero, one, and many — for collections, strings, and counts
- [ ] Boundary off-by-one: first/last element, inclusive vs exclusive ranges, `<` vs `<=`
- [ ] Negative numbers, huge inputs, duplicates, non-ASCII text wherever user text flows
- [ ] Null/absent vs present-but-empty distinguished deliberately

**Concurrency**

- [ ] Shared mutable state is protected or eliminated
- [ ] No check-then-act races (exists-then-create, read-then-update)
- [ ] Operations that can be retried or replayed are idempotent
- [ ] No lock or transaction held across a network call or await point without a stated reason

**Resource cleanup**

- [ ] Files, sockets, transactions, listeners, timers released on every path — including error
      paths
- [ ] Network calls have timeouts; loops driven by external input have bounds

**API contracts**

- [ ] Changed signatures, return shapes, status codes, or events: every caller updated, or
      compatibility kept deliberately
- [ ] Inputs validated at the public boundary, not deep inside
- [ ] The interface is honest about nullability and error behavior (types and docs match
      reality)

**Cross-file consistency**

- [ ] A capability the codebase already has is reused, not reimplemented a new way — the change
      does not add a component, helper, or pattern that duplicates an existing one
- [ ] Behavior added in more than one place (routes, pages, handlers) is done the same way in each,
      not implemented independently per site — look across files, not only within the diff
- [ ] Naming, error handling, and structure match the sibling code the change sits next to

**Naming and readability**

- [ ] Names say what things are — no shadowing, no `data2`/`newFoo`, no comments that lie
- [ ] Structure matches the shape of the problem (guard clauses over deep nesting)

**Dead code**

- [ ] No unused exports, unreachable branches, commented-out blocks, or leftover debug output
- [ ] No TODO without an owner or a work item

**Test quality**

- [ ] Each test would fail if the behavior it names regressed — mentally revert the change and
      ask which test breaks; if the answer is "none", that is a finding
- [ ] Error paths and the edge cases above are tested, not only the happy path
- [ ] Assertions check behavior, not the mock or the implementation's internals
- [ ] Deterministic: no sleeps for synchronization, no dependence on order or wall clock

## Severity ladder

- **blocker** — must be fixed before ship: an acceptance criterion not met, wrong behavior on a
  realistic input, data loss or corruption, a security exposure, or red/absent tests for
  changed behavior.
- **major** — a real defect or risk that will bite: an unhandled error path reachable in
  production, an API contract break, a race under plausible load, missing tests for a risky
  branch.
- **minor** — real but low-risk: confusing naming, dead code, small maintainability debt,
  duplication the next change will trip over.
- **nit** — style preference the author may take or leave. Prefix the issue text with `nit:`
  and never block on it.

Promotion rules — apply after the first grading:

- Any genuine security exposure is a blocker, whatever it first looked like — security is the
  constitution's first value and is never traded for speed.
- A finding on a path matching `protectedPaths` in `.operator/config.json` is promoted one
  level: the operator declared those paths critical.
- A violation of a `C-NNN` rule in `.operator/memory/conventions.md` is at least major —
  conventions beat exceptions (Law 7).
- Three or more minors of the same class also produce one major about the pattern (list the
  instances under it) — the pattern keeps generating instances until it is named.
- If you cannot demonstrate correctness on a path an acceptance criterion depends on, and
  reading callers and tests did not settle it, report it at major with the open question.
  Unverified is not the same as fine (Law 5).

Demotion is not symmetric: never downgrade a finding because fixing it is inconvenient or the
deadline is near. If the operator accepts a risk, that is a waiver the invoking procedure
records in the operator's words — not a lower severity.

## Output format

Emit every finding on one line, in exactly this shape:

```
[severity] file:line — issue — why it matters — suggested fix
```

**Examples**

```
[blocker] src/api/rate.ts:88 — refill uses wall-clock ms where config declares seconds — every limit is 1000x too permissive; AC-2 unmet — convert refillRate at config load and add a unit test pinning one bucket cycle
[major] src/jobs/import.ts:141 — rows are inserted before batch validation completes — one bad row aborts mid-file and leaves a partial import — validate the whole batch first, or wrap the insert loop in a single transaction
[minor] src/api/rate.ts:41 — `data2` shadows outer `data` — the next editor will read the wrong variable — rename to `retryPayload`
[nit] src/api/rate.ts:12 — nit: options object could be destructured like sibling modules — consistency — match limiter.ts style
```

One line per finding, most severe first. No prose paragraphs between findings — the invoking
procedure resolves and records them straight from this list.

## Reviewing AI-generated code

Most diffs reviewed here were written by an agent. Generated code fails differently from human
code — calibrate for it:

- **Plausible-but-wrong is the default failure mode.** Fluent naming, clean formatting, and
  confident comments carry zero evidence of correctness. Trace at least one acceptance
  criterion end-to-end through the actual code by hand — input to output — before trusting the
  rest. Watch especially for: inverted conditions that read naturally, wrong-but-adjacent API
  arguments (order, units, ms vs s), and symmetric-looking branches hiding an asymmetric case.
- **Hallucinated APIs.** Verify that every unfamiliar method, option, import, and config key
  exists in the version this project actually depends on — check the manifest/lockfile and
  search the dependency or its docs. Generated code confidently calls functions that merely
  look idiomatic, or that exist only in a different major version.
- **Reimplementation instead of reuse.** An agent builds each site in isolation and cannot feel
  the codebase's existing shape, so it re-solves problems already solved — a second date helper, a
  third bespoke fetch wrapper, the "same" screen coded three different ways. Consistency is not in
  its field of view; check for it explicitly (see the Cross-file consistency checklist group) and
  point reuse at the existing implementation.
- **Over-abstraction.** Interfaces with one implementation, parameters nothing passes, layers
  that only forward calls, generalization "for future flexibility" — flag against Simplicity
  (Laws 8 and 9): every abstraction must justify its existence today. Suggest the concrete
  version.
- **Self-congratulatory tests.** Generated tests often restate the implementation or assert on
  their own mocks, passing forever regardless of behavior. Apply the mentally-revert test from
  the checklist ruthlessly here.
- **Uniform surface, non-uniform quality.** Human bugs cluster in visibly rushed code;
  generated bugs sit mid-paragraph in immaculate formatting. Give the boring middle of every
  function the same attention as the clever parts.

## What you return

Return to the invoking procedure — as your report, never as a file or state change:

1. The findings list in the exact format above, most severe first. An empty list is a valid
   result; state it explicitly.
2. One summary line the procedure can record verbatim:
   `findings: N (a blocker, b major, c minor, d nit)`.
3. Anything you could not verify — unreadable file, unresolvable `base`, a checklist group you
   skipped. An incomplete review must say it is incomplete.

Resolution — fixing, waiving, re-testing — belongs to the invoking procedure and the operator,
not to this pack.
