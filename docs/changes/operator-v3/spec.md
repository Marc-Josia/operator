# Operator v3 — spec

## Why

Current frontier models (Opus 5.5, Fable) out-skill most engineers on *how* to build. Skills that teach procedure are noise. What a model cannot infer: the user's intent, verifiable finish lines, the hard "never" rules, and where a human must decide. Operator v3 ships its own skills written that way, keeps the process Operator already defined, and speaks to a Product Manager.

## Who it serves

A Product Manager. They own the vision (who, what problem, what outcome). The agent owns every technical decision and states it in one line so the PM can veto. Everything is PM mode; there is no engineer setting.

## What changes

1. **Sources.** Matt Pocock and Addy Osmani packs leave the catalog. pstack stays as the only upstream source, unchanged (`unslop`, `correct`, `blast-radius`, `benchmark-checklist`, `create-verification-skill`, `maintain-verification-skill`, `principle-prove-it-works`, `principle-fix-root-causes`).
2. **Own skills**, shipped in `src/payload/skills/<name>/SKILL.md`, installed from the local payload (`npx skills add <payload dir>`):

   | Lane | Skills | Replaces |
   | --- | --- | --- |
   | Understand | `grill`, `spec`, `tickets`, `prototype`, `wayfinder` | grill-with-docs, grill-me, grilling, domain-modeling, to-spec, to-tickets, prototype, wayfinder |
   | Build | `constraints`, `implement`, `review`, `architecture`, `debug` | constraint-driven-development, implement, implement-spec, tdd, code-review, codebase-design, improve-codebase-architecture, diagnosing-bugs |
   | Production | `security`, `observability`, `ci`, `migration`, `ship`, `performance` | security-and-hardening, observability-and-instrumentation, ci-cd-and-automation, deprecation-and-migration, shipping-and-launch, performance-optimization |
   | Close | `retro` | retro |
   | Utilities | `pr`, `handoff`, `writing-for-agents` | same names |

   Dropped without replacement: `setup-matt-pocock-skills` (its tracker question moves into `operator init`, see §7), `triage`, `wizard`, `research`, `grill-me` (merged into `grill`), `code-review-and-quality` (becomes `review` high-risk mode), `tdd` (a done-when criterion of `implement`).
3. **Skill format: mission, not procedure.** Every own skill has exactly these sections, in order: `## Mission`, `## Done when` (verifiable criteria), `## Never`, `## Stop and ask` (the only points where the user decides). `## Hand-off` (next skill, required: it carries the lane order). Target under 60 lines. No step-by-step "how". The template lives in `src/payload/SKILL-TEMPLATE.md` (not installed).
4. **Process kept, always on.** Detector, three gates (understanding, breakdown, merge), lanes Understand → Build → Production (triggered by risk) → Close, ceremony scaled by size, one review per change, overlays. Only skill names change.
   - **No `/operator` command.** The `operator` skill is removed. Once installed, the process is how the agent works on every request, without being invoked.
   - The AGENTS.md block becomes the router: detector, gates, PM rules, orchestration, overlays, pstack substitutions. Target under 100 lines, since it loads every session.
   - The lane tables move into the skills: each own skill's `## Hand-off` names the next skill, so the chain holds without a central map.
   - Claude Code does not read `AGENTS.md` by itself: when `claude-code` is a target agent, `init`/`update` make sure the project `CLAUDE.md` contains an `@AGENTS.md` import line (create `CLAUDE.md` if missing, never duplicate the line, `remove` deletes only that line and only if Operator added it).
5. **PM rules (router + every Understand skill).**
   - Questions are product questions in plain language, one or two at a time, each with a recommended answer.
   - Technical choices: the agent decides, lists them one line each, the PM may veto.
   - Every increment and every ticket is a vertical slice with value the PM can see and try. Invisible work (infra, refactor, migration) never ships alone; it rides with the slice that needs it.
   - A cycle ends with a **test kit**: where to go (preview URL or command), the journey step by step, what the PM should see. The agent runs that journey on the real artifact first (`principle-prove-it-works`). The merge gate is the PM testing the journey, not reading a diff.
6. **Orchestration rule (router + agents-block).** The main agent orchestrates: each ticket goes to a subagent in its own git worktree; the main agent integrates and verifies. `tickets` cuts work so tickets run in parallel; a blocking edge only when one ticket truly needs another's output. Fallback when the agent has no subagents or worktrees: same tickets, one after another in one session.
7. **CLI.**
   - `init`: installs pstack via `npx skills@latest add`, own skills from the payload, writes the AGENTS.md block. No `references/`. Next-steps text: describe the idea to the agent in plain words, nothing to invoke.
   - `init` asks where specs and tickets live: local markdown (`docs/changes/<id>/`), GitHub issues, Linear, or other (free text). TTY: a prompt. Non-TTY: `--tracker local|github|linear|<text>`, default `local` with `-y`. Saved in `.operator/state.json` and written as one line under `## Project context` in the project part of `AGENTS.md` (`Specs and tickets live in: …`). `update` keeps the saved choice; `init` again or `--tracker` changes it. `spec` and `tickets` read that line; when the platform tool is missing (no `gh`, no Linear MCP), they say so and fall back to local markdown.
   - `update`: `npx skills update` only for pstack names (own skills come from the payload; `skills update` would re-pull a same-named Matt skill from its locked source). Removes legacy Matt/Addy skills and the v2 `operator` skill still installed whose names are not own skills. Re-adds own skills from the payload (overwrites same-named Matt copies). Purges the old managed `references/` (only files listed in its manifest). Replaces the AGENTS.md block.
   - `remove`: own skills + pstack, no `--copy`.
   - `status`: own + pstack; reports leftover legacy skills (including the v2 `operator` skill) and whether `CLAUDE.md` imports `AGENTS.md` for Claude Code; references no longer count toward `ok`.
   - Saved agents move from `references/.operator-managed.json` to `.operator/state.json` at the project root (`~/.operator/state.json` with `-g`). `update`/`remove` read the old location once when the new one is missing.
   - Version `3.0.0`.

## Out of scope

Engineer mode. Changing pstack skills. New agents in the picker. TokenEconomizer behavior (keep the section, rename skill references: `diagnosing-bugs` → `debug`, `constraint-driven-development` → `constraints`, `research` → web fetch in general).

## Done when

- `npm test` passes.
- Catalog, payload folders, and agents-block name the same skill set; a test enforces it.
- Every own skill passes the template test (frontmatter `name` = folder, `description` says when to trigger, the four sections present, no Matt/Addy skill names).
- In a scratch repo, `operator init --agent claude-code -y` installs pstack + own skills, and a loose product idea typed in a fresh Claude Code session (no command) opens a PM-style grill (product questions, recommended answers, tech decided).
- `operator update` on a repo initialised with v2 leaves no Matt/Addy-only skill, no `operator` skill, and no managed `references/`.
