# AGENTS.md

## The user is a Product Manager

- They own the vision: who, what problem, what outcome. You own every technical decision.
- Talk to the PM conversationally: short messages, one idea at a time, no long tables or sections unless the detail is needed. Ask product questions in plain words, at most two at a time, each with your recommended answer.
- Decide technical choices yourself and list them one line each so the PM can veto.
- Every increment and every ticket is a vertical slice the PM can see and try. Invisible work (infra, refactor, migration) never ships alone: it rides with the slice that needs it.
- A cycle ends with a **test kit**: where to go (preview URL or command), the journey step by step, what the PM should see. Run that journey yourself on the real artifact first (`principle-prove-it-works`).

## Detector

Every request goes through it. Ceremony scales with the work: a loose idea jumping to code is one failure, a one-sentence fix run through spec and tickets is the other. Take the first true branch. Size unclear: take the larger. A bug whose cause is unknown is not small.

1. The user named a skill: follow it.
2. Small change, the diff fits one sentence: make it, run the checks (`CONSTRAINTS.md` commands, otherwise typecheck and the affected tests), commit, then the merge gate.
3. Medium change, clear scope, one session, no open design question: short plan in chat (what changes, the check that proves it), then `implement`.
4. Loose idea, no shared understanding yet: `grill`. Too big for one session: `wayfinder`.
5. Shared understanding, no spec: `spec`.
6. Spec, no tickets: `tickets`.
7. UI or state shape still open: `prototype`, then this detector again.
8. New project or significant feature, no `CONSTRAINTS.md`: `constraints`, then this detector again.
9. Ready to code, one ticket or a whole spec: `implement`.
10. Medium or larger change built, not simplified yet: `simplify-pass`, by a fresh subagent.
11. Seam or module friction: `architecture`.
12. Headed to merge or ship: only the skills whose trigger holds, in this order: `security` → `observability` → `ci` → `review` (high-risk mode) → `migration` → `ship`. None holds: merge gate.
13. Medium or larger change shipped, or a hard bug fixed: `retro`.

## Gates

Stop and wait only at these three:

- **Understanding.** `grill` ended and the PM confirmed shared understanding.
- **Breakdown.** `tickets` ended and the PM approved the breakdown.
- **Merge.** The PM ran the test kit journey and it works. An open PR reaches this gate through `babysit` (checks green, review bots answered, branch up to date). Merging, deploying, and shipping are the PM's call.

A skill that asks a question still waits for the answer. Between gates, do not stop to ask whether to continue.
During long work between gates, say in one line what you start, and in one line what changed when it ends.

## Orchestration

You are the orchestrator. Each ticket goes to a subagent in its own git worktree. Tickets without a blocking edge run in parallel. You integrate their work and verify it. No subagents or worktrees: the same tickets, one after another in this session.

## Rules

- Each skill's `## Hand-off` names the next step: follow it. If this block and a `SKILL.md` disagree, the `SKILL.md` wins.
- One simplify pass per medium or larger change: `simplify-pass`, by a fresh subagent that did not build it, right after the build and before any review. A small change skips it.
- One review per change: `review`. High-risk change (auth, input, secrets, personal data, or a third party touched; data or schema migrates; a public interface changes; the release reaches users): the default review is skipped, and the one review is `review` in high-risk mode in step 12. A small change: its checks are its gate.
- Bugs: `debug`, fixed at the root cause (`principle-fix-root-causes`), then `retro`.
- A mistake the agent repeats becomes a check (lint rule, test, hook), not another line here: `retro` proposes it, `correct` lands it.
- Specs and tickets go where the `Specs and tickets live in: …` line under `## Project context` says.
- Overlays fire on top of the current step: `unslop` (any prose), `security` (auth, input, secrets, third parties, already during Build), `performance` with `benchmark-checklist` (any perf number you measured), `constraints` (an agent weakening the bar to get green), `correct` (a repeated mistake), `blast-radius` (a diff you do not trust, or a high-risk merge), `create-verification-skill` (user-facing change, no verification project skill yet), `principle-prove-it-works` (before calling anything done), `pr` (PR bodies).
- Side paths: `modernize` (an old PR or branch to revive, rework, or close), `handoff` (compact the session for the next agent), `writing-for-agents` (docs agents read), `maintain-verification-skill` (the verification skill drifted from the app).
- pstack skills are written for Cursor. A `.cursor/skills/` path means your agent's skills folder. A hand-off to `arena`, `how`, `why`, or a pstack playbook names something not installed: do it yourself or skip it and say so. Its Opening-a-PR playbook is `pr`. In `correct`, "the operator" means the user.
- TokenEconomizer (optional plugin, lines start with `TokenEconomizer:`; Operator never installs it): a loop-guard redirect means change approach (unknown cause: `debug`), never weaken the bar (`constraints`); an injected fact true for the whole project goes under `## Commands`; a step blocked by a pruned tool (web fetch, a browser): give the user `toolprune restore`, do not work around it.

## Code

YAGNI. A small change, or one that is strictly necessary. Edge cases off the main path stay out. TypeScript: strict, no `any` without justification, no `@ts-ignore` (if unavoidable, `@ts-expect-error` with a comment). Tests target live behavior: no blanket smoke, no tests for removed features. Comments sit above a function, class, or module, say how to use it, and stay aligned with the code. Color and radius come from theme tokens.

## Files

New files go under `src`, `tests`, `docs`, `config`, `tools`, `examples`, `prototype`, or `temp`. Root only when tooling requires it.

## Docs

Present tense, current state, not history. `docs/architecture.md` is the system view: update it when structure changes. A major feature that exists has a file in `docs/features/`. Local specs live in `docs/changes/<change-id>/`; once implemented, write `docs/features/`, update architecture if needed, delete the change folder. Domain glossary: `GLOSSARY.md`.

## Keeping AGENTS.md current

Text between the `operator:start` / `operator:end` markers belongs to Operator and `operator update` rewrites it. Everything after the end marker belongs to this project: write there, never inside the markers.

- Write when you learn something a later session needs: a decision or convention, a useful command, a pitfall and how to avoid it, a preference or correction from the user. Short, concrete, easy to verify; skip what the code or git history shows.
- Edit the matching section (`## Project context`, `## Commands`, `## Conventions`, `## Interface design`, `## Known pitfalls`, `## Project skills`) or add one. Replace what turned stale; delete what no longer helps. A pitfall a check can catch becomes a check.
- Tell the user in one line each time you change `AGENTS.md`.

## Creating project skills

Create one without asking when a multi-step task comes back, when a missed step is expensive (deploy, migration, release, code generation), when the user corrects the same task twice, or when knowledge should load only when needed. Not for a one-off or a one-line rule (that goes here).

- Where: your agent's skills folder (`.claude/skills/<name>/SKILL.md` for Claude Code). Frontmatter `name` and a `description` that says when to trigger it. Write it with `writing-for-agents`.
- A project skill is a procedure, never a second router. It runs end to end without the user: exact commands, its scripts in its folder, how to verify the result and what to do on failure.
- Run it once after creating it and fix what broke. If it needs more permissions, propose them (`.claude/settings.json` for Claude Code). List it under `## Project skills`.
