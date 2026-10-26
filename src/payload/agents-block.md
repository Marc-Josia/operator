# Operator

This repo uses **Operator** as the only skill router. Invoke `/operator`. Matt Pocock skills own Understand → Build and Close (`retro`). Addy Osmani skills own the quality bar (`constraint-driven-development`) and the Production overlay. pstack `unslop` is a writing pass. Do not use `ask-matt`, `using-agent-skills`, or `poteto-mode`.

A **phase** is one skill's work. `/operator` runs the detector and chains phases, stopping only at three gates: shared understanding confirmed, ticket breakdown approved, merge. Ceremony scales with the work: jumping from a loose idea to `implement` is one failure, running a one-sentence fix through spec and tickets is the other.

## Detector

First true branch (size unclear: take the larger): named skill → small change, diff fits one sentence (make it, run the checks, commit) → medium change, clear scope, one session (short plan in chat, then `implement`) → loose idea (`grill-with-docs`, or `grill-me` if there is no repo) → shared understanding, no spec (`to-spec`) → spec, no tickets (`to-tickets`) → UI/state shape still open (`prototype`, then detector again) → new project or significant feature with no `CONSTRAINTS.md` (`constraint-driven-development`, then detector again) → ready to code (`implement` per ticket, `implement-spec` for a whole spec: `tdd` at agreed seams, then Matt `code-review`) → seam friction (`codebase-design` / `improve-codebase-architecture`) → headed to merge or ship (overlay below) → medium or larger change shipped, or a hard bug fixed (`retro`).

## Production overlay

Only the phases whose trigger holds, in this order: `security-and-hardening` (auth, input, secrets, third parties) → `observability-and-instrumentation` (no baseline yet, or a new service, endpoint, job, or external call) → `ci-cd-and-automation` (no CI running the checks yet, or the pipeline changes) → `code-review-and-quality` (high-risk merge) → `deprecation-and-migration` (old code leaving or a production schema change) → `shipping-and-launch` (the change reaches users). None holds: merge gate.

## Arbitration

- Tests: always Matt `tdd`. Never Addy `test-driven-development`. Build entry is `implement` or `implement-spec`, which drive `tdd`.
- One review per change: Matt `code-review` (Standards + Spec) after `implement` / `implement-spec`. Addy `code-review-and-quality` (five-axis) only on a high-risk merge, after CI. A small change: its checks are the gate.
- A mistake the agent repeats becomes a check (lint rule, test, hook), not another `AGENTS.md` line. `retro` proposes it.
- Bugs: `diagnosing-bugs`.
- Auth, input, secrets already during Build: `security-and-hardening` as an overlay, not instead of the phase.
- First use: `/setup-matt-pocock-skills` once per repo.
- Domain glossary: `GLOSSARY.md` / `GLOSSARY-MAP.md`. An old `CONTEXT.md` / `CONTEXT-MAP.md` gets `git mv`'d to the new name; Matt skills no longer read it.

Overlays on top of the phase: `unslop`, `performance-optimization`, `constraint-driven-development` (an agent weakening the bar), `pr` (PR bodies). Side paths: `wayfinder`, `triage`, `handoff`, `wizard`, `research`, `writing-for-agents`.

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
