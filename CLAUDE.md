# Operator

This repository is **Operator**: a zero-dependency Node CLI that installs its own mission-style skills plus pstack overlays (via `npx skills@latest`) and writes an always-on router block into a consumer's `AGENTS.md`. The process serves a Product Manager; there is no command to invoke.

This file is for people and agents working **on Operator**. It is not what ships to consumer repos. The process lives in `src/payload/operator.md`, written as the consumer's `OPERATOR.md` on `init`/`update`. `src/payload/agents-block.md` is a short pointer to it, wrapped with `<!-- operator:start -->` / `<!-- operator:end -->` at the top of the consumer's `AGENTS.md`. Do not put those markers in this file.

## Layout

- `src/bin/operator.mjs` — CLI (`init`, `update`, `status`, `remove`)
- `src/catalog.json` — `ownSkills`, pstack `sources`, `legacySkills` (v2 names to remove), agent picker list
- `src/lib/` — install/update/remove, `npx skills` argv, state file, tracker line, `AGENTS.md` / `CLAUDE.md` upsert, v2 `references/` purge, disk scan
- `src/payload/skills/<name>/SKILL.md` — own skills, installed from the payload
- `src/payload/SKILL-TEMPLATE.md` — the mission format (not installed)
- `src/payload/operator.md` — always-on router, written as the consumer's `OPERATOR.md`
- `src/payload/agents-block.md` — the managed `AGENTS.md` block: a pointer that makes agents read `OPERATOR.md` (and imports it for Claude Code)
- `src/test/` — `node:test`

Shipped surface is `src/` plus root `package.json`. English in everything an agent will read (payload, catalog, this file, README).

## Invariants

- Own skills follow the template: frontmatter `name` = folder, a `description` that says when to trigger, exactly `Mission`, `Done when`, `Never`, `Stop and ask`, `Hand-off`, target under 60 lines, no step-by-step how. Every `## Hand-off` names existing skills; it carries the lane order.
- pstack is the only upstream source. Never fork or patch its `SKILL.md`; `operator.md` maps its Cursor paths and missing hand-offs (`arena`, `how`, `why`, playbooks). pstack `tdd` and `poteto-mode` are never added.
- No router skill and no command: `OPERATOR.md` is the router, and the `AGENTS.md` block only points to it. The pointer stays short, sits at the top of `AGENTS.md`, keeps its bare `@OPERATOR.md` line, and tells agents to read the file in full before acting so it is never skipped. Never add `operator`, `ask-matt`, `using-agent-skills`, or `poteto-mode` back. Matt/Addy names appear only in `legacySkills` and v2-migration code and tests.
- The process: the detector sizes work first; three gates (understanding, breakdown, merge); one simplify pass by a fresh agent after a medium or larger build (`simplify-pass`), then one review per change (`review`, high-risk mode instead of the default on a high-risk change); every cycle ends with a PM test kit; agents never commit on `main`, `master`, `develop`, or `staging`, never merge into them without the PM's go, and commit finished work unasked (`## Git` in `operator.md`). Change it in the skill that owns it and keep `operator.md` in sync.
- `operator.md` stays under 100 lines; it loads every session.
- TokenEconomizer (microsoft/TokenEconomizer) is a per-machine plugin, never a catalog source and never installed. `operator.md` composes with it; `status` only reports it (`src/lib/token-economizer.mjs`) and never counts it toward `ok`.
- Zero runtime dependencies. Shell out to `npx skills@latest`. Node ≥ 18, ESM.
- `--copy` is implied on Windows. `remove` never passes `--copy`.
- Never default `--agent` to `*`. `init` prompts (TTY) or requires `--agent` with `-y`.
- State lives in `.operator/state.json` (`~/.operator/state.json` with `-g`): agents, tracker, whether Operator created `CLAUDE.md`. `update`/`remove` read the v2 manifest `references/.operator-managed.json` once when it is missing.
- The tracker is one line under `## Project context`, after the managed block: `Specs and tickets live in: …`.
- Claude Code target: `CLAUDE.md` holds one `@AGENTS.md` line, never duplicated; `remove` deletes only that line, and the file only if Operator created it.
- No `references/` install. Only the v2 purge, limited to files its manifest lists.
- `update` touches only managed parts: pstack via `npx skills update`, own skills re-added from the payload, legacy-only v2 skills removed, the v2 `references/` purged, `OPERATOR.md` and the managed block replaced. The rest of a consumer repo stays as it is.

## How to change things

- Add/drop an own skill → `src/payload/skills/<name>/`, `ownSkills` in `src/catalog.json`, `src/payload/operator.md`, and the Hand-offs that should reach it. `src/test/consistency.test.mjs` and `src/test/skill-format.test.mjs` enforce the set and the format.
- Change routing → the owning skill's `## Hand-off` and `src/payload/operator.md` (skill is detailed; `operator.md` stays short).
- Change CLI flags or `npx skills` argv → `src/lib/skills.mjs` and `src/test/skills.test.mjs`. Agent picker → `src/lib/target-agents.mjs`. Tracker → `src/lib/tracker.mjs`. Prefer injecting `runner` / `promptFn` over hitting the network or stdin in tests.

```bash
npm test
```

Do not run `operator init` against this repo unless you are deliberately dogfooding; it would install consumer skills and a managed AGENTS.md block on top of this file.
