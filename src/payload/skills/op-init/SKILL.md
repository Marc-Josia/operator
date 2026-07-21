---
name: op-init
description: "Set up Operator in a project on first run: survey the codebase into memory, confirm the test command, tune how the agent talks to the operator (language, verbosity, expertise level), and choose where work is tracked — local markdown work items, GitHub Issues, or Linear. Use it right after install, when the operator says to onboard, get started, configure tracking, or adjust the tone, or to switch trackers later. It writes config, the AGENTS.md profile, and memory, opens no work item, and passes no gate."
---

# op-init — set the project up

## Purpose

Make the project ready to run work through Operator, once. Four things get settled here and are
assumed everywhere downstream: the codebase is surveyed into `memory/project.md`, the test command
and protected paths in `config.json` are confirmed against reality, the **communication profile**
(language, verbosity, operator expertise) is written into `AGENTS.md` so the agent talks the way the
operator wants, and the operator chooses where work is **tracked** — local markdown, GitHub Issues,
or Linear. Triage, scope, and every gate depend on the survey; the mirror touchpoints in `op-new`,
`op-fix`, `op-ship`, and `op-status` depend on the tracker choice; every reply's tone depends on the
profile. op-init is the one place these are set, so nothing later has to guess them.

## Entry criteria

- Operator is installed (`.operator/` exists) — this runs after `operator init`, not instead of it.
- It is the first engagement in the project (`memory/project.md` still reads `_Not yet surveyed._`),
  or the operator asks to onboard, get started, or (re)configure tracking. Re-running is safe: it
  reconfirms the survey and lets the operator switch trackers.
- You have read `.operator/constitution.md`, including its `## Tracking` section — that section is
  the authority on the mirror model; this procedure applies it.

## Steps

### 1. Survey the codebase into project memory

Read `.operator/memory/project.md`. If it still contains `_Not yet surveyed._`, fill it now —
every later triage, scope decision, and test expectation depends on knowing the project:

- **Stack** — languages, frameworks, package manager, runtimes (from manifests and lockfiles).
- **Commands** — install, build, test, lint, run locally. Take them from manifests and CI config,
  not guesswork.
- **Layout** — the 5–10 directories that matter and what lives in each.
- **Environment quirks** — required env vars, ports, platform gotchas, slow or flaky steps.

Stay under the 120-line cap (`.operator/config.json`). If `project.md` is already filled, reconfirm
it is still accurate and move on.

### 2. Confirm the test command and protected paths

The build gate cannot pass without a test command. Read `.operator/config.json`:

- If `testCommand` is `null` and the survey found the command, confirm it with the operator and
  write it in. If the project genuinely has no tests, set it to `false` — the gate will then require
  a journaled `WAIVER tests` line at build, quoting the operator's reason.
- Show the `protectedPaths` list and ask whether it fits this project (defaults cover auth,
  payments, migrations, secrets, CI). Adjust on request. Protected paths never travel the quick lane
  and always force a security review.

### 3. Set the communication profile

The agent should not address a total novice and a staff engineer the same way, and not everyone
works in English. Ask the operator three things, then write their answers into `AGENTS.md` so every
reply — plain chat as much as work-item reports — honors them:

- **Language** — the language to converse in (the reply prose; skill and procedure files stay
  English). Default to the language the operator is already using with you.
- **Verbosity** — how much detail in discussion: `terse` (answer first, minimal preamble),
  `balanced`, or `thorough` (spell out reasoning and context).
- **Operator expertise** — `novice` (explain concepts, avoid unexplained jargon, guide more
  actively), `intermediate`, or `expert` (assume depth, use precise terms, justify trade-offs
  instead of teaching basics).

Write them into a dedicated managed region in `AGENTS.md`, immediately after the
`<!-- operator:end -->` marker of the Operator block, using **these exact markers** so it can be
updated in place and cleanly removed:

```
<!-- operator:profile:begin -->
## Operator — communication profile

Adapt every reply to the operator, in chat and in reports:
- **Language:** <language> — converse in this language; skill and procedure files stay English.
- **Verbosity:** <level> — <one-line gloss of what that means here>.
- **Operator expertise:** <level> — <how to pitch explanations at this level>.
<!-- operator:profile:end -->
```

This region is the operator's data, not the managed block: `update` preserves it (like
`config.json`), and `remove` strips it. Re-running op-init finds the markers and rewrites the region
in place — never leave a second one. If `AGENTS.md` has no Operator block yet (unusual — install
writes one), put the region at the top of the file instead. The constitution's `## Communication`
section is the authority on honoring it.

### 4. Choose where work is tracked

Ask the operator plainly: **markdown, GitHub Issues, or Linear?** Explain the trade in one line —
markdown keeps everything local and offline; GitHub/Linear mirror each work item to an issue your
team already watches, while the local work item stays the source of truth either way (constitution
`## Tracking`). Then set `tracker` in `config.json` and, for an external choice, capture its target
in `trackerConfig` after verifying the connection:

- **markdown** (default) — `"tracker": "markdown"`, `trackerConfig` stays `{}`. No external calls,
  ever. This is the whole step; skip the verification below.
- **github** — confirm the repository (`owner`/`repo`). Verify your host can reach it with **one
  read call** through the GitHub MCP tools (e.g. read the repo or list a page of issues). On
  success, write `"tracker": "github"` and `"trackerConfig": { "owner": "…", "repo": "…" }`.
- **linear** — confirm the team. Verify with **one read call** through the Linear MCP tools (e.g.
  list teams and match the one the operator names). On success, write `"tracker": "linear"` and
  `"trackerConfig": { "team": "<team key or id>" }`.

**Verify before you commit the choice — never assume the tool is there.** MCP availability differs
by host (constitution capability table). If the chosen tracker's MCP tool is absent or the read call
fails, say so, keep `"tracker": "markdown"`, and tell the operator what to connect (the MCP server
for that tracker) before re-running op-init. An external tracker the agent cannot reach would leave
every work item silently un-mirrored — default to the honest local mode instead.

### 5. Report and hand off

Tell the operator what is now set: the surveyed stack in one line, the test command, and the chosen
tracker (with its target for GitHub/Linear). Then point them at the actual work — a plain-language
request routes to `op-new` (or the right procedure) through the always-loaded block. op-init opens
no work item; the first `op-new` will create one and, in an external tracker mode, mirror it.

## Exit gate

None. op-init moves no work-item state and passes no mechanical gate — like `op-discover` and
`op-roadmap`, the operator approves its output, not `op.mjs`. It ends when `memory/project.md` is
filled, `config.json` carries a confirmed `testCommand` (or an explicit `false`), the
`operator:profile` region is written into `AGENTS.md`, and `tracker` is set to a mode whose
connection you verified (or `markdown`). Nothing is journaled — there is no work item yet.

## Failure modes

- **Skipping straight to op-new on a fresh project.** The survey never happens and triage guesses at
  the stack. If `memory/project.md` still reads `_Not yet surveyed._` when a work item opens, you
  skipped op-init — run it first, then return.
- **Claiming an external tracker without a live tool.** Writing `"tracker": "github"` when the host
  has no GitHub MCP tool makes every later mirror call fail. Verify with a read call first; if it
  fails, stay on `markdown` and report what to connect.
- **Treating the tracker as the source of truth.** It is a mirror — the local `workitem.md` and
  `op.mjs` remain authoritative (constitution `## Tracking`). Never move a stage by editing a GitHub
  or Linear issue; only the gate checker advances state.
- **Guessing the repo or team.** Confirm `owner`/`repo` (GitHub) or the team (Linear) with the
  operator, and match it against a real read call — a wrong target mirrors work items into the wrong
  place. Never invent one from the directory name.
- **Bloating project.md past its cap.** The survey is durable facts, not a tour. Over 120 lines
  fails a doctor check and stops loading cleanly — keep it dense.
