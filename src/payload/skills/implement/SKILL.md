---
name: implement
description: Use whenever code is about to change and what to build is settled, from a one-line fix to a medium change, one ticket, or a whole spec. Holds the branch and commit rules, scales the ceremony to the size of the change, and ends with a PM test kit. Not while the idea is still loose (`grill`) or a bug's cause is unknown (`debug`).
---

## Mission

Turn what was agreed into working, tested, committed code the PM can try, without drifting from it. The user is the Product Manager (PM): they own who, what problem, and what outcome; the agent owns every technical choice. Ceremony scales with the work: a one-sentence fix needs no plan, a spec needs orchestration. Size unclear: take the larger.

## Done when

- Branch: work started off `main`, `master`, `develop`, and `staging`. On one of them, a `feat/…`, `fix/…`, or `chore/…` branch was created before the first edit and named to the PM in one line.
- Small change (the diff fits one sentence): made, then the `CONSTRAINTS.md` commands (otherwise typecheck and the affected tests) pass.
- Medium change (clear scope, one session, no open design question): a short plan in chat came first (what changes, the check that proves it).
- A ticket reference was fetched from the place the tracker field of `.operator/state.json` names (missing or local: `docs/changes/<change-id>/`), and its title stated before work began.
- Spec or several independent tickets: each ticket was built by a fresh subagent in its own git worktree branched from the integration branch tip; tickets with no blocking edge ran in parallel; each was merged into the integration branch and verified there; implementer worktrees are removed. No subagents or worktrees: the same tickets ran one after another here, and the PM was told why.
- Tests were written first, failing, at the seams the spec or plan agreed, one behaviour at a time, through the public interface, with expected values from the spec or a worked example. A seam the spec did not agree is raised, not tested silently.
- Typecheck and the touched tests ran along the way; the full suite ran once at the end and passes. Every `CONSTRAINTS.md` command passes, with the bar untouched.
- Code is the smallest that does what was agreed: no edge case off the main path, no `any` or `@ts-ignore` in TypeScript without a reason written next to it, color and radius from theme tokens, comments only above a function, class, or module, saying how to use it. New files sit under `src`, `tests`, `docs`, `config`, `tools`, `examples`, `prototype`, or `temp`; the root only when tooling requires it.
- Committed without being asked once the checks pass, and before handing back to the PM; the message says what changed and why. Tickets are closed the way the tracker closes work.
- Spec fully built: `docs/features/<feature>.md` describes what exists now, `docs/architecture.md` follows any structural change, and the spec's `docs/changes/<change-id>/` folder is deleted.
- User-visible change: the agent ran the journey itself on the real artifact (`principle-prove-it-works`), then gave the PM a test kit: where to go (preview URL or command), the journey step by step, what they should see at each step.

## Never

- Commit on, merge into, push to, rebase onto, or enable auto-merge on `main`, `master`, `develop`, or `staging` without the PM's explicit go for that one merge. Merging, deploying, and shipping are the PM's call.
- Start a ticket whose blockers have not merged, or let two implementers edit the same files in parallel.
- Write all tests up front, test private internals, or write an assertion that recomputes the answer the way the code does.
- Refactor or add anything nobody asked for; note it for `simplify-pass` or `architecture`.
- Weaken a check, test, or threshold to get to green (`constraints` guards the bar).
- Report done from "it compiles" or green tests alone when the change is user-visible.
- Stop to ask whether to continue: the PM decides only at the understanding, breakdown, and merge gates.

## Stop and ask

- The ticket is ambiguous about what the user should see or be able to do: ask, with a recommended reading.
- Building shows the spec is wrong or a ticket must change scope or order: say what it costs the PM, recommend, wait.
- Merge: once no production skill is due, hand over the test kit and wait; merging is the PM's decision once the journey works for them.
- Technical choices (libraries, structure, test tools): decide, list one line each, continue.

## Hand-off

- Before building, a new project or significant feature and no `CONSTRAINTS.md`: `constraints`.
- A failure whose cause is unknown: `debug`.
- Auth, untrusted input, secrets, or a third party touched mid-build: `security` alongside.
- User-facing change and no project verification skill yet: `create-verification-skill`, once (its `.cursor/skills/` paths mean this agent's skills folder, `.claude/skills/` for Claude Code).
- Build done, medium or larger: `simplify-pass` (it hands on to `review` or the production skills).
- Small change committed: the test kit, then the merge gate.
