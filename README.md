# Operator

Operator gives any coding agent (Claude Code, Cursor, Codex, and others) one working process built for a **Product Manager**. You say what you want, for whom, and why. The agent asks only product questions, decides the technical side and lists its choices so you can veto, builds in slices you can try, and stops only where you have to decide.

There is no command to invoke. Once installed, the process is how the agent handles every request.

```bash
npx --yes github:Marc-Josia/operator init
```

Then open your agent in the repo and describe your idea in plain words.

## What gets installed

**Operator's own skills**, written as missions (what done looks like, what never to do, where you decide), not step-by-step procedure:

| Lane | Skills |
| --- | --- |
| Understand | `grill`, `spec`, `tickets`, `prototype`, `wayfinder` |
| Build | `constraints`, `implement`, `simplify-pass`, `review`, `architecture`, `debug` |
| Production | `security`, `observability`, `ci`, `migration`, `ship`, `performance` |
| Close | `retro` |
| Utilities | `pr`, `babysit`, `modernize`, `handoff`, `writing-for-agents` |

Each skill ends with a `## Hand-off` that names the next one, so the lanes chain without a central map.

**[pstack](https://github.com/cursor/plugins/tree/main/pstack) overlays**, unchanged: `unslop` (writing pass), `correct` (turns a repeated mistake into a check), `blast-radius` (what a change breaks outside the diff), `benchmark-checklist` (vets a measured perf number), `create-verification-skill` and `maintain-verification-skill` (a project skill that drives the real app), `principle-prove-it-works`, `principle-fix-root-causes`.

**`OPERATOR.md`** at the repo root: the always-on router (the detector, the three gates, the PM rules, orchestration, and the overlays). Operator owns the whole file and `update` rewrites it.

**A short managed block at the top of `AGENTS.md`** (between `<!-- operator:start -->` and `<!-- operator:end -->`) that points to `OPERATOR.md`: agents must read it in full before their first reply, and again after the context is compacted. Claude Code loads it on its own through an `@OPERATOR.md` import in that block. `init` also adds empty project sections after the block (`Project context`, `Commands`, `Conventions`, `Interface design`, `Known pitfalls`, `Project skills`); those belong to your project and `update` never touches them.

**For Claude Code**, which does not read `AGENTS.md` by itself: an `@AGENTS.md` import line in `CLAUDE.md` (the file is created if missing; the line is never duplicated).

## How it works

The agent sizes the work first. A one-sentence fix: make it, run the checks, commit. A clear, one-session change: a short plan, then build. A loose idea: `grill` (shared understanding), `spec`, `tickets`, then `implement`. A vision too big for one session: `wayfinder` cuts it into milestones first. Production skills (`security`, `observability`, `ci`, `migration`, `ship`, `performance`) run only when their trigger holds. `retro` closes medium or larger work.

The agent never works on `main`, `master`, `develop`, or `staging`: it branches off first, commits its work without being asked when it is done, and never merges into those branches without your go.

The agent stops and waits only at three gates:

- **Understanding.** You confirm the agent's summary of what ships, for whom, and how you will know it works.
- **Breakdown.** You approve the tickets: each one a slice you can see and try.
- **Merge.** You run the test kit and it works. Merging, deploying, and shipping are your call. Before you get it, `babysit` brings the PR to green: CI fixed, review bots answered or declined with a reason, branch up to date.

**Test kit.** Every cycle ends with one: where to go (a preview URL or a command), the journey step by step, and what you should see. The agent runs that journey itself on the real thing first.

**One simplify pass per change.** After a medium or larger build, a fresh agent that did not write the code rereads the diff and makes it simpler without changing what it does, in its own commit, before any review. A one-sentence fix skips it.

**One review per change.** A medium change gets one `review` after the simplify pass. A high-risk change (auth, input, secrets, personal data, or a third party; a data or schema migration; a public interface; a release to users) skips that and gets one `review` in high-risk mode after the Production checks. That high-risk review runs on a model from another provider when your agent can reach one, in at most three rounds.

**Old PRs.** `modernize` decides whether a stale PR still belongs (modernize, rework, or close) before rebasing it.

The PR lifecycle skills (`babysit`, `modernize`, the cross-model review) are adapted from [tstack](https://github.com/t3dotgg/tstack) (MIT).

**Orchestration.** The agent you talk to orchestrates. Each ticket goes to a subagent in its own git worktree, tickets with no blocking edge run in parallel, and the main agent integrates and verifies. An agent without subagents or worktrees runs the same tickets one after another.

**Where specs and tickets live.** `init` asks: local markdown (`docs/changes/<id>/`), GitHub issues, Linear, or anything else you type. The answer is written as one line under `## Project context` in `AGENTS.md` (`Specs and tickets live in: …`). When the platform's tool is missing (no `gh`, no Linear MCP), the agent says so and falls back to local markdown.

## Commands

```bash
npx --yes github:Marc-Josia/operator init      # install, ask agents and tracker
npx --yes github:Marc-Josia/operator update    # refresh skills and the managed block
npx --yes github:Marc-Josia/operator status    # what is installed, what is left over
npx --yes github:Marc-Josia/operator remove    # uninstall what Operator added
```

With the package linked locally:

```bash
operator init                                   # checkboxes: ↑/↓, space to select, enter
operator init --agent cursor,claude-code -y     # non-interactive, tracker defaults to local
operator init --agent claude-code --tracker github -y
operator init --tracker "Jira project WEB"      # any text works
operator init --agent "*"                       # every agent the skills CLI supports
operator init -g --agent cursor                 # user-wide instead of this project
```

| Flag | Commands | Meaning |
| --- | --- | --- |
| `--agent a,b` | init, update, remove | Target agents. With `-y`, `init` requires it: Operator never guesses `*`. |
| `--tracker x` | init, update | `local`, `github`, `linear`, or free text. |
| `-g`, `--global` | init, update, remove | Install to the user directory instead of the project. |
| `--copy` | init, update | Copy files instead of symlinking. On by default on Windows. |
| `-y`, `--yes` | all | Non-interactive; always passed through to `npx skills`. |

Agents and tracker are saved in `.operator/state.json` (`~/.operator/state.json` with `-g`). `update` and `remove` reuse them; pass `--agent` or `--tracker` to change them.

`status` lists own and pstack skills, leftover v2 skills, `OPERATOR.md` (missing fails the check), the `AGENTS.md` block, the `CLAUDE.md` import, the tracker line, and whether TokenEconomizer is present.

`remove` uninstalls own and pstack skills, deletes `OPERATOR.md`, strips the managed block, the tracker line, and the `CLAUDE.md` import line (deleting `CLAUDE.md` only if Operator created it), and deletes the state file.

## Upgrading from v2

What changes in v3:

- **Own skills instead of Matt Pocock and Addy Osmani packs.** 21 mission-style skills replace them; pstack is the only upstream source left.
- **No `/operator` command.** `OPERATOR.md`, which the `AGENTS.md` block points to, is the router and is always on.
- **PM-first process.** Product-level questions only, three gates (understanding, breakdown, merge), a test kit at the end of every cycle.
- **One simplify pass and one review per change**, with a high-risk review mode for sensitive changes.
- **Tracker choice** on `init` (local markdown, GitHub, Linear, or free text), saved in `.operator/state.json` with the agents.
- **Claude Code support** through an `@AGENTS.md` import in `CLAUDE.md`.
- **No `references/` folder** copied into your repo any more.

Run `operator update`. It removes the v2 skills still installed (the Matt Pocock and Addy Osmani packs and the v2 `operator` router), installs the own skills in their place, deletes the old managed `references/` folder (only the files its manifest lists), moves the saved agents into `.operator/state.json`, and rewrites the `AGENTS.md` block. There is no `/operator` command any more. If the repo still has a `CONTEXT.md` glossary, Operator tells you to rename it to `GLOSSARY.md` with `git mv`.

## Optional: TokenEconomizer

[TokenEconomizer](https://github.com/microsoft/TokenEconomizer) (Microsoft Research) cuts what an agent costs in a repository you work in often. It remembers how the repo works (micro-skills), stops loading tools that go unused (tool pruning), and redirects a turn that loops on the same failures (loop guard). It is a plugin with hooks and needs Python ≥ 3.10. It is installed once per machine, not per project, so Operator does not install it. It supports Claude Code, Codex, the Copilot CLI, Pi, and opencode (experimental), but not Cursor.

Install it yourself if you want it (Claude Code shown; the [TokenEconomizer README](https://github.com/microsoft/TokenEconomizer#install) covers the other agents):

```bash
git clone https://github.com/microsoft/TokenEconomizer.git   # keep the clone: the plugin runs from it
claude plugin marketplace add "$PWD/TokenEconomizer"
claude plugin install tokeneconomizer@tokeneconomizer
```

Operator composes with it once it is present. `operator status` reports whether it is there. The router tells agents to treat a loop-guard redirect as a cue to change approach (or to run `debug` when the cause is unknown), never to weaken the checks to escape the loop (`constraints`). Injected facts that hold for the whole project are copied into `AGENTS.md`, because TokenEconomizer keeps them on one machine. When a step needs a tool that was pruned, the agent asks you to run `toolprune restore` instead of working around it.

## Develop

```bash
npm test
```

Node ≥ 18. Zero runtime dependencies; Operator shells out to `npx skills@latest`.
