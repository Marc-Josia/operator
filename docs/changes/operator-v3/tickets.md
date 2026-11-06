# Operator v3 — tickets

Spec: `spec.md`. Each ticket runs in its own worktree, branched from `feat/operator-evolution` after its blockers merged.

```
T1 ──┬── T2 Understand skills ─┐
     ├── T3 Build skills ──────┤
     ├── T4 Production skills ─┼── T8 Integration
     ├── T5 Close + utilities ─┤
     ├── T6 CLI ───────────────┤
     └── T7 Always-on router ──┘
```

## T1 — Foundation (blocks all)

- `src/payload/SKILL-TEMPLATE.md`: the mission format (spec §3) with one filled example.
- `src/catalog.json`: `ownSkills` (spec §2 list), `sources` = pstack only, `legacySkills` (every Matt/Addy name from v2, for removal), drop `references`. Update `src/lib/catalog.mjs` typedefs and helpers (`managedSkillNames` = own + pstack; `operatorSkill` removed, `operator` added to `legacySkills`).
- `src/test/skill-format.test.mjs`: validates any own skill folder present in the payload against the template (skips names not written yet). `catalog.test.mjs` updated.
- Done when: `npm test` passes, the template is under 60 lines.

## T2 — Understand skills (after T1)

`grill`, `spec`, `tickets`, `prototype`, `wayfinder`. PM rules (spec §5) are the core of `grill` and `wayfinder`. `tickets` holds the parallel-slicing rule (spec §6). `spec` and `tickets` write where the AGENTS.md tracker line says (spec §7). Read the v2 upstream skills on GitHub (`mattpocock/skills`) for intent and failure modes, then write mission style, never copy procedure.

## T3 — Build skills (after T1)

`constraints`, `implement`, `review`, `architecture`, `debug`. `implement` takes one ticket or a whole spec; for a spec it fans tickets out to subagents in worktrees (spec §6); tests at agreed seams are a done-when criterion. `review` has a high-risk mode (five axes). Sources: `mattpocock/skills`, `addyosmani/agent-skills`.

## T4 — Production skills (after T1)

`security`, `observability`, `ci`, `migration`, `ship`, `performance`. Each states its trigger. `ship` ends with the PM test kit (spec §5). Source: `addyosmani/agent-skills` (fold the useful parts of its `references/` checklists into done-when criteria).

## T5 — Close + utilities (after T1)

`retro`, `pr`, `handoff`, `writing-for-agents`. Source: `mattpocock/skills`.

## T6 — CLI (after T1)

`init`, `update`, `remove`, `status`, state file move, `CLAUDE.md` `@AGENTS.md` import for Claude Code (spec §4), tracker question (`--tracker`, prompt injected via `promptFn`), legacy removal, references purge, as in spec §7. Tests with injected `runner` / `fetchFn`, including a v2 → v3 update scenario. Version `3.0.0`.

## T7 — Always-on router in the agents-block (after T1)

Delete `src/payload/skills/operator/`. Rewrite `src/payload/agents-block.md` as the always-on router (spec §4, under 100 lines): same detector and gates with new names, no command to invoke; PM rules (§5); orchestration rule (§6); pstack substitutions kept; TokenEconomizer section renamed (spec Out of scope). Drop pack-vs-pack arbitration. Replace `skill.test.mjs` with block tests.

## T8 — Integration (after T2–T7)

Merge all, add the test that catalog ↔ payload ↔ agents-block name the same set and that every `## Hand-off` names an existing skill, update `README.md`, `CLAUDE.md` invariants, `package.json` description. Run the scratch-repo check from spec Done when. Hand the PM a test kit.
