---
name: op-build
description: Execute the build stage of an Operator work item — the per-task implement → test → tick → journal loop, with scope discipline, escalation tripwires, and the mechanical build gate. Use whenever implementation should proceed on an existing work item; the operator says "build it", "implement it", "go ahead", "write the code", "continue", a plan was just approved, or you are resuming an item whose stage is build. Always follow this procedure before writing any implementation code for a work item — never code straight from a spec, a conversation, or memory without it.
---

# op-build — implement a work item

## Purpose

Turn an approved plan into working, tested code without drifting from it. Implementation is
where scope creep, untested changes, and silent design decisions happen. This loop makes every
step leave evidence — a ticked task, a journal line, a passing test — so the build gate can
verify the work instead of trusting a claim.

## Entry criteria

Read `.operator/work/<id>/workitem.md` frontmatter before touching anything else.

- `stage:` must be `build`. The stage field is the only proof that the upstream gates passed —
  the gate checker sets it, and nothing else does.
- Stage is `intake` → the intake gate has not passed. Finish `op-new` first.
- Stage is `spec` → there is no approved plan. Hand to `op-plan`. Do not start implementing to
  "save time": the spec gate requires the operator's journaled approval, and building without
  it is freelancing outside your mandate.
- Stage is `review`, `ship`, or `done` → building is over; route to `op-ship` or `op-status`.
- No work item exists for this request → route through `op-new`. Even a one-line change
  travels a work item; the quick lane keeps the overhead to minutes.

If several items sit at `build`, work the one the operator named, or ask. One active agent per
work item.

## Steps

### 1. Load the working context

Do all of this before writing any code — the plan and the conventions are the mandate, and you
cannot stay inside a mandate you have not read.

- Read `.operator/constitution.md` if you are starting or resuming the item in a fresh context.
- Read the plan for the lane:
  - **quick** — no spec document. The workitem's Problem, Scope, and Definition of done ARE
    the plan.
  - **standard** — `.operator/work/<id>/spec-lite.md`; its frontmatter must say
    `status: approved`.
  - **full** — `.operator/work/<id>/spec.md`, plus any ADRs it references in
    `.operator/memory/decisions/`. Decisions recorded there are settled; do not re-open them
    mid-build.
- Read `.operator/memory/project.md`, then every rule in `.operator/memory/conventions.md`
  whose `paths:` matches the files in Scope (rules without `paths:` always apply).
  Conventions beat your habits.
- Consult `operator-test-strategy` (`.agents/skills/operator-test-strategy/SKILL.md`) to
  decide what proof each task needs on this lane. Do this before coding: a task whose proof
  you cannot name is a task you do not understand yet.

### 2. Run the task loop

Take the first unchecked box in the workitem's Tasks section and repeat until none remain:

1. **Re-read** the spec section and the conventions relevant to the files this task touches.
2. **Check the escalation tripwires** (Step 3) before writing anything.
3. **Implement** the smallest change that satisfies the task. Follow the existing patterns of
   the codebase unless a convention says otherwise.
4. **Prove it.** Run the proof the task names — new behavior gets a new test, per
   `operator-test-strategy`. Keep the project's test command (`testCommand` in
   `.operator/config.json`) green as you go: the build gate runs it, and a red suite fails
   the gate.
5. **Tick the checkbox** in Tasks and append one journal line recording the proof:

   `- <ISO date> TASK done: <task summary> — proof: <command or check>, <result>`

6. **Update frontmatter**: set `updated:` to today and `next:` to the next task (or
   "run build gate" after the last one).

Journal per task, not per session — an agent resuming this item in a fresh context must see
exactly where the loop stopped. If you stop for an external reason, append
`- <ISO date> BLOCKED: <reason>`, and `- <ISO date> RESUMED: <what changed>` when you
continue. The Journal is append-only: never edit or delete an earlier line.

When a failure resists quick diagnosis, apply `operator-debugging`
(`.agents/skills/operator-debugging/SKILL.md`): reproduce, isolate, verify the root cause.
Do not shotgun changes until the suite happens to pass.

### 3. Escalation tripwires — stop, never widen silently

Stop the loop the moment any of these appears:

- the task needs a file **outside the declared Scope**, on any lane;
- **quick lane**: the diff approaches the lane caps (`.operator/config.json`, default 3 files
  / 80 changed lines). Count what the gate will count: distinct files touched and lines
  added plus deleted since the frontmatter `base` commit;
- the change would touch a **protected path** on the quick lane (config `protectedPaths`) —
  protected paths never travel the quick lane. On standard/full, a protected path inside
  Scope is allowed; it triggers a security review at the review stage, not a build stop;
- you are about to make a **design decision the spec did not anticipate** — a new dependency,
  a new interface, a data-shape change. Design decisions belong to op-plan, where they get an
  ADR and the operator's eyes, not to mid-build improvisation.

Then:

1. Run `node .operator/bin/op.mjs escalate <id> --to <standard|full>`, giving the reason. The
   checker appends the `ESCALATED` journal line and prints which artifacts must be backfilled.
2. Backfill via `op-plan`: write the new lane's spec document, update Scope and Tasks, and
   present the change to the operator for a fresh journaled approval. Escalation is one-way;
   de-escalation needs the operator's quoted instruction in the journal.
3. Already on the **full** lane (nothing to escalate to), or the trigger is scope rather than
   lane? Re-plan instead: return to `op-plan`, revise the spec and Scope with the operator,
   and journal the new `APPROVAL` line before resuming.
4. Resume the loop only once the backfilled plan is approved.

Why stop instead of pushing through: the build gate measures the real diff against Scope and
caps. Widening silently does not avoid the conversation — it moves it to a failed gate, later,
with less context.

**Example.** Quick-lane item `007-fix-timeout`, Scope declares `src/http/client.mjs`. Task 2
turns out to need a change in `src/http/retry.mjs` plus a new config key — a second file and
an unplanned interface. Stop; run
`node .operator/bin/op.mjs escalate 007-fix-timeout --to standard`; write `spec-lite.md`; get
the operator's approval journaled; resume the loop.

### 4. Stay inside the mandate

- **No unrelated changes.** Fix nothing the plan does not cover, even an obvious bug you
  trip over.
- **No drive-by refactors.** Renames, restructurings, dependency bumps, formatting sweeps:
  file a new work item via `op-new` (or note it to the operator) and move on. The review
  stage reads the diff against the spec — every unrelated hunk hides the real change and
  fails the `diff-within-scope` check. A filed work item preserves the idea; an inline detour
  destroys the review.
- The Definition of done includes "No unrelated changes in the diff"; you are grading
  yourself against it at review.
- If the operator corrects you mid-build, record the correction immediately via `op-memory` —
  corrections that wait for a gate get lost.

### 5. Close the stage

1. Confirm every Tasks checkbox is ticked and the full test command passes locally.
2. Run the build gate — never assert it:

   `node .operator/bin/op.mjs gate <id>`

3. On pass, the checker appends the `GATE build PASSED` journal line itself and advances the
   stage to `review`. Hand off to `op-ship`, which runs the review and delivery stages.
4. On fail, the checker names each failing check and its fix. Fix exactly that, re-run. No
   Node runtime available? Apply the build-gate checklist from `.operator/gates.json`
   manually and journal `GATE build PASSED (manual)` with the evidence inline.

## Exit gate

`node .operator/bin/op.mjs gate <id>` at stage `build`. Per lane, it checks
(see `.operator/gates.json`):

- **all lanes**: `tasks-complete` (every Tasks checkbox ticked), `tests-pass` (config
  `testCommand` exits 0), `diff-within-scope` (every file in the measured diff since `base`
  matches the Scope section);
- **quick lane additionally**: `diff-within-lane-caps` (files and changed lines within the
  config caps) and `protected-paths-lane` (no protected path in the diff).

Pass advances the item to `review`; the next procedure is `op-ship`.

## Failure modes

- **`diff-within-scope` fails** — do not edit Scope to match the diff; that is exactly the
  silent widening the gate exists to catch. Revert the out-of-scope hunks, or escalate/re-plan
  (Step 3) so the widened Scope carries an operator approval.
- **`tests-pass` fails with "configure testCommand"** — ask the operator for the project's
  real test command and set it in `.operator/config.json`. Only the operator can waive tests,
  and the waiver must be journaled quoting them: `- <ISO date> WAIVER tests: "<their words>"`.
- **A task no longer applies** — a re-plan made it obsolete. Update the Tasks list through
  `op-plan` (Tasks is editable; only the Journal is append-only). Never tick a box for work
  that was not done — `tasks-complete` checks the boxes, but the review reads the diff.
- **Diff is near the caps but the work is honestly small** — caps are tripwires, not targets.
  If the honest diff fits, proceed. If you are trimming the diff to sneak under the cap, that
  is the escalation signal.
- **Asked to "skip the process and just code it"** — the quick lane IS the low-ceremony path.
  Route through `op-new`; do not build outside a work item.
- **Blocked on information only the operator has** — journal `BLOCKED`, ask them the one
  question that unblocks you, journal `RESUMED`. Do not guess at an irreversible answer.
