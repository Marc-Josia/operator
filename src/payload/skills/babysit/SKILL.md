---
name: babysit
description: Use when a pull request is open and must get through CI, review bots, and base-branch drift before the merge gate, or when the PM asks to watch or fix up a PR.
---

## Mission

Bring an open PR to the merge gate truly ready, so the PM spends their time on the journey and never on a red check, an unanswered bot, or a branch that fell behind. The PR stays the size the goal needs: review loops grow a PR one cheap-looking fix at a time, and this skill pushes back.

## Done when

- On the latest head: required checks green, every review bot that runs on the repo finished, the branch up to date with its base and reported mergeable, no human review still requesting changes.
- Every bot or reviewer finding newer than the last push was checked against the source before any code changed, then either fixed (checks rerun green) or declined with a written reason in a reply, and its thread resolved after the reply posted.
- Declined findings that are not bugs in the intended case (rare paths, extra guards, extra tests, small perf, extra compatibility) are listed as follow-ups in the PR body, not fixed in it.
- A CI failure was classified as the repo's fault (fixed) or infrastructure (rerun once, named as a flake).
- When the base moved and the new commits touch this PR's files, the branch was rebased and the checks ran again before calling it ready.
- Every fix that changes behaviour was proven like the build was (`principle-prove-it-works`), and the PM test kit from `pr` still holds; the body was updated if it no longer does.
- Every comment posted on the user's behalf opens with `> [!NOTE]` and `> 🤖 **<model> responding on behalf of <user>**`, leads with the conclusion, cites the code or check, and was checked for secrets before posting.

## Never

- Write a sleep or polling loop. Wait with one watcher per PR, using the harness's PR watch or background monitor; a subagent never watches the parent's PR. An event that needs no action gets no message.
- Act on a check or comment older than the latest push, or change code because a bot said so without reading the code it cites.
- Treat bot findings as a second `review`: they are triaged here, never re-litigated against the review that already ran.
- Grow the diff for a nit. Prefer the fix that deletes or narrows code.
- Merge, enable auto-merge, or enter a merge queue: merging is the PM's call. Force-push without `--force-with-lease`, or push any branch but this PR's.
- Post "still waiting" or status-only comments.

## Stop and ask

- Another PR overlaps and makes this one obsolete: stop watching and ask the PM whether to close it (recommend closing when the other one covers the goal).
- A finding is really a product question (behaviour the spec did not decide): ask the PM in plain words, with a recommendation.
- Anything else (which fix, decline or fix a nit, rerun or fix CI): decide, list it one line each, continue.

## Hand-off

- A check fails and the cause is unknown: `debug`, then back here.
- A fix needs more than the PR's scope, or a finding reveals seam friction: note it as a follow-up; seam friction goes to `architecture`.
- The base moved so far that the rebase conflicts with the PR's intent: `modernize`.
- Ready: the merge gate. Hand the PM the test kit from `pr` and wait.
