---
name: modernize
description: Use when an old or stale pull request or branch must be brought up to date, rebased, or judged on whether it should still exist.
---

## Mission

Modernize the idea, not just the branch. A clean rebase does not prove the PR still belongs in the product: the problem may already be solved, the code it changes may be gone, or landing it may bring back an old behaviour. The PM gets a clear verdict with evidence before any time goes into reviving it.

## Done when

- The PR's goal is stated in one sentence, from its title, body, linked ticket, commits, review threads and full diff, before its implementation is judged.
- The latest base and PR head were fetched; the merge base is recorded, so the PR's own changes and the base's later changes are read separately.
- The base's commits since the divergence were read, and merged or open PRs touching the same paths or the same user problem were searched.
- The report leads with one verdict and its evidence:
  - **MODERNIZE**: the goal still matters and the shape is still right.
  - **REWORK**: the goal still matters, but a mechanical rebase would keep the wrong implementation; the smallest credible rewrite is described.
  - **CLOSE**: superseded, obsolete, directionally wrong, or no longer worth its cost.
- MODERNIZE only: rebased in a separate worktree onto the fresh base; each conflict resolved by the PR's intent and the base's newer invariants; `git range-diff` and the final diff show no intended behaviour lost and nothing already landed reintroduced; the affected checks pass; pushed with `--force-with-lease` against the head recorded before the rebase.
- The report separates facts from judgment and names what could not be verified.

## Never

- Call a PR current because Git reports no conflicts.
- Rebase a PR heading for REWORK or CLOSE, or keep one alive because of its age or the effort already spent.
- Merge, close, change the base branch, or widen the scope.
- Touch a dirty worktree: the changes in it belong to the user.
- Post a PR comment the PM did not ask for.

## Stop and ask

- Verdict CLOSE: ask the PM whether to close it, with the evidence in plain words (recommend closing when another change already solved the problem).
- Verdict REWORK: ask whether to rework it now or drop it (recommend the smallest rewrite when the goal still matters to users).
- A conflict shows a product disagreement between the PR and the base: stop and ask which behaviour wins (recommend the base's, it is what users have today).
- Anything technical (conflict resolution, which checks): decide, list it, continue.

## Hand-off

- MODERNIZE pushed: `babysit`.
- REWORK approved: `implement` from the PR's goal; if the goal itself is no longer clear, `grill` first.
- CLOSE confirmed: the PM closes it or tells the agent to; nothing follows.
