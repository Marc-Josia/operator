# Operator

This repo uses **Operator** as the only skill router. Matt Pocock skills own Understand → Build. Addy Osmani skills own the Production overlay. pstack `unslop` is a writing pass. Do not use `ask-matt`, `using-agent-skills`, or `poteto-mode`. If you are unsure which skill to run, invoke `/operator`.

## Pipeline

`grill-with-docs` → `domain-modeling` → `to-spec` → `to-tickets` → (`prototype` throwaway?) → `tdd` → `implement` → `code-review` → `codebase-design` → `improve-codebase-architecture` → `security-and-hardening` → `code-review-and-quality` → `deprecation-and-migration` → `observability-and-instrumentation` → `ci-cd-and-automation` → `shipping-and-launch`

On-ramps are allowed. Skip stages that are already done.

## Arbitration

- Tests: always Matt `tdd`. Never Addy `test-driven-development`.
- Two reviews, in order: Matt `code-review` (Standards + Spec) during Build; Addy `code-review-and-quality` (five-axis) during Production, after security.
- Bugs: `diagnosing-bugs`.
- Vague idea: `grill-with-docs` (or `grill-me` if there is no repo).
- Small specified fix: `tdd` + `implement`. Skip the production overlay unless the change is production-facing.
- First use: `/setup-matt-pocock-skills` once per repo.

Standalone when they fit: `wayfinder`, `research`, `writing-for-agents`, `unslop`, `wizard`, `performance-optimization`.

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
