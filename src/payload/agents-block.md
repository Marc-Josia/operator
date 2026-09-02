# Operator

This repo uses **Operator** as the only skill router. Invoke `/operator`. Matt Pocock skills own Understand → Build. Addy Osmani skills own the Production overlay. pstack `unslop` is a writing pass. Do not use `ask-matt`, `using-agent-skills`, or `poteto-mode`.

A **phase** is one skill's work. One phase per pass. `/operator` runs the detector, follows the current skill, then names the next and waits. Jumping from a loose idea to `implement` is the failure this map exists to stop.

## Detector

First true branch: named skill → loose idea (`grill-with-docs`, or `grill-me` if there is no repo) → shared understanding, no spec (`to-spec`) → spec, no tickets (`to-tickets`) → UI/state shape still open (`prototype`, then detector again) → ready to code (`implement`: `tdd` at agreed seams, then Matt `code-review`) → seam friction (`codebase-design` / `improve-codebase-architecture`) → headed to production (overlay below).

## Production overlay

One skill per pass, in this order: `security-and-hardening` → `observability-and-instrumentation` → `ci-cd-and-automation` → `code-review-and-quality` → `deprecation-and-migration` if old code is leaving → `shipping-and-launch`.

## Arbitration

- Tests: always Matt `tdd`. Never Addy `test-driven-development`. Build entry is `implement`, which drives `tdd`.
- Two reviews, in order: Matt `code-review` (Standards + Spec) after `implement`; Addy `code-review-and-quality` (five-axis) during Production, after CI.
- Bugs: `diagnosing-bugs`.
- Auth, input, secrets already during Build: `security-and-hardening` as an overlay, not instead of the phase.
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

In-flight specs live in `docs/changes/<change-id>/`. Once implemented: write `docs/features/`, update architecture if structure changed, delete the change folder. No archive.
