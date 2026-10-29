# Operator

This repo uses **Operator** as the only skill router. Invoke `/operator`. Matt Pocock skills own Understand → Build and Close (`retro`). Addy Osmani skills own the quality bar (`constraint-driven-development`) and the Production overlay. pstack skills are overlays: `unslop` for prose, plus verification and repeated-mistake fixes. Do not use `ask-matt`, `using-agent-skills`, or `poteto-mode`.

A **phase** is one skill's work. `/operator` runs the detector and chains phases, stopping only at three gates: shared understanding confirmed, ticket breakdown approved, merge. Ceremony scales with the work: jumping from a loose idea to `implement` is one failure, running a one-sentence fix through spec and tickets is the other.

## Detector

First true branch (size unclear: take the larger): named skill → small change, diff fits one sentence (make it, run the checks, commit) → medium change, clear scope, one session (short plan in chat, then `implement`) → loose idea (`grill-with-docs`, or `grill-me` if there is no repo) → shared understanding, no spec (`to-spec`) → spec, no tickets (`to-tickets`) → UI/state shape still open (`prototype`, then detector again) → new project or significant feature with no `CONSTRAINTS.md` (`constraint-driven-development`, then detector again) → ready to code (`implement` per ticket, `implement-spec` for a whole spec: `tdd` at agreed seams, then Matt `code-review`) → seam friction (`codebase-design` / `improve-codebase-architecture`) → headed to merge or ship (overlay below) → medium or larger change shipped, or a hard bug fixed (`retro`).

## Production overlay

Only the phases whose trigger holds, in this order: `security-and-hardening` (auth, input, secrets, third parties) → `observability-and-instrumentation` (no baseline yet, or a new service, endpoint, job, or external call) → `ci-cd-and-automation` (no CI running the checks yet, or the pipeline changes) → `code-review-and-quality` (high-risk merge) → `deprecation-and-migration` (old code leaving or a production schema change) → `shipping-and-launch` (the change reaches users). None holds: merge gate.

## Arbitration

- Tests: always Matt `tdd`. Never Addy `test-driven-development` or pstack `tdd`. Build entry is `implement` or `implement-spec`, which drive `tdd`.
- One review per change: Matt `code-review` (Standards + Spec) after `implement` / `implement-spec`. Addy `code-review-and-quality` (five-axis) only on a high-risk merge, after CI. A small change: its checks are the gate.
- A mistake the agent repeats becomes a check (lint rule, test, hook), not another `AGENTS.md` line. `retro` proposes it, `correct` lands it.
- Bugs: `diagnosing-bugs`, fixed at the root cause (`principle-fix-root-causes`).
- Before declaring a task done: `principle-prove-it-works` (the real artifact, not a proxy).
- Auth, input, secrets already during Build: `security-and-hardening` as an overlay, not instead of the phase.
- First use: `/setup-matt-pocock-skills` once per repo.
- Domain glossary: `GLOSSARY.md` / `GLOSSARY-MAP.md`. An old `CONTEXT.md` / `CONTEXT-MAP.md` gets `git mv`'d to the new name; Matt skills no longer read it.
- TokenEconomizer (optional cost plugin, lines start with `TokenEconomizer:`): a loop-guard redirect means change approach (unknown cause: `diagnosing-bugs`), never weaken the bar; an injected fact true for the whole project goes under `## Commands` here; a phase blocked by a pruned tool: tell the user `toolprune restore`, do not work around it.

Overlays on top of the phase: `unslop`, `performance-optimization`, `benchmark-checklist` (any perf number you measured), `blast-radius` (a diff you do not trust, or a high-risk merge), `create-verification-skill` (user-facing change, no verification project skill yet), `constraint-driven-development` (an agent weakening the bar), `pr` (PR bodies). Side paths: `wayfinder`, `triage`, `handoff`, `wizard`, `research`, `writing-for-agents`, `maintain-verification-skill`.

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

## Keeping AGENTS.md current

Text between the `operator:start` / `operator:end` markers belongs to Operator and `operator update` rewrites it. Everything after the end marker belongs to this project: write there, never inside the markers.

Keep the project part current as you work, so the next session starts with what this one learned.

- Write when you learn something a later session needs: an architecture decision or code convention, a useful command (build, test, lint, run), a pitfall and how to avoid it, a preference or correction from the user.
- Keep entries short, concrete, and easy to verify. Skip what the code or git history already shows.
- Edit the matching section (`## Project context`, `## Commands`, `## Conventions`, `## Interface design`, `## Known pitfalls`, `## Project skills`), or add one. Replace what turned stale or wrong instead of adding next to it. Delete what no longer helps.
- A pitfall a check can catch becomes a check (see Arbitration). Only the rest goes under `## Known pitfalls`.
- Tell the user in one line each time you change `AGENTS.md`.

## Creating project skills

You may create a project skill without asking when a multi-step task comes back (or clearly will), when a procedure is precise or risky enough that a missed step is expensive (deploy, migration, release, repetitive code generation), when the user corrects how you do the same task more than once, or when specialized knowledge should load only when needed instead of weighing on `AGENTS.md`. Not for a one-off task or a one-line rule: the rule goes in `AGENTS.md`.

- Where: the skills folder where Operator installed `operator` for your agent (`.claude/skills/<name>/SKILL.md` for Claude Code). Frontmatter `name` and a `description` that says when to trigger it. Scripts and reference files go in the same folder. Write it with `writing-for-agents`.
- A project skill is a procedure, never a second router.
- It runs end to end without the user: every step explicit, with exact commands and success criteria; the scripts it needs ship in its folder; no manual step; it says how to verify the result and what to do on failure.
- After creating it, run it once and fix what broke. If full autonomy needs more permissions (shell commands, tools), propose adding them to the agent's permission config (`.claude/settings.json` for Claude Code).
- List each one under `## Project skills`. Improve a skill as soon as a run shows a gap.
