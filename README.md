# Operator

Operator installs a curated set of [Matt Pocock](https://github.com/mattpocock/skills) and [Addy Osmani](https://github.com/addyosmani/agent-skills) skills, then puts **one router** on top so the two packs work as a single pipeline. It targets any coding agent the [Vercel skills CLI](https://github.com/vercel-labs/skills) supports (Cursor, Codex, Claude Code, OpenCode, Gemini, Copilot, and dozens more).

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
operator init --agent cursor,claude-code,codex,opencode -y
operator init --agent "*"
operator init -g          # user-wide instead of this project
```

`--copy` is on by default on Windows (symlinks are unreliable there). `-y` is always passed through to `npx skills`.

## What gets installed

**Matt Pocock** (Understand → Build): `setup-matt-pocock-skills`, `grill-with-docs`, `grill-me`, `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `tdd`, `implement`, `code-review`, `codebase-design`, `improve-codebase-architecture`, `diagnosing-bugs`, `prototype`, `wayfinder`, `research`, `writing-for-agents`, `wizard`.

**Addy Osmani** (Production overlay): `security-and-hardening`, `code-review-and-quality`, `deprecation-and-migration`, `observability-and-instrumentation`, `ci-cd-and-automation`, `shipping-and-launch`, `performance-optimization`.

**Addy `references/`** is copied to the project root so paths like `../../references/security-checklist.md` resolve from installed skills.

**Operator** adds:

- the `operator` skill (`/operator`) — the only router
- a managed block in `AGENTS.md` (markers `<!-- operator:start -->` / `<!-- operator:end -->`) so agents that miss the skill still see the map

Not installed, on purpose: `ask-matt` and `using-agent-skills`. Two meta-routers fight over the next step.

## Pipeline

```
IDEA
  → grill-with-docs
  → domain-modeling
  → to-spec
  → to-tickets
  → prototype?          (throwaway only)
  → tdd                 (Matt)
  → implement
  → code-review         (Matt: Standards + Spec)
  → codebase-design
  → improve-codebase-architecture
  → security-and-hardening
  → code-review-and-quality
  → deprecation-and-migration
  → observability-and-instrumentation
  → ci-cd-and-automation
  → shipping-and-launch
```

On-ramps are allowed. A small specified fix can go straight to `tdd` + `implement`. A production launch runs the Addy overlay after Build.

Arbitration, in short:

- Tests are always Matt `tdd`
- Two reviews, in order: Matt during Build, Addy during Production (after security)
- Bugs go to `diagnosing-bugs`

## Develop

```bash
npm test
```

Node ≥ 18. Zero runtime dependencies; Operator shells out to `npx skills@latest`.
