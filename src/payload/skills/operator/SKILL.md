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

A **phase** is one skill's work, not a turn limit. Choose a path proportional to the request's uncertainty, scope, and risk. Continue through applicable phases within the user's authorized scope. Stop when the requested outcome is verified, a material decision or permission is missing, or a selected skill requires user input. Do not wait merely because a phase ended.

Read every selected skill's `SKILL.md` and follow its requirements. The user's instructions take precedence; otherwise a selected skill's requirements take precedence over this map. Select skills only when their full workflow is warranted. The direct correction path below does not invoke `implement` or waive its requirements. The persistent feature loop requires an approved spec and tickets, even for an already understood feature. Reuse decisions recorded there; an unresolved human decision remains a blocker.

When the user runs `/operator`, run the detector. If the request is only to recommend a skill, explain the choice and stop there. Otherwise briefly state the chosen path and why, then execute it; reassess if new evidence changes scope or risk. Clarify loose ideas before building, but do not manufacture specs or tickets for an already clear correction.

When implementation is authorized with an approved spec and tickets, read [references/execution.md](references/execution.md) and start or resume the persistent controller. It runs implementation, fixed checks, Matt review, and sequential production verification without routine relaunches. Findings return to implementation and invalidate earlier verification. Completion requires criterion evidence and successful checks/reviews on the same current repository snapshot. Blocked, stalled, stale, and budget-exhausted runs remain incomplete. The controller implements this router's transitions, not a second lifecycle.

Checklists live in `references/` at the project root (Addy). Skills that say `../../references/…` resolve there.

If setup has not been run in this repo, say so and put `setup-matt-pocock-skills` in front.

## Detector

Take the first true branch for pending work only. After completing it, reassess remaining work against the user's requested outcome. Do not rerun a completed skill unless new evidence or edits invalidate its outcome.

1. The user named a skill (other than `operator`). Follow it without automatically expanding the request to the rest of the pipeline. For feature implementation, require the approved spec/tickets and implementation authorization before entering the loop in branch 7. Prepare missing spec/tickets using branch 6.
2. A localized, low-risk correction has clear expected behavior and a known cause. Use the direct correction path below. Small diffs involving auth, sensitive data, public contracts, or migrations are not low-risk merely because they are small.
3. A bug's cause is unclear, behavior is intermittent, or performance needs diagnosis. Use `diagnosing-bugs` before selecting the build path.
4. A feature, consequential correction, or design has unresolved requirements. Use `grill-with-docs` (it loads `grilling` and `domain-modeling`), or `grill-me` without a repo. Shared understanding for complex work leads to `to-spec`; reuse an adequate existing spec.
5. UI or state shape is still the open question. Use `prototype`, then return to this detector.
6. An understood feature or consequential correction needs a spec. Use `to-spec`. Before a persistent implementation loop, use `to-tickets` and obtain approval of the ticket graph, even when the task fits one ticket. A standalone spec request can end at the spec.
7. A feature or consequential correction has an approved spec and tickets ready to code, and implementation is authorized. Start the persistent loop with `implement`. It uses `tdd` at agreed seams (never Addy `test-driven-development`), then Matt `code-review` and the production verification below. Correct findings and repeat checks/reviews until current completion or a specific incomplete state.
8. Remaining module or seam friction warrants design work. Consult `codebase-design`; use `improve-codebase-architecture` for a requested deepening scan.
9. Implementation is verified and delivery (merge, deploy, ship) is requested. Select the relevant production checks below and run them in order.

If the requested outcome is complete, report the change and verification. Do not add phases solely because no spec or tickets exist, or because production could be a future destination.

## Lanes

### Direct correction

Inspect the affected code and expected behavior, make the smallest sufficient change, and verify it with a focused regression check or the relevant existing checks. For a behavior bug, reproduce it before the fix where practical and confirm the check passes afterward. For prose or configuration corrections, validate the affected artifact rather than inventing a test suite.

Review the diff for unintended changes and report the result and verification limits. This path does not require a spec, tickets, an implementation ledger, or two formal reviews. If investigation reveals an unclear cause, wider scope, or consequential risk, return to the detector and select the needed diagnosis, specification, or hardening work. Delivery still uses the production selection below when requested.

### Understand

Matt. Resolve uncertainty and specify complex work. Keep spec and approved tickets as the preparation and trace for the persistent implementation loop.

| Phase | Done when | Next |
| --- | --- | --- |
| `grill-with-docs` | Grilling frontier is empty and the user confirmed shared understanding. Domain terms that actually resolved are written down. | `to-spec` |
| `to-spec` | Spec exists and is ready for an agent. Seams confirmed with the user. | `prototype` if shape is unresolved, otherwise `to-tickets` before persistent implementation |
| `to-tickets` | User approved the breakdown. Tickets exist with blocking edges and are ready for an agent. | `prototype` if shape is still in question, otherwise `implement` |

Human entry for a new idea is `/operator` or `/grill-with-docs`. `grilling` is the engine those two load, never the entry.

Work too big for one grill-to-spec session is not this lane. Use `wayfinder`.

### Build

Matt. Entry is `implement` for features and consequential corrections ready to code; simple corrections use the direct path. `tdd` is not a mandatory standalone stage.

| Phase | Done when | Next |
| --- | --- | --- |
| `prototype` | Throwaway artifact exists and the user has reacted to the design question. Nothing from it is kept except decisions that feed the spec or tickets. | Detector, usually `implement` |
| `implement` | Every approved ticket criterion has evidence in the run. `tdd` at agreed seams. Required commands execute in the controller. Matt `code-review` follows; findings return to implementation. Follow the upstream commit step. | Production verification automatically within the persistent loop |
| `codebase-design` | Reference, not a session. Done when the design uses *module*, *interface*, *depth*, *seam*, *adapter*, *leverage*, *locality* without drifting to component / service / API / boundary. | `improve-codebase-architecture` when scanning for deepening; otherwise finish the requested work |
| `improve-codebase-architecture` | HTML report opened, user picked a candidate, that candidate grilled. | Finish the requested work; production only if delivery is requested |

`tdd` and Matt `code-review` also run as their own phase when the user names them, or when `implement` calls them.

### Production

The user-authorized persistent loop assesses every production stage in the order below, records inapplicable concerns, and returns required edits to implementation. Shipping in this loop is readiness review. Merge, push, publish, and deployment follow their separate authorization. Preserve upstream processes and permissions; use decisions already settled by approved spec/tickets. New human decisions remain blockers. Report progress without asking the user to relaunch each phase.

Outside the persistent loop, Addy checks are selected from the actual delivery risk and existing evidence. State which checks apply and briefly explain any omitted checks. Reuse current evidence for unchanged areas; rerun checks affected by new edits or failures. Repository-required checks still apply.

Run selected skills in this order, completing each skill's own process:

1. `security-and-hardening` for changed auth, trust, input handling, secrets, sensitive data, or external integrations.
2. `observability-and-instrumentation` for changed runtime behavior that needs new signals or incident visibility.
3. `ci-cd-and-automation` for changed build, test, deployment, or release automation, or a gap in delivery checks.
4. `code-review-and-quality` when delivery needs a broader production review (for example, a substantial change, multiple systems affected, or a repository requirement). A verified low-risk correction does not automatically need a second formal review.
5. `deprecation-and-migration` for removed or changed public contracts, persisted data, or compatibility transitions.
6. `shipping-and-launch` for a deployment or launch requiring rollout, monitoring, and rollback planning. An ordinary merge uses the repository's merge checks without automatically adding a launch workflow.

Continue between selected checks without an artificial turn boundary. Complete the authorized delivery action once its prerequisites hold; request permission only where it is actually missing.

## Overlaps

Two skills can cover the same English word. The detector picks.

**Review.** `implement` includes `code-review` (Matt: Standards and Spec). Add `code-review-and-quality` (Addy: five axes) when production risk warrants it or the user or repository requires it. When both apply, Matt precedes Addy; neither replaces the other. Direct corrections receive a focused diff review without automatically invoking either formal review.

**Debug.** Use `diagnosing-bugs` (Matt: build a red loop first) for unclear or difficult bugs and unexplained slowness. A known, localized cause can use the direct correction path with focused regression verification. Do not use Addy debugging skills.

**Grill.** Entry is `grill-with-docs`. Use `grill-me` only when grilling without writing docs. `grilling` is the engine those two load, never the entry. Do not use Addy `interview-me`.

**Spec / tickets.** Use `to-spec` for features or consequential corrections needing a specification, then `to-tickets` before persistent implementation. Approved tickets retain the work graph and acceptance criteria, including for a single-ticket feature. Do not use Addy spec/plan skills.

**Tests.** When a testing skill is needed, use Matt `tdd`. Never Addy `test-driven-development`. Running focused existing checks on a direct correction does not require invoking a testing skill.

**Implementation.** Use the direct correction path for clear, low-risk fixes; `implement` for features and consequential corrections. Do not use Addy `incremental-implementation`.

## Overlays

These fire in addition to the phase, not instead of it.

- Any prose: `unslop`
- Changes to auth, untrusted input handling, secrets, sensitive data, or external integrations, already during Build: `security-and-hardening`
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
