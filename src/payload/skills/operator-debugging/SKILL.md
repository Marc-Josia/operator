---
name: operator-debugging
description: Expertise pack — the scientific method for bugs. Reproduce deterministically, isolate by bisecting code/data/time down to a minimal repro, test one falsifiable hypothesis at a time, verify the root cause with evidence BEFORE writing any fix, fix the mechanism (never the symptom), and prove it with the regression test; includes when to add observability instead of guessing, and the anti-patterns to refuse by name (shotgun debugging, fix-without-repro, blaming the framework, symptom-patching). Consumed by op-fix at its root-cause step, and by op-build when a mid-build failure resists quick diagnosis. Consult it the moment any failure resists your first explanation — an unexplained test failure, intermittent behavior, a crash you cannot yet trace, or a fix that "works" for reasons you cannot state. Advise only: it returns a verified root-cause finding to the procedure that invoked it and never moves work-item state.
---

# operator-debugging

## Role of this pack

This is an expertise pack, not a procedure. Its product is a **verified root-cause finding** —
mechanism, evidence, fix location — returned to the procedure that invoked it (op-fix at its
root-cause step, or op-build when a task's failure resists quick diagnosis). It never changes a
work item's stage, lane, or records; the invoking procedure records what you return.

Debugging is not staring at code until inspiration strikes. It is running experiments: every
step below either eliminates a suspect or confirms a mechanism. If a step did neither, it was
not an experiment.

## The method

Work the loop in order. Skipping ahead is how the anti-patterns at the bottom happen.

1. **Reproduce deterministically.** Same input, same failure, every run — before you form any
   opinion about the cause. Control the variables until it is deterministic: pin the clock,
   seed randomness, stub the network, fix concurrency ordering. A bug that reproduces
   "sometimes" is not yet reproduced, and the nondeterminism itself is a lead: intermittence
   almost always means time, a race, or shared state. In op-fix, this step is the failing test
   written before any fix (use `.agents/skills/operator-test-strategy/SKILL.md` to pick its
   level); confirm it fails for the bug's own reason by reading the failure output.

2. **Isolate — shrink the search space before explaining anything.** Halving the haystack five
   times beats inspecting straws. Bisect along whichever axis moves fastest:
   - **by code**: `git bisect` between a known-good and known-bad commit, using the repro as
     the verdict at each step — it finds the breaking change in log₂(n) runs;
   - **by data**: halve the failing input until a minimal failing case remains — one row, one
     field, one character;
   - **by time/config**: last version that worked, environment differences, dependency bumps,
     feature flags — diff what changed between working and broken.
   Then build the **minimal repro**: strip everything the failure does not need. Each removal
   that keeps the failure eliminates a suspect; what remains is the mechanism's neighborhood.

3. **Hypothesize — one variable at a time.** State each hypothesis falsifiably, prediction
   included: "X causes Y because Z — if true, I will observe O when I do E." Write it down
   before running the experiment; a hypothesis formed after seeing the result explains
   anything and predicts nothing. Change exactly one thing per experiment, and revert it
   before the next — two simultaneous changes make the outcome unreadable.

4. **Verify with evidence — before any fix.** Evidence is an observation matching the
   prediction: a log line, a debugger value, a bisect verdict, an isolated test on the
   suspect unit. "A plausible reading of the code" is not evidence — the code was misread once
   already when the bug was written. You have the root cause when you can explain the failure
   mechanism end-to-end **and** the explanation predicts the exact observed failure — the
   message, the values, the timing — not merely a spot where adding a guard makes the error
   disappear.

5. **Fix the root cause.** Change the code where the mechanism breaks, not where the error
   surfaces. If invalid data flows from A and crashes in D, the fix belongs at A; a null-check
   at D silences this stack trace and ships the invalid state to E. Keep the fix minimal —
   scope discipline and escalation belong to the invoking procedure.

6. **Prove it with the regression test.** The failing test from step 1 now passes, and the
   full suite stays green. If the test still fails, your verified mechanism was incomplete —
   return to step 3 with the new evidence. The test stays in the suite permanently; op-fix
   owns that rule.

## When to add observability instead of guessing

When hypotheses are exhausted without evidence, when the failure only occurs somewhere you
cannot attach a debugger, or when intermittence has no visible pattern — stop guessing and
instrument:

- Add targeted, structured log lines at the boundaries of the suspect region: inputs, outputs,
  timings, and identifiers that correlate events across the flow.
- Assert the invariants you believe hold ("this list is sorted", "this id is unique here").
  A failing assertion converts a belief into evidence at the exact moment it breaks.
- Re-run the repro, read what actually happened, and go back to step 3 with real data.

Two rounds of instrumentation beat ten rounds of guessing, because each round produces
observations instead of opinions. Treat diagnostic instrumentation as scaffolding: remove it
after diagnosis, or, if it has durable operational value, tell the invoking procedure so it
can be kept deliberately as part of the declared work — never leave it behind by accident.

## Anti-patterns — refuse these by name

- **Shotgun debugging** — changing several things at once until the failure disappears. You
  cannot tell which change mattered, you learned nothing about the mechanism, and you likely
  added a latent bug. Telltale: a diff you cannot justify line by line. Recovery: revert
  everything, return to step 1.
- **Fix-without-repro** — patching from a theory of the bug. Without a reproduction there is
  no proof the bug existed as described, no proof it is gone, and no regression guard. op-fix
  refuses this outright: the failing test comes before any fix.
- **Blaming the framework** — "must be a bug in the runtime / the ORM / the compiler." The
  framework runs in a million projects; your code runs in one — the prior is overwhelmingly
  against you. Suspect the platform only after a minimal repro *outside your codebase* still
  fails; that repro then becomes an upstream bug report, and your change is a documented
  workaround pointing to it, not a silent hack.
- **Symptom-patching** — the null-check at the crash site, the retry around a flaky call, the
  try/catch that swallows the error. The broken mechanism keeps producing invalid state, which
  resurfaces later wearing a different stack trace, harder to trace to its source. The test:
  does the change interrupt the mechanism you verified in step 4, or does it silence the
  messenger? If you cannot state the mechanism, it is a patch, not a fix.

## Worked example, compressed

Report: "CSV import crashes on the June export" (10,000 rows).

1. Reproduce: import the file — crash, `TypeError: invalid UTF-8 sequence`, every run.
2. Isolate by data: first 5,000 rows crash; 2,500 pass; keep halving → row 4,217 alone
   crashes. Minimal repro: one row, then one field — the `name` field crashes on its own.
3. Hypothesis: "the field contains a lone UTF-16 surrogate; the encoder throws on it — if
   true, a hex dump shows a code point in D800–DFFF."
4. Evidence: hex dump shows `ED A0 BD` (unpaired surrogate). Confirmed.
5. Root-cause fix: the upstream exporter truncates names mid-code-point at 255 bytes; fix the
   truncation to respect character boundaries — not a try/catch around the importer's decode
   call, which would silently drop customers instead of crashing.
6. Prove: the minimal-repro test (a name truncated mid-emoji) fails pre-fix, passes post-fix;
   full suite green.

## What to return to the invoking procedure

Return the finding in this exact shape; the invoking procedure records it in the work item
(op-fix writes it as the `Root cause:` line in the Problem section):

```
ROOT-CAUSE FINDING (operator-debugging)
root cause: <mechanism in 1–2 lines: X does Y under condition Z, producing the observed failure>
evidence: <the confirming observation — bisect verdict, log line, debugger value, minimal repro>
fix location: <file/function where the mechanism breaks — not where the error surfaces>
ruled out: <hypotheses eliminated, and by which experiment>
lesson-worthy: <yes + one-line draft if the cause was non-obvious | no — trivial once seen>
```

The `lesson-worthy` line matters: op-fix records an `L-NNN` lesson for non-obvious causes, and
you — having just done the investigation — are the best judge of whether the next agent would
plausibly pay for this discovery again.
