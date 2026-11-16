# Operator

Operator gives any coding agent (Claude Code, Cursor, Codex, and others) one working process built for a **Product Manager**. You say what you want, for whom, and why. The agent asks only product questions, decides the technical side and lists its choices so you can veto, builds in slices you can try, and stops only where you have to decide.

There is no command to invoke. Operator installs skills and nothing else: it writes no file into your repo (no `OPERATOR.md`, no change to `AGENTS.md` or `CLAUDE.md`). Each skill's description tells the agent when to use it, so the agent picks the right one from what you say.

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

**Nothing else.** Operator only installs skills (through `npx skills@latest`) and saves your agent and tracker choices in `.operator/state.json`. Agents discover the skills the way they discover any skill: from each `description`, which says when to use it and when not.

## How it works

Skills trigger on their own from their descriptions, and they chain through their `## Hand-off`. The agent sizes the work first. A one-sentence fix: make it, run the checks, commit. A clear, one-session change: a short plan, then build. A loose idea: `grill` (shared understanding), `spec`, `tickets`, then `implement`. A vision too big for one session: `wayfinder` cuts it into milestones first. Production skills (`security`, `observability`, `ci`, `migration`, `ship`, `performance`) run only when their trigger holds. `retro` closes medium or larger work.

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

**Where specs and tickets live.** `init` asks: local markdown (`docs/changes/<id>/`), GitHub issues, Linear, or anything else you type. The answer is saved in `.operator/state.json` (`tracker`: `local`, `github`, `linear`, or your text), and the skills read it from there; missing means local markdown. Nothing is written to `AGENTS.md`. When the platform's tool is missing (no `gh`, no Linear MCP), the agent says so and falls back to local markdown.

## Commands

```bash
npx --yes github:Marc-Josia/operator init      # install, ask agents and tracker
npx --yes github:Marc-Josia/operator update    # refresh skills, clean what v3 wrote
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

`status` lists agents, the saved tracker, own and pstack skills with their locations, leftover v2 skills, anything an older Operator left in the repo (with "run `operator update`"), and whether TokenEconomizer is present. It exits non-zero when a skill is missing or a leftover remains.

`remove` uninstalls own and pstack skills, cleans any v3 leftovers (below), and deletes the state file.

## Upgrading from v3

v4 stops writing into your repo. Run `operator update`: it refreshes the skills as before, then cleans what v3.x wrote, once, and logs one line per cleanup:

- deletes `OPERATOR.md`;
- removes the tracker line (`Specs and tickets live in: …`) and the managed block (`<!-- operator:start -->` to `<!-- operator:end -->`) from `AGENTS.md`; the file is deleted only when nothing but the empty sections `init` scaffolded is left, and your own text is never touched;
- removes the `@AGENTS.md` line from `CLAUDE.md` only if Operator added it and `AGENTS.md` no longer exists (otherwise your own `AGENTS.md` would disappear for Claude Code); `CLAUDE.md` is deleted only if Operator created it and it is now empty. `remove` drops that line whenever Operator added it.

Your tracker choice moves with you: it was already in `.operator/state.json`.

## Upgrading from v2

What changed in v3:

- **Own skills instead of Matt Pocock and Addy Osmani packs.** 21 mission-style skills replace them; pstack is the only upstream source left.
- **No `/operator` command.**
- **PM-first process.** Product-level questions only, three gates (understanding, breakdown, merge), a test kit at the end of every cycle.
- **One simplify pass and one review per change**, with a high-risk review mode for sensitive changes.
- **Tracker choice** on `init` (local markdown, GitHub, Linear, or free text), saved in `.operator/state.json` with the agents.
- **No `references/` folder** copied into your repo any more.

Run `operator update`. It removes the v2 skills still installed (the Matt Pocock and Addy Osmani packs and the v2 `operator` router), installs the own skills in their place, deletes the old managed `references/` folder (only the files its manifest lists), moves the saved agents into `.operator/state.json`, and cleans the old `AGENTS.md` block. There is no `/operator` command any more. If the repo still has a `CONTEXT.md` glossary, Operator tells you to rename it to `GLOSSARY.md` with `git mv`.

## Optional: TokenEconomizer

[TokenEconomizer](https://github.com/microsoft/TokenEconomizer) (Microsoft Research) cuts what an agent costs in a repository you work in often. It remembers how the repo works (micro-skills), stops loading tools that go unused (tool pruning), and redirects a turn that loops on the same failures (loop guard). It is a plugin with hooks and needs Python ≥ 3.10. It is installed once per machine, not per project, so Operator does not install it. It supports Claude Code, Codex, the Copilot CLI, Pi, and opencode (experimental), but not Cursor.

Install it yourself if you want it (Claude Code shown; the [TokenEconomizer README](https://github.com/microsoft/TokenEconomizer#install) covers the other agents):

```bash
git clone https://github.com/microsoft/TokenEconomizer.git   # keep the clone: the plugin runs from it
claude plugin marketplace add "$PWD/TokenEconomizer"
claude plugin install tokeneconomizer@tokeneconomizer
```

`operator status` reports whether it is there; it never counts toward the check.

## Develop

```bash
npm test
```

Node ≥ 18. Zero runtime dependencies; Operator shells out to `npx skills@latest`.
