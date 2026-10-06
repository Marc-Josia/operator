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
npx --yes github:Marc-Josia/operator loop start --contract docs/changes/my-feature/execution.json
npx --yes github:Marc-Josia/operator loop status --id my-feature
npx --yes github:Marc-Josia/operator loop resume --id my-feature
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

`/operator` selects a path proportional to the request's uncertainty, scope, and risk. It continues through applicable phases within the user's authorized scope, stopping for completion, missing decisions or permissions, or user input required by a selected skill.

- Clear, localized, low-risk correction: inspect → fix directly → focused verification and diff review. No mandatory spec, tickets, ledger, or two formal reviews. Unclear bugs use `diagnosing-bugs`; consequential changes get the relevant deeper workflow.
- Complex feature: clarify unresolved requirements → specify → approve tickets → authorize the persistent implementation loop (`implement`, `tdd` at agreed seams, Matt review, then production verification). Spec and approved tickets remain required for the loop. Reuse adequate existing specs; use `prototype` when UI/state shape is unresolved.
- Requested delivery: choose checks from actual production risk and existing evidence. Repository-required checks still apply. Explain omitted checks briefly and run selected skills in the order below.

The feature and delivery paths draw from this map. Direct corrections keep focused verification; the persistent feature loop assesses the production stages automatically and records inapplicable concerns:

```
IDEA
  → grill-with-docs
  → to-spec
  → to-tickets          (approved trace for the implementation loop)
  → prototype?          (throwaway; then detector again)
  → implement           (tdd at seams, then Matt code-review)
  → codebase-design / improve-codebase-architecture if seams still friction
  → requested delivery: select relevant checks, in order
      security-and-hardening          (security exposure changes)
      observability-and-instrumentation (runtime signals needed)
      ci-cd-and-automation            (automation changes or gaps)
      code-review-and-quality         (broader review warranted or required)
      deprecation-and-migration       (contract, data, compatibility changes)
      shipping-and-launch             (deployment or launch rollout planning)
```

Side paths: `wayfinder`, `triage`, `handoff`, `wizard`, `research`, `writing-for-agents`.

Arbitration, in short:

- Testing skills use Matt `tdd`; direct corrections can run focused checks without invoking a testing skill
- `implement` includes Matt review; Addy production review applies when risk or an explicit requirement warrants it. When both apply, Matt precedes Addy
- Known, localized, low-risk bugs use the direct correction path; unclear or difficult bugs use `diagnosing-bugs`

Selected skills keep their own requirements, subject to user instructions. Ordinary merges use the repository's checks without automatically adding a launch workflow.

## Implementation loop

`operator loop start` executes an approved contract referencing an existing spec and nonempty tickets. The contract fixes acceptance criteria, check commands, agent command, and bounded execution budgets. The controller runs project checks itself, records evidence for every ticket criterion, and runs Matt review followed by the Addy production checks in order. Every review starts a separate agent process; an optional reviewer command can use a different agent.

The agent command is a configured headless adapter. Operator sends a phase prompt on stdin and supplies context/result file paths through environment variables. It runs explicit command/argument arrays without a shell and preserves the host's permission policy. The installed operator skill includes the [contract and adapter protocol](src/payload/skills/operator/references/execution.md).

Completion requires successful checks and all review evidence on the same current Git snapshot. Missing evidence, runtime failures, stalled work, and exhausted budgets remain incomplete. Source changes after completion make its status stale. `loop resume` preserves the approved contract and remaining budget, and restarts verification. Spec/ticket changes require a new approved contract and id.

Run artifacts at `temp/operator/<id>/` retain the approved spec, tickets, dependency graph, criterion evidence, reports, logs, and iteration history. A run prepares shipping readiness; merge, push, publish, and deployment follow separate authorization. The controller enforces ordering and verification freshness; model review is evidence, not a security guarantee or an execution sandbox.

## Develop

```bash
npm test
```

Node ≥ 18. Zero runtime dependencies; Operator shells out to `npx skills@latest`.
