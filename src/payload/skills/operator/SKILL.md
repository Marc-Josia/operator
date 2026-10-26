---
name: operator
description: >
  Route work to the right skill in the Operator pipeline (Matt Pocock understand/build,
  Addy Osmani production overlay, plus pstack overlays for prose and verification). Use when the user says
  /operator, asks which skill to run, is unsure of the next step, starts a feature or
  idea, or when two skill packs might conflict. Do not use ask-matt, using-agent-skills,
  or poteto-mode; Operator is the only router.
disable-model-invocation: true
---

# Operator

You are the **only router** in this repo. Invoke as `/operator`. Matt Pocock skills own Understand → Build and Close (`retro`). Addy Osmani skills own the quality bar before Build (`constraint-driven-development`) and the Production overlay. pstack skills are overlays (writing pass, verification, repeated mistakes), not a second lifecycle. Do not run a second lifecycle (no Addy `/spec` `/plan` `/build`, no `ask-matt`, no `using-agent-skills`, no `poteto-mode`).

A **phase** is one skill's work. When that skill's completion criterion holds, go on to the next phase in the same pass. Follow a named skill even if the user invoked it: read its `SKILL.md` and run it. If this map and a `SKILL.md` disagree, the `SKILL.md` is right.

Stop, name the next skill, and wait only at a **gate**:

- **Understanding.** `grill-with-docs` ended and the user confirmed shared understanding.
- **Breakdown.** `to-tickets` ended with the breakdown approved. Build runs in a fresh session: name `implement` or `implement-spec`.
- **Merge.** The work is committed and its checks pass. Merging, deploying, or shipping is the user's call.

A skill that asks the user a question still waits for the answer. Between gates, do not stop to ask whether to continue.

Ceremony scales with the work. Jumping from a loose idea to `implement` is the failure this skill exists to stop. Running a one-sentence fix through grill, spec, and tickets is the opposite failure.

When the user runs `/operator`, run the detector, then follow the current phase skill to the bound below.

Checklists live in `references/` at the project root (Addy). Skills that say `../../references/…` resolve there.

pstack skills are written for Cursor. Read them with these substitutions. A `.cursor/skills/` path means the skills folder where Operator installed `operator` for your agent. A step that hands off to `arena`, `how`, `why`, or a pstack playbook names something not installed here: do that step yourself (`git`, `gh`, reading the code), or skip it and say so. Its **Opening a PR** playbook is `pr`. In `correct`, "the operator" means the user.

If setup has not been run in this repo, say so and put `setup-matt-pocock-skills` in front.

The domain glossary is `GLOSSARY.md` (multi-context: `GLOSSARY-MAP.md`). Matt skills no longer read the old `CONTEXT.md` / `CONTEXT-MAP.md`. If an old file exists and its new name does not, `git mv` it to the new name (per-context `CONTEXT.md` files too) before any Matt skill runs, and tell the user.

## Detector

Take the first true branch. When the size of the work is unclear, take the larger. A bug whose cause is unknown is not small: `diagnosing-bugs` (see Overlaps).

1. The user named a skill (other than `operator`). That is the phase. Follow it.
2. **Small change.** You can state the diff in one sentence and nothing about it is open (typo, rename, log line, one-file fix, config value). No phase skill. Make the change, run the checks (`CONSTRAINTS.md` commands, otherwise typecheck and the affected tests), commit, then the merge gate. Overlays still fire.
3. **Medium change.** The scope is clear, it touches several files, it fits this session, and no design question is open. Agree a short plan in the conversation (what changes, the test seam, the check that proves it), then phase is `implement`. No spec, no tickets.
4. Loose idea or untested plan, and no shared understanding yet. Phase is `grill-with-docs` (it loads `grilling` and `domain-modeling`). If the working directory is not a repo, `grill-me`.
5. Shared understanding, no spec yet. Phase is `to-spec`.
6. Spec exists, no tickets. Phase is `to-tickets`.
7. UI or state shape is still the open question. Phase is `prototype`. After that, return to this detector.
8. A new project or significant feature is ready to code, and the repo has no `CONSTRAINTS.md`. Phase is `constraint-driven-development`. After that, return to this detector.
9. A ticket or spec is ready to code. One ticket: phase is `implement`. A whole spec with its tickets, built in one run: phase is `implement-spec`. Both use `tdd` at seams the user agreed (never Addy `test-driven-development`), then Matt `code-review`.
10. After that review, module or seam friction. Consult `codebase-design`. If the work is a deepening scan of the codebase, phase is `improve-codebase-architecture`.
11. The work is committed and headed to merge or ship. Run only the Production phases whose trigger holds, in lane order. When none holds, go to the merge gate.
12. A medium or larger change shipped, or a hard bug was just fixed. Phase is `retro`, in the session it looks back on.

Detector done: the current phase skill has been followed to the bound below, and the next skill is named.

## Lanes

### Understand

Matt. Sharpen the idea until it is tickets.

| Phase | Done when | Next |
| --- | --- | --- |
| `grill-with-docs` | Grilling frontier is empty and the user confirmed shared understanding. Domain terms that actually resolved are written down. | `to-spec` |
| `to-spec` | Spec exists and is ready for an agent. Seams confirmed with the user. | `to-tickets` |
| `to-tickets` | User approved the breakdown. Tickets exist with blocking edges and are ready for an agent. | `prototype` if shape is still in question, otherwise the detector (`constraint-driven-development`, `implement`, or `implement-spec`) |

Human entry for a new idea is `/operator` (detector branch 4) or `/grill-with-docs`. `grilling` is the engine those two load, never the entry.

Work too big for one grill-to-spec session is not this lane. Use `wayfinder`.

### Build

Matt, with one Addy gate. Make the change. Entry is `implement` (one ticket) or `implement-spec` (a whole spec), not a standalone `tdd` stage.

| Phase | Done when | Next |
| --- | --- | --- |
| `prototype` | Throwaway artifact exists and the user has reacted to the design question. Nothing from it is kept except decisions that feed the spec or tickets. | Detector, usually `implement` |
| `constraint-driven-development` | `CONSTRAINTS.md` exists with the floor and the dimensions the user picked, each with a command that runs today, and `AGENTS.md` points at it. Its intake is its own four questions, not Addy `interview-me`. Where it names Addy's `/build`, `/test`, `/review`, `/ship`, read: edit loop under `implement`, task-end tests, the review, CI. | `implement` or `implement-spec` |
| `implement` | Ticket fetched and its title stated when a reference was passed. `tdd` at agreed seams. Typecheck and single test files run along the way, the full suite once at the end. Matt `code-review` reported. Work committed on the current branch. | `codebase-design` / `improve-codebase-architecture` if seams are the leftover friction, otherwise production |
| `implement-spec` | Every ticket built by an implementer subagent with `tdd` and merged into the integration branch. One Matt `code-review` over that branch, its findings fixed. Draft PR marked ready if one exists, otherwise tickets resolved the way the tracker closes work. Implementer worktrees cleaned up. | Same as `implement` |
| `codebase-design` | Reference, not a session. Done when the design uses *module*, *interface*, *depth*, *seam*, *adapter*, *leverage*, *locality* without drifting to component / service / API / boundary. | `improve-codebase-architecture` when scanning for deepening, otherwise production |
| `improve-codebase-architecture` | HTML report opened, user picked a candidate, that candidate grilled. | Production |

`tdd` and Matt `code-review` also run as their own phase when the user names them, or when `implement` / `implement-spec` calls them.

### Production

Addy. Triggered by risk, not a fixed march. Run each phase whose trigger holds, in this order. A phase is done when that skill's own process is complete. Repo setup runs once and leaves a check behind (CI job, error tracking, alert), so the next change does not repeat it.

| Phase | Trigger |
| --- | --- |
| 1. `security-and-hardening` | The change touches auth, permissions, untrusted input, secrets, or a third party. |
| 2. `observability-and-instrumentation` | Repo setup: no logging, error tracking, or metrics baseline yet. Or the change adds a service, endpoint, job, or external call that must be visible in production. |
| 3. `ci-cd-and-automation` | Repo setup: no CI runs the checks on every change. Or the change edits the pipeline. |
| 4. `code-review-and-quality` | High-risk merge: phase 1 fired, data or schema migrates, a public interface changes, or the release reaches users. Five-axis review reported. |
| 5. `deprecation-and-migration` | Old code is leaving, or a production database schema changes (rename or drop a column: expand/contract). |
| 6. `shipping-and-launch` | The change reaches users: deploy, publish, flag flip. Pre-launch checklist, monitoring, rollout, and rollback in place. |

After the last triggered phase: merge gate, then close.

### Close

Matt. Improve the environment for the next run, not the code.

| Phase | Done when | Next |
| --- | --- | --- |
| `retro` | Run in the session it looks back on (after a clear, point it at that session's log). Candidates presented most severe first. Mechanical mistakes proposed as checks, judgement calls as coding standards. | `correct` for the checks the user accepted, otherwise the map ends |

Also run `retro` after `diagnosing-bugs` lands a fix, to ask what would have prevented the bug.

## Overlaps

Two skills can cover the same English word. The detector picks.

**Review.** One review per change. After `implement` or `implement-spec`, `code-review` (Matt: Standards and Spec). Add `code-review-and-quality` (Addy: five axes) only on a high-risk merge (Production phase 4), after CI. A small change gets no review skill: its checks are the gate. `blast-radius` is not a review: it proves what the change breaks outside the diff (see Overlays).

**Debug.** User reports a hard bug, slowness, or something broken. Use `diagnosing-bugs` (Matt: build a red loop first). The fix lands where the system first went wrong, not where the symptom surfaced: `principle-fix-root-causes`. After the fix, `tdd` for the regression test, then `retro`. Do not use Addy debugging skills.

**Grill.** Entry is `grill-with-docs`. Use `grill-me` only when grilling without writing docs. `grilling` is the engine those two load, never the entry. Do not use Addy `interview-me`.

**Spec / tickets.** `to-spec` then `to-tickets`. Do not use Addy spec/plan skills.

**Tests.** Always Matt `tdd`. Never Addy `test-driven-development` or pstack `tdd` (not installed).

**Implementation.** `implement` per ticket, `implement-spec` for a whole spec in one run. Do not use Addy `incremental-implementation`.

**Quality bar.** `CONSTRAINTS.md` (Addy `constraint-driven-development`) holds the numbers. Its commands gate every change, small ones included. The review enforces the rest. Matt `retro` proposes new checks and standards after the work. `correct` lands the mechanical ones.

## Overlays

These fire in addition to the phase, not instead of it.

- Any prose: `unslop`
- Auth, untrusted input, secrets, or third parties, already during Build: `security-and-hardening`
- Measured perf, Core Web Vitals, or N+1: `performance-optimization`, each number it produces vetted with `benchmark-checklist`
- An agent silences a check, skips or deletes a test, strips assertions, or lowers a threshold to get to green: `constraint-driven-development` (guard the bar)
- A mistake the agent repeats, or the user corrects the same mistake twice: `correct`. It makes the mistake impossible (architecture, then types, then a lint whose error names the fix, then a test, docs last) and proves each check fails on a real past instance. Its rule table goes in the project part of `AGENTS.md`, after the `operator:end` marker.
- A small diff you do not trust, or a high-risk merge (Production phase 4 trigger) before `code-review-and-quality`: `blast-radius`. It finds what the change breaks outside the diff and proves the one fact it is safe because of.
- A medium or larger user-facing change (UI, CLI, API) in a repo with no verification project skill: `create-verification-skill`, once. It leaves a `verify-<app>` project skill behind. List it under `## Project skills` in `AGENTS.md`. Drive every later user-facing change with it before the merge gate.
- Before declaring any task done: `principle-prove-it-works`. Check the real artifact (run the feature, read the value, inspect the diff), not a proxy or "it compiles".
- Writing a pull request body: `pr`
- A performance number you measured (benchmark, speedup, regression, before/after): `benchmark-checklist` before you report or act on it. Any other number in a final report: re-measure it at report time, or label it unverified.

## Side paths

Outside the idea-to-ship map. Still indexed.

- Effort too big for one grill-to-spec session: `wayfinder`
- Issue queue hygiene: `triage`
- Compact this session for the next agent: `handoff`
- Steps only a human can perform (credentials, third-party dashboards): `wizard`
- Editing skills, `AGENTS.md`, or `CLAUDE.md`: `writing-for-agents` then `unslop`
- Changing skill setup: `setup-matt-pocock-skills`
- Cited research: `research`
- The verification skill drifted from the app, or a periodic audit of it: `maintain-verification-skill`
