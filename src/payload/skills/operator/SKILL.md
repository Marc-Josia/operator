---
name: operator
description: >
  Route work to the right skill in the Operator pipeline (Matt Pocock understand/build,
  Addy Osmani production overlay, plus pstack unslop for prose). Use when the user says
  /operator, asks which skill to run, is unsure of the next step, starts a feature or
  idea, or when two skill packs might conflict. Do not use ask-matt, using-agent-skills,
  or poteto-mode; Operator is the only router.
disable-model-invocation: true
---

# Operator

You are the **only router** in this repo. Invoke as `/operator`. Matt Pocock skills own Understand → Build and Close (`retro`). Addy Osmani skills own the quality bar before Build (`constraint-driven-development`) and the Production overlay. pstack `unslop` is a writing pass, not a second lifecycle. Do not run a second lifecycle (no Addy `/spec` `/plan` `/build`, no `ask-matt`, no `using-agent-skills`, no `poteto-mode`).

A **phase** is one skill's work. One phase per pass. When that skill's completion criterion holds, name the next skill and wait. Follow a named skill even if the user invoked it: read its `SKILL.md` and run it. If this map and a `SKILL.md` disagree, the `SKILL.md` is right.

Jumping from a loose idea to `implement` is the failure this skill exists to stop.

When the user runs `/operator`, run the detector, then follow the current phase skill to the bound below.

Checklists live in `references/` at the project root (Addy). Skills that say `../../references/…` resolve there.

If setup has not been run in this repo, say so and put `setup-matt-pocock-skills` in front.

The domain glossary is `GLOSSARY.md` (multi-context: `GLOSSARY-MAP.md`). Matt skills no longer read the old `CONTEXT.md` / `CONTEXT-MAP.md`. If an old file exists and its new name does not, `git mv` it to the new name (per-context `CONTEXT.md` files too) before any Matt skill runs, and tell the user.

## Detector

Take the first true branch.

1. The user named a skill (other than `operator`). That is the phase. Follow it.
2. Loose idea or untested plan, and no shared understanding yet. Phase is `grill-with-docs` (it loads `grilling` and `domain-modeling`). If the working directory is not a repo, `grill-me`.
3. Shared understanding, no spec yet. Phase is `to-spec`.
4. Spec exists, no tickets. Phase is `to-tickets`.
5. UI or state shape is still the open question. Phase is `prototype`. After that, return to this detector.
6. A new project or significant feature is ready to code, and the repo has no `CONSTRAINTS.md`. Phase is `constraint-driven-development`. After that, return to this detector.
7. A ticket or spec is ready to code. One ticket, or work small enough for this session: phase is `implement`. A whole spec with its tickets, built in one run: phase is `implement-spec`. Both use `tdd` at seams the user agreed (never Addy `test-driven-development`), then Matt `code-review`.
8. After that review, module or seam friction. Consult `codebase-design`. If the work is a deepening scan of the codebase, phase is `improve-codebase-architecture`.
9. The change is headed to production (merge, deploy, ship). Run the production overlay in order, still one phase per pass: `security-and-hardening`, then `observability-and-instrumentation`, then `ci-cd-and-automation`, then `code-review-and-quality`, then `deprecation-and-migration` if old code is leaving or a production database schema changes, then `shipping-and-launch`.
10. The change shipped, or a hard bug was just fixed. Phase is `retro`, in the session it looks back on.

Detector done: the current phase skill has been followed to the bound below, and the next skill is named.

## Lanes

### Understand

Matt. Sharpen the idea until it is tickets.

| Phase | Done when | Next |
| --- | --- | --- |
| `grill-with-docs` | Grilling frontier is empty and the user confirmed shared understanding. Domain terms that actually resolved are written down. | `to-spec` |
| `to-spec` | Spec exists and is ready for an agent. Seams confirmed with the user. | `to-tickets` |
| `to-tickets` | User approved the breakdown. Tickets exist with blocking edges and are ready for an agent. | `prototype` if shape is still in question, otherwise the detector (`constraint-driven-development`, `implement`, or `implement-spec`) |

Human entry for a new idea is `/operator` (detector branch 2) or `/grill-with-docs`. `grilling` is the engine those two load, never the entry.

Work too big for one grill-to-spec session is not this lane. Use `wayfinder`.

### Build

Matt, with one Addy gate. Make the change. Entry is `implement` (one ticket) or `implement-spec` (a whole spec), not a standalone `tdd` stage.

| Phase | Done when | Next |
| --- | --- | --- |
| `prototype` | Throwaway artifact exists and the user has reacted to the design question. Nothing from it is kept except decisions that feed the spec or tickets. | Detector, usually `implement` |
| `constraint-driven-development` | `CONSTRAINTS.md` exists with the floor and the dimensions the user picked, each with a command that runs today, and `AGENTS.md` points at it. Its intake is its own four questions, not Addy `interview-me`. Where it names Addy's `/build`, `/test`, `/review`, `/ship`, read: edit loop under `implement`, task-end tests, the two reviews, CI. | `implement` or `implement-spec` |
| `implement` | Ticket fetched and its title stated when a reference was passed. `tdd` at agreed seams. Typecheck and single test files run along the way, the full suite once at the end. Matt `code-review` reported. Work committed on the current branch. | `codebase-design` / `improve-codebase-architecture` if seams are the leftover friction, otherwise production |
| `implement-spec` | Every ticket built by an implementer subagent with `tdd` and merged into the integration branch. One Matt `code-review` over that branch, its findings fixed. Draft PR marked ready if one exists, otherwise tickets resolved the way the tracker closes work. Implementer worktrees cleaned up. | Same as `implement` |
| `codebase-design` | Reference, not a session. Done when the design uses *module*, *interface*, *depth*, *seam*, *adapter*, *leverage*, *locality* without drifting to component / service / API / boundary. | `improve-codebase-architecture` when scanning for deepening, otherwise production |
| `improve-codebase-architecture` | HTML report opened, user picked a candidate, that candidate grilled. | Production |

`tdd` and Matt `code-review` also run as their own phase when the user names them, or when `implement` / `implement-spec` calls them.

### Production

Addy. One skill at a time, in this order. A phase is done when that skill's own process is complete.

1. `security-and-hardening`
2. `observability-and-instrumentation`
3. `ci-cd-and-automation`
4. `code-review-and-quality` (five-axis review reported)
5. `deprecation-and-migration` if old code is leaving, or a production database schema changes (rename or drop a column: expand/contract)
6. `shipping-and-launch` (pre-launch checklist, monitoring, rollout, and rollback in place)

After 6, close.

### Close

Matt. Improve the environment for the next run, not the code.

| Phase | Done when | Next |
| --- | --- | --- |
| `retro` | Run in the session it looks back on (after a clear, point it at that session's log). Candidates presented most severe first. Mechanical mistakes proposed as checks, judgement calls as coding standards. | The map ends |

Also run `retro` after `diagnosing-bugs` lands a fix, to ask what would have prevented the bug.

## Overlaps

Two skills can cover the same English word. The detector picks.

**Review.** After `implement` or `implement-spec`, use `code-review` (Matt: Standards and Spec). Before merge or ship, use `code-review-and-quality` (Addy: five axes). Sequential, not interchangeable.

**Debug.** User reports a hard bug, slowness, or something broken. Use `diagnosing-bugs` (Matt: build a red loop first). After the fix, `tdd` for the regression test, then `retro`. Do not use Addy debugging skills.

**Grill.** Entry is `grill-with-docs`. Use `grill-me` only when grilling without writing docs. `grilling` is the engine those two load, never the entry. Do not use Addy `interview-me`.

**Spec / tickets.** `to-spec` then `to-tickets`. Do not use Addy spec/plan skills.

**Tests.** Always Matt `tdd`. Never Addy `test-driven-development`.

**Implementation.** `implement` per ticket, `implement-spec` for a whole spec in one run. Do not use Addy `incremental-implementation`.

**Quality bar.** `CONSTRAINTS.md` (Addy `constraint-driven-development`) holds the numbers. Matt `code-review` and Addy `code-review-and-quality` enforce it. Matt `retro` proposes new checks and standards after the work.

## Overlays

These fire in addition to the phase, not instead of it.

- Any prose: `unslop`
- Auth, untrusted input, secrets, or third parties, already during Build: `security-and-hardening`
- Measured perf, Core Web Vitals, or N+1: `performance-optimization`
- An agent silences a check, skips or deletes a test, strips assertions, or lowers a threshold to get to green: `constraint-driven-development` (guard the bar)
- Writing a pull request body: `pr`
- Any number in a final report: re-measure it at report time, or label it unverified

## Side paths

Outside the idea-to-ship map. Still indexed.

- Effort too big for one grill-to-spec session: `wayfinder`
- Issue queue hygiene: `triage`
- Compact this session for the next agent: `handoff`
- Steps only a human can perform (credentials, third-party dashboards): `wizard`
- Editing skills, `AGENTS.md`, or `CLAUDE.md`: `writing-for-agents` then `unslop`
- Changing skill setup: `setup-matt-pocock-skills`
- Cited research: `research`
