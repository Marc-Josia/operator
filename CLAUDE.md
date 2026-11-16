# Operator

This repository is **Operator**: a zero-dependency Node CLI that installs its own mission-style skills plus pstack overlays (via `npx skills@latest`). It writes nothing else into a consumer repo except `.operator/state.json`: no `OPERATOR.md`, no `AGENTS.md` block, no `CLAUDE.md` import. The process serves a Product Manager; there is no command to invoke. Coding agents discover and trigger the skills from each skill's `description` alone.

This file is for people and agents working **on Operator**. It is not what ships to consumer repos.

## Layout

- `src/bin/operator.mjs` — CLI (`init`, `update`, `status`, `remove`)
- `src/catalog.json` — `ownSkills`, pstack `sources`, `legacySkills` (v2 names to remove), agent picker list
- `src/lib/` — install/update/remove, `npx skills` argv, state file, tracker choice, disk scan, v2 `references/` purge, `legacy-files.mjs` (detects and cleans what v3.x wrote: `OPERATOR.md`, the `AGENTS.md` block and tracker line, the `CLAUDE.md` import)
- `src/payload/skills/<name>/SKILL.md` — own skills, installed from the payload
- `src/payload/SKILL-TEMPLATE.md` — the mission format (not installed)
- `src/test/` — `node:test`

Shipped surface is `src/` plus root `package.json`. English in everything an agent will read (payload, catalog, this file, README).

## Invariants

- Operator only installs skills. It never writes `OPERATOR.md`, never creates or edits `AGENTS.md` or `CLAUDE.md`, and keeps no router file or block. The only file it writes in a consumer repo is `.operator/state.json` (`~/.operator/state.json` with `-g`).
- Own skills follow the template: frontmatter `name` = folder, a `description` that is the skill's only trigger, exactly `Mission`, `Done when`, `Never`, `Stop and ask`, `Hand-off`, target under 60 lines, no step-by-step how. The `description` starts with "Use when", says when to use the skill and when not, stays at 1024 characters or less, and front-loads the trigger. Every `## Hand-off` names existing skills; it carries the lane order.
- pstack is the only upstream source. Never fork or patch its `SKILL.md`. pstack `tdd` and `poteto-mode` are never added.
- No router skill and no command. Never add `operator`, `ask-matt`, `using-agent-skills`, or `poteto-mode` back. Matt/Addy names appear only in `legacySkills` and v2-migration code and tests.
- The process rules live in the skills that own them, not in a shared file: the detector sizes work first; three gates (understanding, breakdown, merge); one simplify pass by a fresh agent after a medium or larger build (`simplify-pass`), then one review per change (`review`, high-risk mode instead of the default on a high-risk change); every cycle ends with a PM test kit; agents never commit on `main`, `master`, `develop`, or `staging`, never merge into them without the PM's go, and commit finished work unasked. `implement` holds the git and code rules. Change a rule in the skill that owns it and keep the Hand-offs consistent.
- The tracker choice (`local` | `github` | `linear` | free text) lives only in `.operator/state.json` (`tracker`). The skills read it there; missing or `local` means `docs/changes/<change-id>/`.
- TokenEconomizer (microsoft/TokenEconomizer) is a per-machine plugin, never a catalog source and never installed. `status` only reports it (`src/lib/token-economizer.mjs`) and never counts it toward `ok`.
- Zero runtime dependencies. Shell out to `npx skills@latest`. Node ≥ 18, ESM.
- `--copy` is implied on Windows. `remove` never passes `--copy`.
- Never default `--agent` to `*`. `init` prompts (TTY) or requires `--agent` with `-y`.
- State lives in `.operator/state.json`: `agents`, `tracker`, and, only on installs made by v3.x, a `claudeMd` record of what Operator added to `CLAUDE.md`. `update`/`remove` read the v2 manifest `references/.operator-managed.json` once when the state file is missing.
- The v3 cleanup in `update`/`remove` is limited to what older versions wrote: `OPERATOR.md`; the tracker line (`Specs and tickets live in: …`) and the block between `<!-- operator:start -->` / `<!-- operator:end -->` in `AGENTS.md` (the file is deleted only when nothing but the empty scaffold headings remains); the `@AGENTS.md` line in `CLAUDE.md` when state says Operator added it (on `update` only once `AGENTS.md` no longer exists, on `remove` always; `CLAUDE.md` is deleted only if Operator created it and it is now empty). `status` reports these as leftovers and they fail `ok`.
- No `references/` install. Only the v2 purge, limited to files its manifest lists.
- `update` touches only managed parts: pstack via `npx skills update`, own skills re-added from the payload, legacy-only v2 skills removed, the v2 `references/` purged, the v3 cleanup above, state saved. The rest of a consumer repo stays as it is.

## How to change things

- Add/drop an own skill → `src/payload/skills/<name>/`, `ownSkills` in `src/catalog.json`, and the Hand-offs that should reach it. `src/test/consistency.test.mjs` and `src/test/skill-format.test.mjs` enforce the set and the format.
- Change routing → the owning skill's `description` (trigger) and `## Hand-off` (next step).
- Change CLI flags or `npx skills` argv → `src/lib/skills.mjs` and `src/test/skills.test.mjs`. Agent picker → `src/lib/target-agents.mjs`. Tracker prompt → `src/lib/tracker.mjs`. Prefer injecting `runner` / `promptFn` over hitting the network or stdin in tests.

```bash
npm test
```

Do not run `operator init` against this repo unless you are deliberately dogfooding; it would install consumer skills on top of this checkout.
