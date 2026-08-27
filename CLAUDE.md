# Operator

This repository is **Operator**: a zero-dependency Node CLI that installs a curated Matt Pocock + Addy Osmani skill catalog (via `npx skills@latest`) and owns the **only** router that makes those two packs compose.

This file is for people and agents working **on Operator**. It is not the block shipped to consumer repos. That lives in `src/payload/agents-block.md` and is wrapped with `<!-- operator:start -->` / `<!-- operator:end -->` on `init`/`update`. Do not put those markers in this file.

## Layout

- `src/bin/operator.mjs` — CLI (`init`, `update`, `status`, `remove`)
- `src/catalog.json` — source of truth for skill names, skip list, and Addy reference files
- `src/lib/` — install/update/remove, `npx skills` argv, references fetch, AGENTS.md upsert, disk scan
- `src/payload/skills/operator/SKILL.md` — `/operator` router (user-invoked)
- `src/payload/agents-block.md` — short always-on map written into consumer `AGENTS.md`
- `src/test/` — `node:test`

Shipped surface is `src/` plus root `package.json`. English in everything an agent will read (payload, catalog comments, this file, README).

## Invariants

- Do not fork or patch Matt/Addy `SKILL.md`. Operator orchestrates; upstream stays upstream.
- One router: `operator`. Never add `ask-matt` or `using-agent-skills` to the catalog (`catalog.skip`).
- Matt owns Understand → Build (`tdd`, `implement`, `code-review`). Addy owns the Production overlay (`security-and-hardening` onward). Two reviews are sequential, not interchangeable.
- Zero runtime dependencies. Shell out to `npx skills@latest`. Node ≥ 18, ESM.
- `--copy` is implied on Windows. `remove` must not pass `--copy`.
- `update` refreshes catalog skills, re-adds the local operator skill, re-fetches `references/`, and replaces only the managed AGENTS.md block. It does not touch the rest of a consumer repo.
- `references/` in a consumer project is Addy’s checklists so `../../references/` resolves. Purge only files listed in `references/.operator-managed.json`.



## How to change things

- Add/drop a curated skill → `src/catalog.json` and the tests in `src/test/catalog.test.mjs`. Keep payload router + agents-block in sync with the same names.
- Change routing/arbitration → both `src/payload/skills/operator/SKILL.md` and `src/payload/agents-block.md` (skill is detailed; block stays short).
- Change CLI flags or `npx skills` argv → `src/lib/skills.mjs` and `src/test/skills.test.mjs`. Prefer injecting `runner` / `fetchFn` over hitting the network in tests.

```bash
npm test
```

Do not run `operator init` against this repo unless you are deliberately dogfooding; it would install consumer skills and a managed AGENTS.md block on top of this file.