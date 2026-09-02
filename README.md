# Operator

Operator installs a curated set of [Matt Pocock](https://github.com/mattpocock/skills) and [Addy Osmani](https://github.com/addyosmani/agent-skills) skills, plus [pstack](https://github.com/cursor/plugins/tree/main/pstack) `unslop`, then puts **one router** on top so those packs work as a single pipeline. On `init`, you pick which coding agents to install for (Cursor, Claude Code, Codex, and so on). Operator does not install a folder for every agent the [Vercel skills CLI](https://github.com/vercel-labs/skills) knows about unless you ask for `*`.

Operator does **not** fork those skills. It pulls them current, installs them, and owns only the orchestration layer.

```bash
npx --yes github:Marc-Josia/operator init
```

Then, in your agent, run `/setup-matt-pocock-skills` once, and start work with `/operator`.

## Commands

```bash
npx --yes github:Marc-Josia/operator init
npx --yes github:Marc-Josia/operator update
npx --yes github:Marc-Josia/operator status
npx --yes github:Marc-Josia/operator remove
npx --yes github:Marc-Josia/operator remove --purge
```

If the package is linked locally:

```bash
operator init                         # checkboxes: ↑/↓, space to select, enter
operator init --agent cursor,claude-code,codex,opencode -y
operator init --agent "*"             # every agent the skills CLI supports
operator init -g --agent cursor       # user-wide instead of this project
```

`--copy` is on by default on Windows (symlinks are unreliable there). `-y` is always passed through to `npx skills`. Without `--agent`, `-y` is an error: Operator will not guess `*` and scatter skill folders.

## What gets installed

**Matt Pocock** (Understand → Build): `setup-matt-pocock-skills`, `grill-with-docs`, `grill-me`, `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `tdd`, `implement`, `code-review`, `codebase-design`, `improve-codebase-architecture`, `diagnosing-bugs`, `prototype`, `wayfinder`, `triage`, `handoff`, `research`, `writing-for-agents`, `wizard`.

**Addy Osmani** (Production overlay): `security-and-hardening`, `code-review-and-quality`, `deprecation-and-migration`, `observability-and-instrumentation`, `ci-cd-and-automation`, `shipping-and-launch`, `performance-optimization`.

**pstack** (writing pass): `unslop`. Not the rest of pstack. `poteto-mode` is a competing router.

**Addy `references/`** is copied to the project root so paths like `../../references/security-checklist.md` resolve from installed skills.

**Operator** adds:

- the `operator` skill (`/operator`) — the only router
- a managed block in `AGENTS.md` (markers `<!-- operator:start -->` / `<!-- operator:end -->`) so agents that miss the skill still see the map

Not installed, on purpose: `ask-matt`, `using-agent-skills`, and `poteto-mode`. Two meta-routers fight over the next step.

## Pipeline

`/operator` runs a phase detector (first true branch). One skill per pass. Build entry is `implement` (it drives `tdd` at agreed seams, then Matt `code-review`). `prototype` only when UI/state shape is still the question.

```
IDEA
  → grill-with-docs
  → to-spec
  → to-tickets
  → prototype?          (throwaway; then detector again)
  → implement           (tdd at seams, then Matt code-review)
  → codebase-design / improve-codebase-architecture if seams still friction
  → security-and-hardening
  → observability-and-instrumentation
  → ci-cd-and-automation
  → code-review-and-quality
  → deprecation-and-migration   (if old code is leaving)
  → shipping-and-launch
```

Side paths: `wayfinder`, `triage`, `handoff`, `wizard`, `research`, `writing-for-agents`.

Arbitration, in short:

- Tests are always Matt `tdd`
- Two reviews, in order: Matt after `implement`, Addy during Production (after CI)
- Bugs go to `diagnosing-bugs`

## Develop

```bash
npm test
```

Node ≥ 18. Zero runtime dependencies; Operator shells out to `npx skills@latest`.
