# Operator

AI coding agents write good code and follow bad process. Left alone, an agent starts coding
before it understands the problem, claims "all tests pass" without running them, quietly turns a
two-line fix into a refactor, and forgets everything it learned when the session ends.
Experienced engineers get better results from the same models because they impose a method:
understand first, plan, build within a declared scope, verify with evidence, keep what was
learned. Operator packages that method as files in your repository so you do not have to re-type
it into every prompt.

Operator is the **harness**, deliberately not the whole method: it provides the architecture,
the rules, the conventions, and the orchestration — a staged pipeline, mechanical gates measured
on the real git diff, and durable memory — and it **plugs into the tools you already use** for
everything else. Spec authoring goes through your spec-driven-development tool when one is
installed ([spec-kit](https://github.com/github/spec-kit) or
[OpenSpec](https://github.com/Fission-AI/OpenSpec) are detected automatically); expertise
(code review, security, testing, debugging) comes from third-party skill collections such as
[mattpocock/skills](https://github.com/mattpocock/skills) and
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills). None of them verify
anything mechanically — Operator is the piece that measures, gates, and remembers; they are the
pieces that author and advise. Nothing external is required: every procedure has a built-in
fallback.

Operator is agent-agnostic. It works with any tool that reads `AGENTS.md` and skill files —
Claude Code, Codex, OpenCode, Cursor, Gemini CLI. You remain the tech lead (Operator calls you
**the operator**): you decide what gets built and approve plans. The agent follows written
procedures. A small script checks that the evidence behind each claim is real. You never pick a
skill — you describe what you want in plain language, and the always-loaded block classifies the
request and runs the matching procedure.

Concretely, `init` installs three things: a managed block (under 60 lines) injected into your
project's `AGENTS.md` between `<!-- operator:begin -->` / `<!-- operator:end -->` markers — it
never owns the file; a set of skills in `.agents/skills/` (mirrored into `.claude/skills/` for
Claude Code); and a `.operator/` directory holding a constitution, a machine-readable pipeline
(`gates.json`), document templates, capped memory files, and a zero-dependency gate checker
(`.operator/bin/op.mjs`). Work travels through staged **work items** in one of two **lanes**
(quick / standard) chosen by a mechanical triage scorecard. **Gates are checked, not
asserted**: `node .operator/bin/op.mjs gate <id>` verifies required sections, test exit codes,
and the measured git diff against the declared scope and lane caps, then appends a journal line
and advances the stage itself. There is no daemon, no service, no telemetry — only markdown,
JSON, and one dependency-free Node script, all committed to your repo. `remove` puts everything
back.

## Install

```sh
npx --yes github:MarcJosia/operator init
```

To pin a specific release instead of the latest `main`:

```sh
npx --yes "github:MarcJosia/operator#v0.3.0" init
```

Requirements: Node ≥ 18 (for the installer and the gate checker) and a git repository (the gate
checker measures diffs with git; `init` warns but does not fail outside one).

`init` detects your agent tools, asks for your test command (skip the interview with `--yes`,
preset the command with `--test-cmd "npm test"`), and writes:

```
AGENTS.md              managed block injected between markers; your content is untouched
CLAUDE.md              ensured to contain `@AGENTS.md` (only when Claude Code is detected)
.agents/skills/        7 op-* procedure skills
.claude/skills/        copy of the skills, for Claude Code (only when detected)
.gemini/settings.json  context file setting (only when .gemini/ already exists)
.operator/
  constitution.md      how the system behaves; agents read it when starting a work item
  gates.json           the pipeline: stages, lanes, and the checks each gate runs
  config.json          your knobs: test command, protected paths, lane caps, memory caps
  bin/op.mjs           the gate checker (single file, zero dependencies)
  templates/           work item, fallback spec, ADR, postmortem
  memory/              project facts, conventions, lessons, decision records
  work/                one directory per work item, created as you work
```

Commit all of it. The work-item journals in git history are your audit trail.

Note on npx caching: npx caches GitHub-sourced packages and does not refresh them automatically.
If you installed before and want the newest version, clear the cache first:

```sh
rm -rf "$(npm config get cache)/_npx"
```

## Five-minute quickstart

A realistic walk-through: adding per-IP rate limiting to a small Express API. Terminal output
below is abbreviated.

**1. Ask for the feature.** Open your agent tool in the project and say:

> Add per-IP rate limiting to the public API endpoints.

The managed `AGENTS.md` block routes this to the `op-new` procedure. The agent restates the
request, asks only the questions whose answers change the plan ("Which endpoints? What limit and
window?"), fills the triage scorecard, and creates `.operator/work/001-rate-limiting/workitem.md`:

```markdown
---
id: 001-rate-limiting
title: Per-IP rate limiting on public API endpoints
lane: standard
stage: intake
base: 4f2a91c
spec:
created: 2026-07-14
updated: 2026-07-14
next: author the spec and present it for approval
---

## Triage

| Question | Answer |
|---|---|
| Public interface or API change? | no |
| Schema or data migration? | no |
| Touches protected paths? | no |
| New dependency? | no |
| Hard to reverse? | no |
| More than ~3 files expected? | yes |
| Crosses module boundaries? | no |
| User-visible behavior change? | yes |
```

Two "yes" answers → **standard lane** (all "no" would be quick). The agent runs the intake
gate, which verifies the sections are filled, the scorecard is complete and consistent with the
lane rule, and `base` is a real commit.

**2. Review the plan.** The agent (now following `op-plan`) authors the spec — through
`/speckit.specify` if the repo has spec-kit, `/opsx:propose` if it has OpenSpec, or from
Operator's fallback template otherwise — records its path in the workitem's `spec:` frontmatter,
presents it, and **stops**. Nothing gets built until you answer. You reply:

> Approved — make the window configurable per route.

The agent records your words verbatim in the journal and runs the spec gate:

```
- 2026-07-14 APPROVAL plan granted by operator: "Approved — make the window configurable per route."
- 2026-07-14 GATE spec PASSED — evidence: spec-artifact ok; operator-approval ok
```

**3. Build.** Following `op-build`, the agent works the task list one task at a time —
implement, test, tick the checkbox, journal progress. When it believes it is done, it runs the
build gate. Suppose it got ahead of itself:

```
$ node .operator/bin/op.mjs gate 001-rate-limiting
FAIL tests-pass — `npm test` exited with code 1
     fix: make the test command pass, then re-run this gate
```

The gate refused and changed nothing — the agent cannot advance by asserting success. It fixes
the failing test and re-runs:

```
$ node .operator/bin/op.mjs gate 001-rate-limiting
PASS tasks-complete — 5/5 tasks checked
PASS tests-pass — `npm test` exited 0
PASS diff-within-scope — 4 files, all within declared Scope

gate build PASSED → stage is now review
```

The diff is measured from the recorded `base` commit — staged, unstaged, and untracked files
included — and compared against the Scope section the agent declared at intake. (The directory
holding the spec artifact is excluded, exactly like `.operator/` — authoring the spec is
spec-stage work.) Work that grew beyond scope forces an explicit, journaled escalation instead
of silent sprawl.

**4. Review and ship.** `op-ship` runs a fresh-context code review — with your installed
code-review skill when the repo has one, a built-in baseline otherwise, in a sub-agent where the
host supports it — journals the findings and their resolution, passes the review gate, updates
docs, harvests at most three durable items into `.operator/memory/`, fills the Retro section,
and passes the ship gate. The finished journal reads like a flight log:

```
- 2026-07-14 CREATED lane=standard
- 2026-07-14 GATE intake PASSED — evidence: workitem-sections ok; triage-scorecard 2 yes → standard; base-recorded 4f2a91c
- 2026-07-14 APPROVAL plan granted by operator: "Approved — make the window configurable per route."
- 2026-07-14 GATE spec PASSED — evidence: spec-artifact ok; operator-approval ok
- 2026-07-14 GATE build PASSED — evidence: tasks-complete 5/5; tests-pass exit 0; diff-within-scope 4 files
- 2026-07-14 REVIEW fresh-context: 2 findings, both resolved
- 2026-07-14 GATE review PASSED — evidence: review-evidence ok; security-review-if-protected n/a; dod-complete 5/5
- 2026-07-14 DOCS updated: README rate-limiting section
- 2026-07-14 MEMORY harvested: C-001 rate-limit windows are configured per route
- 2026-07-14 GATE ship PASSED — evidence: docs-updated-or-waived ok; memory-harvest 1; memory-caps ok; retro-filled ok
```

**5. Check state any time.**

```
$ node .operator/bin/op.mjs status
Spec tools detected: spec-kit (.specify/)
id                 lane      stage  next
001-rate-limiting  standard  done   —
```

The next session, in any agent tool, picks up exactly here — the work item, not the chat
transcript, is the source of truth.

## The method

```
request
   │  op-new: triage scorecard → lane
   ▼
quick:     intake ──────────► build ──► review ──► ship ──► done
standard:  intake ──► spec ──► build ──► review ──► ship ──► done

every ──► is a gate:   node .operator/bin/op.mjs gate <id>
quick-lane caps:       ≤ 3 files, ≤ 80 changed lines, no protected paths
escalation (one-way):  quick → standard, journaled, spec backfilled
```

**Lanes** right-size the process. The triage scorecard (eight yes/no questions in the work item)
picks the lane mechanically:

- **quick** — all answers "no". No spec document, but never skips verification. Hard caps on
  the diff (3 files, 80 changed lines by default) are enforced against the *measured* diff at
  the build gate, so an honest-looking triage cannot smuggle a large change through. Protected
  paths never travel this lane.
- **standard** — any answer "yes". A spec document with checkable acceptance criteria — authored
  through your spec tool or the fallback template — referenced by the workitem's `spec:`
  frontmatter, and your journaled approval before any code.

**Gates** are the exit checks of each stage. What each verifies (full list in
`.operator/gates.json`):

| Gate | Standard lane | Quick lane differences |
|---|---|---|
| intake | work-item sections filled, scorecard complete and lane-consistent, base commit recorded | also: no protected paths in Scope |
| spec | the `spec:` artifact exists (template contract enforced on fallback specs), `APPROVAL` line quoting the operator | skipped |
| build | all tasks checked, test command exits 0, diff within declared Scope | also: diff within lane caps, no protected paths |
| review | `REVIEW` line with findings and resolution, security review if the diff touches protected paths, Definition of done checked | self-review line instead of full review |
| ship | docs updated or waiver journaled, memory harvest (≤ 3 items) or `MEMORY none:` with a reason, memory files under caps, Retro filled | no memory-caps check |

**Skills** — 7 procedures, and only they may move work-item state: `op-new` (intake + triage),
`op-plan` (spec + approval), `op-build` (implementation), `op-fix` (bug, repro first),
`op-ship` (review + delivery + memory), `op-status` (read-only), `op-memory` (durable memory).
Anything else in your skills directories — a review checklist, a TDD guide, a debugging
procedure from a third-party collection — is expertise the procedures consult; it advises and
never touches stage, lane, or journal.

**Memory** makes lessons survive the session. `.operator/memory/project.md` (stack, commands,
quirks — surveyed automatically on first use), `conventions.md` (`C-NNN` rules, optionally
scoped to paths), `lessons.md` (`L-NNN`: when X, do Y, because Z), `decisions/` (immutable
ADRs), `archive/` (pruned, never deleted). Each file has a line cap so memory stays loadable.

## Integrations

Operator detects companion tools by their filesystem markers — no configuration, no network —
and uses them inside its procedures:

| Tool | Marker | What Operator does with it |
|---|---|---|
| [spec-kit](https://github.com/github/spec-kit) | `.specify/` | `op-plan` authors the spec via `/speckit.*`; the work item records `specs/<NNN-slug>/spec.md` in `spec:`; the spec gate verifies the artifact exists |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | `openspec/` | `op-plan` authors via `/opsx:propose` (validated by `openspec validate`); `spec:` records `openspec/changes/<name>/proposal.md` |
| skill collections ([mattpocock/skills](https://github.com/mattpocock/skills), [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), …) | directories in `.agents/skills/` | procedures consult them for review, security, testing, debugging, and discovery judgement |

Three rules keep the seams clean:

- **Operator never installs or removes another tool.** `doctor` and `op.mjs status` report what
  is detected; installing spec-kit, OpenSpec, or a skill collection is always your call.
- **One SOP per repo.** External tools author documents and advise; the `op-*` procedures decide
  when a stage is done. If a third-party skill's own workflow conflicts with an active work item
  (a spec tool offering to implement, a skill wanting to ship outside the pipeline), the
  procedure wins — gates are never optional.
- **Their formats are their contract.** The spec gate checks that an external artifact exists
  and is non-empty; its structure is validated by its own tool. Operator's template contract
  (sections filled, numbered acceptance criteria, no TBD) applies only to specs written from
  Operator's fallback template.

With nothing installed, everything still works: `op-plan` uses `.operator/templates/spec.md`,
reviews run against built-in baselines, and discovery falls back to interviewing you directly.

## Per-tool notes

| Tool | Instructions | Skills | Notes |
|---|---|---|---|
| Claude Code | `CLAUDE.md` is created (or checked) to contain `@AGENTS.md` | copy-mirror in `.claude/skills/` | the mirror is a copy, not a link — after editing a skill, run `doctor --fix` to re-mirror |
| Codex | reads `AGENTS.md` natively | reads `.agents/skills/` natively | Codex caps the instruction chain around 32 KiB; `doctor` warns at 24 KiB |
| OpenCode | reads `AGENTS.md` natively | reads `.agents/skills/` natively | — |
| Cursor | reads `AGENTS.md` natively | reads `.agents/skills/` natively | — |
| Gemini CLI | `contextFileName` in `.gemini/settings.json` is extended to include `AGENTS.md` | reads `.agents/skills/` | applied only when `.gemini/` already exists (or `--tools gemini`) |

Detection is automatic at `init`; override with `--tools claude,gemini`, or `--tools none` for a
generic install (managed block + skills + `.operator/` only). If nothing is detected, the Claude
Code adapter is applied anyway — it is the most common host — and `init` says so.

## Commands reference

### Installer (runs via npx, from the project root)

```sh
npx --yes github:MarcJosia/operator <command>
```

| Command | What it does |
|---|---|
| `init [--tools a,b] [--test-cmd CMD] [--yes] [--force]` | fresh install; refuses if `.operator/` exists |
| `update` | upgrade managed files in place (see [Updating](#updating--removing)) |
| `doctor [--fix] [--strict]` | health check: markers present, `CLAUDE.md` import intact, skills mirror in sync, managed-file drift, memory caps, work-item state consistency, config sanity, detected integrations. `--fix` repairs the mechanical issues; `--strict` exits 1 on warnings |
| `status` | same report as the gate checker's `status`, for convenience |
| `remove [--purge]` | uninstall (see [Updating](#updating--removing)) |
| `--version`, `--help` | what you expect |

### Gate checker (installed into your repo, used by agents)

```sh
node .operator/bin/op.mjs <command>
```

| Command | What it does |
|---|---|
| `status` | detected spec tools, table of all work items (id, lane, stage, next), the last journal lines of the active item, and the exact next action |
| `gate <id>` | run the current stage's checks for the item's lane. All pass → append the `GATE … PASSED` journal line and advance the stage. Any fail → print each failure with its fix, exit 1, change nothing |
| `escalate <id> [reason...]` | one-way lane raise (quick → standard); journals `ESCALATED <old> → <new> — reason: …` and prints which artifacts must be backfilled before the next gate |

The checker is a single file with zero dependencies, so it runs anywhere Node ≥ 18 exists —
including inside agent sandboxes.

## Customization

### `.operator/config.json`

| Key | Meaning |
|---|---|
| `testCommand` | the command the build gate runs. `null` (the initial value if you skipped the interview) makes the gate fail with instructions to configure it. `false` means "this project has no tests, and the operator has waived them" — the gate then requires a journaled `WAIVER tests` line quoting you |
| `protectedPaths` | globs (`**`, `*`, `?` supported) that never travel the quick lane and always trigger a security review at the review gate. Defaults cover auth, payments, migrations, secrets, CI workflows — edit to fit your project |
| `lanes.quick` | quick-lane caps: `maxFiles` (3) and `maxChangedLines` (80) |
| `memoryCaps` | max lines per memory file before `op-memory` must consolidate and archive |

`config.json` is yours: `update` never touches it.

### Memory

Edit `.operator/memory/` freely — it is your project's knowledge, not Operator's. Useful habits:
state corrections out loud ("remember: we never use default exports") and the agent records them
as conventions immediately; check `decisions/` into review like any other doc.

### AGENTS.md

Everything outside the `<!-- operator:begin -->` / `<!-- operator:end -->` markers is yours and
is never modified. Do not edit inside the block — `update` replaces it wholesale, and `doctor`
flags drift. Project-specific instructions belong in your own zones or in memory files.
Operator's block coexists with other tools' managed blocks (OpenSpec's
`<!-- OPENSPEC:START -->`, spec-kit's agent-context section) — each tool touches only its own
markers.

### Templates and skills

You may edit `.operator/templates/` and the skills, but section names in the templates are
load-bearing: the gate checker greps for them. `update` will not clobber your edits — it keeps
your version and writes the new upstream version next to it as `<file>.operator-new` for manual
merging.

## Updating & removing

```sh
npx --yes github:MarcJosia/operator update
```

For each managed file, `update` does a three-way comparison against the hashes recorded at
install time (`.operator/.installed.json`): unmodified files are overwritten, files you modified
are kept (new version written as `<file>.operator-new`), deleted files are restored. It never
touches `work/`, `memory/`, or `config.json`, replaces only the marked block in `AGENTS.md`, and
prints a full report. If npx served you a version older than the one installed, `update` warns
and prints the cache-clearing command instead of downgrading.

```sh
npx --yes github:MarcJosia/operator remove          # keeps work/ and memory/
npx --yes github:MarcJosia/operator remove --purge  # removes those too
```

`remove` deletes the managed block (your `AGENTS.md` content stays), the skill directories it
installed (including the `.claude/skills/` mirror — third-party skills are untouched), and
`.operator/` — except your work items and memory, which are kept unless you `--purge`.
`CLAUDE.md` is removed only if it is exactly the generated one-line import; in
`.gemini/settings.json` only the key Operator added is reverted. It prints what was kept and
why. Installed spec tools and their artifacts (`.specify/`, `openspec/`, `specs/`) are never
touched — they are not Operator's.

## What Operator can and cannot enforce

Be clear-eyed about this. No agent host can *force* a model to invoke a skill or obey
`AGENTS.md` — instructions are context the model almost always follows, not code it must
execute. Operator's design accepts that and works with it:

- **Compliance is the path of least resistance.** The routing table is always in context, every
  procedure ends in a single command, and templates mean the agent never has to invent
  structure. Following the process is genuinely less work than improvising.
- **Drift is visible, not impossible.** The gate checker refuses to advance a stage without
  evidence, and it — not the agent — writes the `GATE … PASSED` line. An agent that skips the
  process leaves fingerprints: no work item, no journal lines, no approval quote. `doctor`
  detects tampering with managed files, and the append-only journal sits in your git history.
- **Gates check facts, not quality.** They verify that sections are filled, tests exit 0, and
  the diff matches the declared scope. They cannot judge whether a plan is *good* — that is what
  the plan-approval stop is for, and it is the one moment that always requires you.

A determined agent (or human) can still edit files directly and bypass everything. Operator
raises the floor and makes erosion auditable; it does not replace your judgment.

## Troubleshooting

**`update` says the running version is older than the installed one.** npx cached an old copy of
the package. Clear it and re-run:

```sh
rm -rf "$(npm config get cache)/_npx"
npx --yes github:MarcJosia/operator update
```

**`init` refuses: `.operator/ already exists`.** The project is already installed — run `update`
instead. Use `init --force` only for a deliberate reinstall.

**The agent claims a gate passed, but there is no journal line.** Then it did not pass — the
checker writes that line itself. Run `node .operator/bin/op.mjs status` to see the real stage
and re-run the gate. This gap between claim and evidence is exactly what the checker exists to
expose.

**No Node runtime in the agent's environment.** The gate checker needs Node ≥ 18. Where none
exists, the constitution's fallback applies: the agent works through the gate's checklist from
`.operator/gates.json` manually and journals `GATE <name> PASSED (manual)` with the evidence
inline. Weaker than a mechanical check — treat those journal lines with more scrutiny.

**`gate` warns that the base commit is unresolvable.** The branch was rebased or the history
rewritten, so the `base:` recorded in the work item's frontmatter no longer exists. The checker
falls back to measuring only uncommitted changes and says so; expect scope and cap checks to see
less than the full change.

**The spec gate fails on `spec-artifact` after a spec-kit branch switch.** spec-kit creates a
feature branch per spec; if the artifact lives on another branch, the path in `spec:` will not
resolve. Check out the feature branch (or merge it) so the work item and its spec travel
together.

**Windows.** Everything runs on Node and git; the test command executes via `cmd /c` (via
`sh -c` elsewhere), so prefer cross-platform commands like `npm test`. Write Scope entries and
`protectedPaths` globs with forward slashes — they are matched against git paths, which always
use `/`.

**`doctor` warns AGENTS.md is large.** Warn at 24 KiB, error at 32 KiB — beyond that, Codex
truncates the instruction chain and other tools burn context. Trim your own zones, and move
project knowledge into `.operator/memory/` where it is loaded on demand instead of always.

**Skills changed but Claude Code does not see the change.** `.claude/skills/` is a copy of
`.agents/skills/`, not a symlink. Run `doctor --fix` to re-mirror.
