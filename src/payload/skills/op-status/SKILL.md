---
name: op-status
description: Read-only orientation across all Operator work items — reads every workitem.md's frontmatter and latest journal lines, then reports a narrative status with the exact next action for each item and flags anything blocked or inconsistent, and rolls up any project roadmaps by milestone. Use it whenever the operator asks "where are we", "what's next", "what's in flight", "what happened to <item>", "is X done yet", or "how far along is <project>"; at the start of any session that resumes earlier work; after a long break, a handoff, or loss of context; and before choosing which work item to pick up. It changes nothing — no journal lines, no frontmatter edits — so it is always safe to run, in any state.
---

# op-status — orient without touching anything

## Purpose

Answer "where are we, and what happens next" from disk truth, never from memory. Sessions end,
context gets lost, agents change; the work items on disk are the only durable record. This
procedure reconstructs the state of play from them and names the exact next action per item, so
resuming work never starts with guessing.

op-status is strictly read-only, and that guarantee is the feature. A status check that mutates
state turns a question into an action: it pollutes the append-only journal, destroys staleness
(which is itself information), and makes "just checking" something everyone has to think twice
about. Reading costs nothing, so orientation can happen as often as anyone wants it.

## Entry criteria

- `.operator/` exists in the project (Operator is installed).
- Nothing else. No particular stage, lane, or healthy state is required — orientation must work
  precisely when things are messy.

## Steps

1. **Enumerate the work.** List `.operator/work/*/workitem.md` and, if present,
   `.operator/projects/*/roadmap.md`. If both are missing or empty, that is the status: report "no
   work items yet" and point the operator at `op-new` (or `op-roadmap` for a large effort) to open
   the first one. Stop here.

2. **Read each item from disk — not from what you remember doing.** For every `workitem.md`:
   - frontmatter: `id`, `title`, `lane`, `stage`, `updated`, `next`, and `project`/`milestone`
     if the item belongs to a project;
   - the last 3–5 journal lines — the most recent events are what actually happened last;
   - progress counts: checked vs total boxes in Tasks and in Definition of done;
   - for standard/full items at `spec` or later: whether the lane's spec document
     (`spec-lite.md` / `spec.md`) exists in the item directory, and its `status:` line.
   - for each `roadmap.md`: frontmatter `status:` and the Milestones section — which milestone is
     active and, per milestone, how many of its work items have reached `done` (join by the items'
     `project`/`milestone` fields). The roadmap's own Progress section is the operator's summary.

3. **Classify each item.**
   - **done** — `stage: done`.
   - **blocked** — the most recent `BLOCKED` journal line has no later `RESUMED` line. Take
     what it is waiting on from the line itself.
   - **active** — everything else.

4. **Cross-check — and flag, never fix.** The journal is the audit trail; frontmatter is a
   convenience written by the last procedure to run. When they disagree — `stage:` does not
   match the last `GATE <name> PASSED` line, or `next:` contradicts recent events — report the
   mismatch as a finding and trust the journal. Never repair it here: only the gate checker
   advances stages, and repairs belong to the procedure that owns the item (the installer's
   `doctor` command diagnoses this class of drift too).

5. **Derive the exact next action per item.** Start from the stage, then sharpen it with what
   the journal, checkboxes, and documents show:

   | stage | next action |
   |---|---|
   | intake | complete Problem/Triage/Scope/Tasks, then `node .operator/bin/op.mjs gate <id>` — per `.agents/skills/op-new/SKILL.md` |
   | spec | write the spec doc or obtain operator approval (whichever the item lacks), then the spec gate — per `.agents/skills/op-plan/SKILL.md` |
   | build | work the unchecked tasks, then the build gate — per `.agents/skills/op-build/SKILL.md` (`op-fix` if the journal shows a bug item, e.g. a `REPRO` line) |
   | review | fresh-context review, findings resolved, then the review gate — per `.agents/skills/op-ship/SKILL.md` |
   | ship | docs, memory harvest, retro, then the ship gate — per `.agents/skills/op-ship/SKILL.md` |
   | done | nothing — report only |

   "Exact" means the operator could hand the line to an agent verbatim: name the missing
   artifact or the specific unchecked tasks, the skill to follow, and the gate command with the
   real id. "Continue working on it" is not a next action.

6. **Report.** Use this template — active items first, most recently `updated` first, one
   narrative line per item plus its next action:

   ```
   ## Status — 2026-07-14

   ### Projects
   - **001-airbnb-clone** (active) — M1 MVP: 3/4 items shipped; M2–M4 not started.
     Active item: 014-search (build). Roadmap: .operator/projects/001-airbnb-clone/roadmap.md

   ### Active
   - **003-rate-limiting** (standard, build) — updated 2026-07-12
     4/6 tasks checked; last event: GATE spec PASSED.
     Next: implement tasks 5–6 per .agents/skills/op-build/SKILL.md, then
     `node .operator/bin/op.mjs gate 003-rate-limiting`.

   ### Blocked
   - **005-sso-login** (full, spec) — BLOCKED 2026-07-10 awaiting operator approval of the spec.
     Unblocks when the operator approves: journal the APPROVAL line and run the spec gate
     (op-plan).

   ### Done
   - 001-fix-typo, 002-add-healthcheck

   Mechanical view: node .operator/bin/op.mjs status
   ```

   Omit the Projects section when no `.operator/projects/` exist; when they do, lead with it — it is
   the operator's altitude — then the per-item detail below. If several items are active, restate
   the rule: one active agent per item — parallel agents take different items.

7. **Recommend the mechanical view.** `node .operator/bin/op.mjs status` prints the same facts
   as a deterministic table straight from the frontmatter, plus the active item's last journal
   lines. Always recommend it in the report — and when a shell is available, run it and
   reconcile: any difference between its table and your narrative means you misread something.
   It is read-only too.

8. **Change nothing.** No journal lines (not even `RESUMED`), no frontmatter updates, no ticked
   boxes, no file repairs, no memory writes. When the operator answers "continue on 003", hand
   over to the procedure named in step 5 — that procedure journals `RESUMED` and moves state
   under its own gates.

## Exit gate

None. op-status moves no work-item state, so there is nothing for the gate checker to verify —
the procedure ends when the operator has the report. This is deliberate: a status check must
never be a step anyone hesitates to run.

## Failure modes

- **Reporting from memory.** "I was building 003, so it must be at build" is exactly the error
  this procedure exists to prevent — another agent, or the gate checker, may have moved things.
  Every claim in the report traces to a line read from disk this session.
- **Malformed frontmatter in an item.** Report it as a finding with the file path and what
  failed to parse; do not repair it here. The fix belongs to the procedure that owns the item,
  and `doctor` can diagnose it mechanically.
- **Trusting `next:` over the journal.** The `next:` field is a hint from the last procedure;
  if events since contradict it, the journal wins and the report should say the hint is stale.
- **Tidying while passing through.** Ticking an "obviously done" checkbox or correcting a
  stale `stage:` feels helpful and breaks the read-only guarantee — worse, it moves state with
  no gate evidence. If something needs fixing, name it in the report and route to the owning
  procedure.
- **Vague next actions.** A status report whose next actions cannot be executed verbatim just
  moves the guessing one step later. Re-read the item until the next action is concrete.
- **Skipping the mechanical view.** Your narrative and `op.mjs status` disagree only when one
  of them is wrong — that disagreement is free error-detection. Recommend it every time; run it
  when you can.
