---
name: debug
description: Use when something is broken, throwing, failing, flaky, or slow and the cause is not already known (a bug report, an error message, a red test or CI run, "it does not work").
---

## Mission

Fix the bug where the system first went wrong, not where the symptom surfaced, and leave a test that keeps it fixed. Guessing at code before the bug can be reproduced is the failure this skill exists to stop.

## Done when

- One command reproduces the user's exact symptom: it was run and shown (secrets redacted), it goes red on this bug, gives the same verdict each run (or a pinned high rate for a flaky bug), takes seconds, and runs without a human.
- The repro was cut down until every remaining part is needed to keep it red.
- Several falsifiable hypotheses were ranked before testing; each probe tested one of them, changing one thing at a time. Slowness was measured before and after, not guessed.
- The fix is at the root cause (`principle-fix-root-causes`), committed unasked on a work branch, never on `main`, `master`, `develop`, or `staging`; the commit says what the cause was.
- A regression test at a seam that exercises the real bug pattern failed before the fix and passes after. No such seam exists: that is recorded as a finding for `architecture`.
- The original, un-minimised repro now passes; the full suite and `CONSTRAINTS.md` commands pass.
- Temporary logs and throwaway harnesses are removed.

## Never

- Change code to fix before the repro command exists and goes red.
- Patch the symptom, add a retry, or catch and swallow the error to make it disappear.
- Weaken, skip, or delete a test or check to get to green.
- Print secrets from logs, requests, or env in what you show.
- Report a speedup without `benchmark-checklist`.

## Stop and ask

- No reproduction loop can be built: say what was tried, then ask the PM for access to where it happens, a captured artifact (log, recording with timestamps), or permission to add temporary production logging.
- The root-cause fix changes behaviour users rely on: describe the change in user terms, recommend, wait.

## Hand-off

- No good seam for the regression test: `architecture`.
- Blind in production (no telemetry to locate it): `observability`, then back here.
- Fix landed, medium or larger: `review` (high-risk fix: the Production skills whose trigger holds, `review` in high-risk mode among them); then `retro` in this session to ask what would have prevented the bug.
- The same mistake keeps recurring: `correct`.
