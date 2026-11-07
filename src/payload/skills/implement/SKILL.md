---
name: implement
description: Use when one ticket, several tickets, or a whole spec is ready to build, or when a medium change has an agreed short plan.
---

## Mission

Turn agreed tickets into working, tested, committed code the PM can try, without drifting from what was agreed. For a spec, the main agent orchestrates and stays free to integrate and verify; implementers do the building.

## Done when

- A ticket reference was fetched from where the `Specs and tickets live in:` line in `AGENTS.md` points, and its title stated before work began.
- Spec or several independent tickets: each ticket was built by a fresh subagent in its own git worktree branched from the integration branch tip; tickets with no blocking edge between them ran in parallel; each was merged into the integration branch and verified there; implementer worktrees are removed. No subagents or worktrees available: the same tickets ran one after another in this session, and the PM was told why.
- Tests were written first, failing, at the seams the spec or plan agreed, one behaviour at a time, through the public interface, with expected values from the spec or a worked example. A seam the spec did not agree is raised, not tested silently.
- Typecheck and the touched test files ran along the way; the full suite ran once at the end and passes.
- Every `CONSTRAINTS.md` command passes, with the bar untouched.
- No review or simplification here: medium or larger work goes to `simplify-pass`, then its one review (`review`, or `review` in high-risk mode after the Production skills when the change touches what `security` covers, migrates data or schema, changes a public interface, or its release reaches users).
- Work is committed on the current branch (integration branch for a spec); tickets are closed the way the tracker closes work.
- User-visible change: the agent ran the PM journey itself on the real artifact (`principle-prove-it-works`), then wrote the PM test kit: where to go (preview URL or command), the journey step by step, what they should see at each step.

## Never

- Start building a ticket whose blockers have not merged, or let two implementers edit the same files in parallel.
- Write all tests up front, test private internals, or write an assertion that recomputes the answer the way the code does.
- Refactor or add anything the ticket did not ask for; note it for `simplify-pass` or `architecture`.
- Weaken a check, test, or threshold to get to green (`constraints` guards the bar).
- Report done from "it compiles" or green tests alone when the change is user-visible.
- Merge to main, deploy, or ship: that is the PM's call after testing the journey.

## Stop and ask

- The ticket is ambiguous about what the user should see or be able to do: ask, with a recommended reading.
- Building reveals the spec is wrong or a ticket must change scope or order: say what it costs the PM, recommend, wait.
- Merge: once no Production skill is due, hand over the test kit; merging is the PM's decision once the journey works for them.
- Technical choices (libraries, structure, test tools): decide, list one line each, continue.

## Hand-off

- Before building, the repo has no `CONSTRAINTS.md` and this is a new project or significant feature: `constraints`.
- A failure whose cause is unknown: `debug`.
- Auth, untrusted input, secrets, or a third party touched mid-build: `security` alongside.
- User-facing change and no project verification skill yet: `create-verification-skill`, once.
- Build done, medium or larger: `simplify-pass` (it hands on to `review` or the Production skills).
