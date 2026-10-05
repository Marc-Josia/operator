# Operator

This repo uses **Operator** as the only skill router. Invoke `/operator`. Matt Pocock skills own Understand → Build. Addy Osmani skills own the Production overlay. pstack `unslop` is a writing pass. Do not use `ask-matt`, `using-agent-skills`, or `poteto-mode`.

A **phase** is one skill's work, not a turn limit. `/operator` chooses a path proportional to uncertainty, scope, and risk, and continues within the user's authorized scope. Stop when the requested outcome is verified, a material decision or permission is missing, or a selected skill requires user input. Read selected skills and follow their requirements, subject to the user's instructions.

Feature implementation uses the persistent loop after the user approves spec and tickets and authorizes implementation. Read the operator skill's `references/execution.md` to start or resume it. Findings return to implementation. Completion requires ticket evidence and controller-run checks plus sequential reviews on the same current snapshot. Blocked, stalled, stale, and budget-exhausted runs remain incomplete.

## Detector

First applicable path for pending work: named skill → clear, localized, low-risk correction (inspect, fix directly, focused verification and diff review) → unclear bug (`diagnosing-bugs`) → unresolved requirements (`grill-with-docs`, or `grill-me` without a repo) → UI/state shape still open (`prototype`) → feature or consequential correction needing a spec (`to-spec`) or decomposition (`to-tickets`) → ready to code (`implement`: `tdd` at agreed seams, then Matt `code-review`) → unresolved seam friction (`codebase-design` / `improve-codebase-architecture`) → verified implementation with delivery requested (overlay below). Reassess remaining work after each step; rerun completed skills only if new evidence or edits invalidate their outcomes. A request only for a skill recommendation ends with the recommendation.

Simple corrections do not require specs, tickets, an implementation ledger, or formal reviews. Escalate if the cause, scope, or risk changes; small auth, data, contract, or migration changes are not automatically low-risk. Reuse adequate specs; before the persistent feature loop, keep approved tickets and dependencies, including for a single-ticket feature. Do not add production work to a request that ends at a verified change.

## Production overlay

Select relevant checks, explain omissions briefly, and reuse current evidence for unchanged areas. Run selected skills in this order: `security-and-hardening` (security exposure changes) → `observability-and-instrumentation` (runtime signals needed) → `ci-cd-and-automation` (delivery automation changes or gaps) → `code-review-and-quality` (broader production review warranted or required) → `deprecation-and-migration` (contract, data, or compatibility transitions) → `shipping-and-launch` (deployment or launch needs rollout planning). Repository-required checks still apply. Ordinary merges do not automatically need the launch workflow; continue through checks and authorized delivery without artificial stops.

The persistent loop assesses all production stages in order and records inapplicable concerns. Shipping reviews readiness; external delivery follows separate authorization. Preserve skill processes and permissions, reuse approved decisions, and stop for unresolved human decisions. Report progress without routine relaunch requests.

## Arbitration

- Testing skill: Matt `tdd`. Never Addy `test-driven-development`. Direct corrections use focused checks; features and consequential corrections use `implement`, which drives `tdd`.
- Reviews: `implement` includes Matt `code-review` (Standards + Spec). Add Addy `code-review-and-quality` (five-axis) when production risk or an explicit requirement warrants it. When both apply, Matt precedes Addy, after applicable CI checks. Direct corrections use focused diff review.
- Bugs: known, localized, low-risk cause → direct correction; unclear or difficult cause → `diagnosing-bugs`.
- Changed auth, input handling, secrets, sensitive data, or external integrations already during Build: `security-and-hardening` as an overlay.
- First use: `/setup-matt-pocock-skills` once per repo.

Overlays on top of the phase: `unslop`, `performance-optimization`. Side paths: `wayfinder`, `triage`, `handoff`, `wizard`, `research`, `writing-for-agents`.

Docs agents will read: `writing-for-agents`. Any prose that still reads like a chatbot: `unslop`.

Checklists: `references/` at the project root (resolves `../../references/` from installed skills).

## Code

YAGNI. A small change, or one that is strictly necessary. Edge cases off the main path stay out.

TypeScript: strict. No `any` without justification. No `@ts-ignore`. If unavoidable, `@ts-expect-error` with a comment.

Tests target live behavior. No blanket smoke. No tests for a feature that was removed.

Comments sit above a function, class, or module and say how to use it. Keep them aligned with the code.

Tokens: color and radius come from theme tokens.

## Files

New files go under `src`, `tests`, `docs`, `config`, `tools`, `examples`, `prototype`, or `temp`. Root only when tooling requires it.

## Docs

Present tense. Current state, not history or the plan.

`docs/architecture.md` is the system view. Update it when structure changes.

A major feature that exists has a file in `docs/features/`.

In-flight specs and tickets live in `docs/changes/<change-id>/` or the configured tracker. Preserve approved spec/tickets, dependencies, and criterion evidence in `temp/operator/<run-id>/`. Once implemented: write `docs/features/`, update architecture if structure changed. Keep files referenced by an active execution contract intact. A completed change folder may be removed once its spec and ticket trace remain in feature docs or the tracker and the approved execution record.
