---
name: pr
description: Use when opening a pull request, or writing or updating its title or description.
---

## Mission

Write a PR body the PM reads in a minute and acts on: what the user can now do, how to try it, what could go wrong. Technical detail sits below for reviewers. The merge gate is the PM running the journey, so the body exists to make that easy.

## Done when

- First section, in the PM's product words (no file names, no jargon): what the user can now do, or what changed for them.
- Test kit: where to go (preview URL or command), the journey step by step, what the PM should see at each step. Reuse the kit from `ship` when it ran.
- The agent ran that journey on the real artifact before writing it (`principle-prove-it-works`), and the body shows the evidence: screenshot or output, before and after.
- Risks, in plain words: can this be undone cheaply or not (data change, deletion, public interface, anything sent to users), and what outside the diff it could break. On a high-risk merge, the `blast-radius` result.
- Below a separator, for reviewers: the smallest view that shows the change (diagram, call tree, diff sketch), the checks run with their result, the ticket or spec it closes.
- Every claim matches the diff as pushed. Every number was re-measured for this body or is labelled unverified.
- The prose passed through `unslop`.

## Never

- Lead with implementation, or present a refactor as user value.
- Put a journey in the test kit the agent did not run itself.
- Write "no risk". Say whether it can be undone and what it touches.
- Merge. Merging is the PM's call at the merge gate.

## Stop and ask

- A risk cannot be undone (data loss, a migration, a public change) and the spec did not mention it: ask the PM to accept it before the PR leaves draft (recommend: hold it in draft until they do).

## Hand-off

- PR open: `babysit` until checks, review bots and the base are settled; it ends at the merge gate with this test kit.
- After the merge, a medium or larger change: `retro`.
