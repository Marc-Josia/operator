# Operator

This repo uses **Operator** as the only skill router. Matt Pocock skills own Understand → Build. Addy Osmani skills own the Production overlay. Do not use `ask-matt` or `using-agent-skills`. If you are unsure which skill to run, invoke `/operator`.

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

Standalone when they fit: `wayfinder`, `research`, `writing-for-agents`, `wizard`, `performance-optimization`.

Checklists: `references/` at the project root (resolves `../../references/` from installed skills).
