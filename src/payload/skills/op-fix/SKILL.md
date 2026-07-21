---
name: op-fix
description: "The bug-fix procedure: reproduce with a failing test BEFORE any fix attempt, root-cause with evidence, fix the cause (never the symptom) through a gated work item, keep the regression test forever, and record the lesson. Use it whenever the operator reports a bug, defect, regression, crash, or wrong output — even an 'obvious one-liner', and even when a test failure surfaces mid-task. New or planned work goes to op-new; resuming planned implementation goes to op-build."
---

# op-fix — reproduce, root-cause, fix, remember

## Purpose

Turn a bug report into a verified fix that cannot silently regress. The procedure exists
because the two most common fix failures are fixing without reproducing (you cannot prove the
bug is gone) and patching the symptom instead of the cause (the defect survives and resurfaces
elsewhere). Every fix travels a work item, leaves a permanent regression test behind, and —
when the root cause was non-obvious — a lesson in memory so no future agent pays for the same
discovery twice.

## Entry criteria

- The operator reported defective behavior, or a test/gate surfaced one, in existing code.
- You have read `.operator/memory/project.md` and every rule in
  `.operator/memory/conventions.md` whose `paths:` matches the area you suspect.
- No fix code has been written yet. If you already changed code speculatively, revert it —
  a repro observed on modified code proves nothing.
- Special case: a bug discovered while building another work item. If it blocks that item's
  tasks and sits inside its declared Scope, fix it there under that item's gates. Otherwise
  file it through this procedure as its own item — never widen a running item's scope for an
  unrelated bug.

## Steps

1. **Understand the report.** Restate the bug in one sentence as *expected vs actual*: what
   should happen, what happens instead, who is affected. Ask the operator only questions whose
   answers change the diagnosis or the repro — exact input, environment, version, frequency.
   Everything else you can discover yourself.

2. **Open the work item.** Follow `.agents/skills/op-new/SKILL.md` to create it — bugs go
   through triage like all work. Bug specifics:
   - Title = the symptom (`012-date-offset-bug`), Problem = expected / actual / impact.
   - The first task is always `- [ ] Write a failing test that reproduces the bug`. Putting it
     first makes skipping it visible at the build gate (`tasks-complete`).
   - Scope includes the test location, not just the suspect source files.
   - Most fixes honestly score **quick**. But triage rules still apply in full: a bug in a
     protected path (`.operator/config.json`) is **never quick** — any scorecard "yes" routes
     to the standard lane, so triage it standard from the start. A fix that needs a schema
     migration or crosses module boundaries follows the same rule.
   - Run `node .operator/bin/op.mjs gate <id>` to pass intake. On the standard lane, continue
     through `op-plan` (spec + operator approval) before any fix work; the repro test in step 3
     is still written first — it is diagnosis, not implementation.

3. **Reproduce before you fix — write the failing test now.** Before forming any opinion about
   the fix, write an automated test that fails because of the bug. The failing test is the only
   objective definition of "fixed", and it becomes the permanent regression test. Pick the right
   test level (an installed test-strategy or TDD skill helps here) — prefer the lowest level
   that exercises the real defect.

   Run it and confirm it fails **for the bug's reason** — read the failure output; a test that
   fails on a typo in your setup reproduces nothing. Then journal it, before any fix attempt:

   ```
   - 2026-07-14 REPRO failing test: test/parser.test.mjs::"parses ISO dates with offset" —
     fails with "expected 2026-03-01T10:00+02:00, got Invalid Date"
   ```

   **If the bug is genuinely untestable, the bar is high.** Most "untestable" bugs are testable
   one level down: extract the logic from the framework, fake the clock, stub the network,
   capture the race with a deterministic interleaving. When the failing test is not immediate,
   walk down the ladder of repro harnesses — failing test, HTTP script, CLI diff, headless
   browser, trace replay, throwaway harness — before
   concluding anything is untestable. Exhaust those options first. Only when
   automation is truly impossible (e.g. a vendor-device-only rendering defect), ask the
   operator for an explicit waiver and journal it with the reason and numbered manual repro
   steps:

   ```
   - 2026-07-14 WAIVER repro granted by operator: "ok, manual repro is fine here" — untestable
     because the defect only occurs on the vendor's physical card reader; manual repro:
     1) connect reader 2) swipe expired card 3) observe app crash instead of decline message
   ```

   Then amend the Definition of done checkbox `Tests exist for the changed behavior and pass`
   to `Manual repro steps re-run after fix and journaled (test waived — see WAIVER line)`, so
   the review gate's `dod-complete` check stays honest.

4. **Root-cause it.** Debug systematically — follow an installed debugging skill when the
   project has one; the loop is the same either way: isolate
   (bisect, minimal case), hypothesize, verify each hypothesis with evidence. You have found
   the root cause when you can explain the failure mechanism end-to-end and it predicts the
   failing test's exact output — not merely a place where adding a guard makes the error
   disappear. Record it in the workitem's Problem section as one or two lines starting
   `Root cause:`. Why write it down: the reviewer at op-ship must be able to judge whether the
   fix addresses the cause, and they cannot do that from a diff alone.

5. **Fix the cause, minimally.** Make the smallest change that makes the failing test pass
   without breaking any other test. Fix where the mechanism breaks, not where the error
   surfaces — a null-check at the crash site that leaves invalid data flowing upstream is a
   symptom patch, and it will fail review. No drive-by refactors and no unrelated cleanup: if
   you spot something worth improving, file a new work item.

   Escalation tripwire (same as op-build): if the fix grows past the quick-lane caps
   (3 files / 80 changed lines — the build gate measures the real diff), touches a protected
   path, or turns out to require a design decision — stop, run
   `node .operator/bin/op.mjs escalate <id>`, backfill the spec via `op-plan`, and get the
   operator's approval before continuing. Never silently widen Scope.

   Attempt discipline — never shotgun to green. Each time a fix fails its test and you retry,
   journal `- <date> ATTEMPT <task> failed: <reason>`. At `postmortemThreshold` ATTEMPTs
   (default 3, in `.operator/config.json`) since the last postmortem, the build gate's
   `postmortem-if-thrashing` check blocks — correctly: repeated failure means the *method*, not
   just the bug, needs examining. Stop, copy `.operator/templates/postmortem.md` to
   `.operator/work/<id>/postmortem-NNN.md`, name why the approach kept missing, journal
   `- <date> POSTMORTEM postmortem-NNN.md: <one line>` (this resets the counter), then escalate
   or ask the operator before trying again.

6. **Assess the blast radius.** Before locking the fix in, check what else the change touches:
   read the call sites and other users of the code you changed — the callers the diff does not
   show — and confirm no other path
   relied on the buggy behavior. If a sibling path shares the same latent cause, add a test for it
   or note it as a follow-up — do not silently widen Scope into a refactor. Keep this light and
   within the lane's caps.

7. **Keep the regression test.** The test written in step 3 stays in the suite, in the suite's
   normal location, permanently — it is the proof of the fix and the guard against the bug's
   return. Never delete, skip, or weaken it once it passes. Run the full test command from
   `.operator/config.json` to confirm nothing else broke. On a waived repro, re-run the manual
   steps instead and journal the outcome
   (`- <date> REPRO manual steps re-run after fix: bug no longer reproduces`).

8. **Record the lesson.** First ask the post-mortem question: **what would have prevented this
   bug?** The answer routes the learning — a lesson (`L-NNN`) when the next agent needs the
   knowledge, a `conventions.md` rule when a standing rule would have blocked it, a follow-up
   work item when the prevention is architectural (a missing seam from the root-cause finding
   goes here). For every **non-obvious** root cause, append an `L-NNN` entry to
   `.operator/memory/lessons.md` in the file's exact format:

   ```
   L-004: When parsing user-supplied dates, use the shared dateutil.parseIso helper, because
   native Date() silently mis-parses timezone offsets on Node <20. (source: 012-date-offset-bug)
   ```

   Non-obvious means any of: the cause lived somewhere other than the reported symptom; it took
   more than one hypothesis to confirm; or the next agent would plausibly hit it again. A plain
   typo found in one minute earns no lesson — low-value entries burn the 150-line cap and bury
   the lessons that matter. Next `L-NNN` = highest existing number + 1; numbers are never
   reused, even after entries move to archive. If the file is at its cap, run `op-memory` to
   consolidate before appending. Then journal it:

   ```
   - 2026-07-14 MEMORY lesson recorded: L-004 (native Date offset parsing)
   ```

9. **Close the build stage.** Tick every completed task checkbox, set frontmatter `next:` to
   the review step, and run the exit gate below. Then hand the item to
   `.agents/skills/op-ship/SKILL.md` for review, delivery, and the memory harvest — op-fix does
   not ship.

## Exit gate

```
node .operator/bin/op.mjs gate <id>
```

Run at the **build** stage. The checker verifies — you assert nothing:

- `tasks-complete` — every Tasks checkbox ticked, including the failing-test task from step 2.
- `tests-pass` — the configured test command exits 0, regression test included.
- `diff-within-scope` — every file in the measured diff matches the declared Scope.
- Quick lane only: `diff-within-lane-caps` (≤3 files, ≤80 changed lines) and
  `protected-paths-lane` (no protected path in the diff).

On pass, the checker appends the `GATE build PASSED` journal line and advances the stage
itself. On fail, it prints each failing check with its fix action — do exactly that and re-run;
never edit the stage by hand.

## Failure modes

- **Fix before repro.** Any code change before the `REPRO` journal line is a guess. Revert,
  reproduce, start over.
- **A "failing" test that never failed.** If you did not watch the test fail with the bug's
  own error before the fix, it tests your fix, not the bug — it would pass even if the bug were
  still there. Check out the pre-fix state (or stash the fix) and observe the failure.
- **Symptom patch.** If you cannot state the mechanism in the `Root cause:` line, you have
  suppressed an error, not fixed a defect. Return to step 4.
- **Deleting or weakening the regression test** after it passes ("cleanup", "duplicate
  coverage"). The test is the fix's contract; removing it is undoing the fix.
- **Protected-path fix rushed through the quick lane.** The intake and build gates both reject
  it; triage it standard from the start instead of losing the work at the gate.
- **Bundled refactors.** They widen the diff past caps and past Scope, and they hide the fix
  from the reviewer. New work item.
- **"Untestable" as a shortcut.** A waiver without the operator's quoted words and manual repro
  steps in the journal does not count — and most such bugs were testable one level down.
- **Lesson skipped — or lesson spam.** A non-obvious cause with no `L-NNN` wastes the debugging
  effort you just spent; a trivial one recorded anyway buries real lessons. Apply the
  non-obvious test from step 8 honestly.
