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

You are the **only router** in this repo. Invoke as `/operator`. Matt Pocock skills own Understand → Build. Addy Osmani skills own the Production overlay. pstack `unslop` is a writing pass, not a second lifecycle. Do not run a second lifecycle (no Addy `/spec` `/plan` `/build`, no `ask-matt`, no `using-agent-skills`, no `poteto-mode`).

A **phase** is one skill's work. One phase per pass. When that skill's completion criterion holds, name the next skill and wait. Follow a named skill even if the user invoked it: read its `SKILL.md` and run it. If this map and a `SKILL.md` disagree, the `SKILL.md` is right.

Jumping from a loose idea to `implement` is the failure this skill exists to stop.

When the user runs `/operator`, run the detector, then follow the current phase skill to the bound below.

Checklists live in `references/` at the project root (Addy). Skills that say `../../references/…` resolve there.

If setup has not been run in this repo, say so and put `setup-matt-pocock-skills` in front.

## Detector

Take the first true branch.

1. The user named a skill (other than `operator`). That is the phase. Follow it.
2. Loose idea or untested plan, and no shared understanding yet. Phase is `grill-with-docs` (it loads `grilling` and `domain-modeling`). If the working directory is not a repo, `grill-me`.
3. Shared understanding, no spec yet. Phase is `to-spec`.
4. Spec exists, no tickets. Phase is `to-tickets`.
5. UI or state shape is still the open question. Phase is `prototype`. After that, return to this detector.
6. A ticket or spec is ready to code. Phase is `implement`. It uses `tdd` at seams the user agreed (never Addy `test-driven-development`), then Matt `code-review`.
7. After that review, module or seam friction. Consult `codebase-design`. If the work is a deepening scan of the codebase, phase is `improve-codebase-architecture`.
8. The change is headed to production (merge, deploy, ship). Run the production overlay in order, still one phase per pass: `security-and-hardening`, then `observability-and-instrumentation`, then `ci-cd-and-automation`, then `code-review-and-quality`, then `deprecation-and-migration` if old code is leaving, then `shipping-and-launch`.

Detector done: the current phase skill has been followed to the bound below, and the next skill is named.

## Lanes

### Understand

Matt. Sharpen the idea until it is tickets.

| Phase | Done when | Next |
| --- | --- | --- |
| `grill-with-docs` | Grilling frontier is empty and the user confirmed shared understanding. Domain terms that actually resolved are written down. | `to-spec` |
| `to-spec` | Spec exists and is ready for an agent. Seams confirmed with the user. | `to-tickets` |
| `to-tickets` | User approved the breakdown. Tickets exist with blocking edges and are ready for an agent. | `prototype` if shape is still in question, otherwise `implement` |

Human entry for a new idea is `/operator` (detector branch 2) or `/grill-with-docs`. `grilling` is the engine those two load, never the entry.

Work too big for one grill-to-spec session is not this lane. Use `wayfinder`.

### Build

Matt. Make the change. Entry is `implement`, not a standalone `tdd` stage.

| Phase | Done when | Next |
| --- | --- | --- |
| `prototype` | Throwaway artifact exists and the user has reacted to the design question. Nothing from it is kept except decisions that feed the spec or tickets. | Detector, usually `implement` |
| `implement` | Ledger full (`temp/implement-ledger.md`: every row evidenced or abandoned). `tdd` at agreed seams. Typecheck and tests run. Matt `code-review` reported, parent having re-run ledger CHECKs. Work committed on the current branch. | `codebase-design` / `improve-codebase-architecture` if seams are the leftover friction, otherwise production |
| `codebase-design` | Reference, not a session. Done when the design uses *module*, *interface*, *depth*, *seam*, *adapter*, *leverage*, *locality* without drifting to component / service / API / boundary. | `improve-codebase-architecture` when scanning for deepening, otherwise production |
| `improve-codebase-architecture` | HTML report opened, user picked a candidate, that candidate grilled. | Production |

`tdd` and Matt `code-review` also run as their own phase when the user names them, or when `implement` calls them.

### Production

Addy. One skill at a time, in this order. A phase is done when that skill's own process is complete.

1. `security-and-hardening`
2. `observability-and-instrumentation`
3. `ci-cd-and-automation`
4. `code-review-and-quality` (five-axis review reported)
5. `deprecation-and-migration` if old code is leaving
6. `shipping-and-launch` (pre-launch checklist, monitoring, rollout, and rollback in place)

After 6, the map ends.

## Overlaps

Two skills can cover the same English word. The detector picks.

**Review.** After `implement`, use `code-review` (Matt: Standards and Spec). Before merge or ship, use `code-review-and-quality` (Addy: five axes). Sequential, not interchangeable.

**Debug.** User reports a hard bug, slowness, or something broken. Use `diagnosing-bugs` (Matt: build a red loop first). After the fix, `tdd` for the regression test. Do not use Addy debugging skills.

**Grill.** Entry is `grill-with-docs`. Use `grill-me` only when grilling without writing docs. `grilling` is the engine those two load, never the entry. Do not use Addy `interview-me`.

**Spec / tickets.** `to-spec` then `to-tickets`. Do not use Addy spec/plan skills.

**Tests.** Always Matt `tdd`. Never Addy `test-driven-development`.

**Implementation.** `implement`. Do not use Addy `incremental-implementation`.

## Overlays

These fire in addition to the phase, not instead of it.

- Any prose: `unslop`
- Auth, untrusted input, secrets, or third parties, already during Build: `security-and-hardening`
- Measured perf, Core Web Vitals, or N+1: `performance-optimization`
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
