---
name: op-new
description: "Intake for all new work: restate the request, triage it into a lane (quick/standard) with the honest scorecard, create the work item, pass the intake gate, and route to op-plan or op-build. Use it whenever the operator asks for a feature, change, refactor, or chore that no existing work item covers — even a 'tiny' one-line request; all development work enters here. Bugs and regressions go to op-fix instead, which reproduces first and then comes back through this triage."
---

# op-new — intake

## Purpose

Turn a request from the operator into a triaged, gated work item. Intake is where process gets
right-sized: the triage scorecard picks the lane, the work item becomes the single source of
truth, and the intake gate verifies the item is real before any planning or code. Everything
downstream — spec, diff measurement, review, ship — keys off what is created here.

## Entry criteria

- The operator asked for new work, and no open item in `.operator/work/` already covers it
  (check with `node .operator/bin/op.mjs status`).
- The request is precise enough to restate in one sentence and triage. If it is still vague or
  exploratory — you cannot yet state the Problem or answer the scorecard — clarify first: use an
  installed discovery/interview skill when the project has one, otherwise interview the operator
  yourself (one question at a time, recommended answer first) until the problem statement is
  confirmed, then come back here.
- The request is not a bug with known-good past behavior — those follow
  `.agents/skills/op-fix/SKILL.md`, which reproduces first and then triages through intake.
- You have read `.operator/constitution.md` (required when starting a work item).

## Steps

### 1. Survey project memory (first run in a project only)

Read `.operator/memory/project.md`. If it still contains `_Not yet surveyed._`, fill it before
anything else — triage, scope, and test expectations all depend on knowing the project:

- **Stack** — languages, frameworks, package manager, runtimes (from manifests and lockfiles).
- **Commands** — install, build, test, lint, run locally. Take them from manifests and CI
  config, not guesswork. If `.operator/config.json` has `"testCommand": null` and the survey
  found the test command, confirm it with the operator and write it into the config — the
  build gate cannot pass without it.
- **Layout** — the 5–10 directories that matter and what lives in each.
- **Environment quirks** — required env vars, ports, platform gotchas, slow or flaky steps.

Stay under the 120-line cap (`.operator/config.json`). If `project.md` is already filled, skip.

### 2. Restate and clarify

Restate the request in your own words — one to three sentences: what changes, for whom, why.
Then ask only the questions whose answers would change the lane, the scope, or the approach.
Decide everything else yourself: pointless confirmation wastes the operator's time and violates
the autonomy policy. "Should the limit apply per user or per API key?" changes the design —
ask it. "Should I write tests?" never changes anything — the answer is always yes.

This is *light* clarification on an already-precise request, not problem discovery. If you cannot
even restate the request because it is genuinely vague or exploratory, you skipped a step: stop,
clarify per the entry criteria (installed discovery skill, or your own structured interview), and
come back with the confirmed problem statement.

### 3. Triage into a lane

**Prior-rejection check first.** Scan `.operator/memory/out-of-scope/` (if it has entries) for a
concept this request overlaps — match by concept similarity, not keyword. On a match, stop and
surface it: name the file, quote the recorded reason, and ask whether the operator wants to
reopen. The record signals; **the operator decides**. If they stand by the rejection, add this
request to the file's `Prior requests` list and close the intake — no work item. If they reopen,
update or delete the file and triage normally. If instead the operator rejects *this* request
after triage discussion, record it there via op-memory (concept, reason, the quoted ask) — but
never record "already implemented": point to where the behavior lives instead.


Fill the Triage scorecard — every row gets a yes or no, no blanks, no "maybe":

| Question | Answer |
|---|---|
| Public interface or API change? | yes/no |
| Schema or data migration? | yes/no |
| Touches protected paths? | yes/no |
| New dependency? | yes/no |
| Hard to reverse? | yes/no |
| More than ~3 files expected? | yes/no |
| Crosses module boundaries? | yes/no |
| User-visible behavior change? | yes/no |

Lane rule (mechanical — apply it, do not negotiate with it):

- All "no" → **quick**. No spec document; hard caps of 3 files / 80 changed lines
  (`.operator/config.json`), enforced against the real diff at the build gate.
- Any "yes" → **standard**: a spec document is authored (op-plan, via the project's spec tool
  or the fallback template) and approved before any code.
- Protected paths (`.operator/config.json` `protectedPaths`) never travel the quick lane.

**Answer honestly — the scorecard is a prediction, the gates measure reality.** The build gate
runs `git diff` from the recorded `base` and checks the actual files and lines against the lane
caps and the declared Scope. A dishonest scorecard does not remove process; it defers it to the
worst moment. Worked example — request: "Add an `--json` flag to the CLI `status` command."

| Question | Honest | Dishonest |
|---|---|---|
| Public interface or API change? | yes — new documented flag | no ("just a flag") |
| Schema or data migration? | no | no |
| Touches protected paths? | no | no |
| New dependency? | no | no |
| Hard to reverse? | no | no |
| More than ~3 files expected? | no | no |
| Crosses module boundaries? | no | no |
| User-visible behavior change? | yes — new output mode | no |

Honest: two "yes" → standard lane; a short spec is written and approved before code, once.
Dishonest: all "no" → quick lane; the real diff lands at 4 files and ~120 lines (command,
formatter, tests, README), the build gate fails `diff-within-lane-caps` against the 3/80 caps,
and you must escalate mid-build, backfill the spec anyway, and re-plan. The gate failure prints
to the console and changes nothing, while the append-only journal permanently records the
`ESCALATED` line for the operator to read. Lying buys nothing: same spec, written later, plus
rework and a visible escalation record.

### 4. Create the work item

1. Choose the id `NNN-slug`: `NNN` = highest existing `NNN` in `.operator/work/` + 1,
   zero-padded to three digits (`001` in an empty directory); slug = 2–4 kebab-case words from
   the title. Existing `001-login-form`, `002-csv-export` → new item is `003-json-status-flag`.
2. Record the base: run `git rev-parse HEAD`. The build gate measures the diff from this commit,
   so `base` must point at a clean starting state — everything changed since `base` is attributed
   to this work item. Before recording it, make sure the working tree holds no unrelated pending
   changes; commit or stash them first. On the very first work item in a project this includes the
   Operator install itself: commit it (e.g. `git add -A && git commit -m "chore: install Operator"`)
   so the scaffolding does not show up in your work diff.
3. Copy `.operator/templates/workitem.md` to `.operator/work/<id>/workitem.md` and instantiate
   **every** `{{placeholder}}` — the gate checker treats leftover `{{…}}` as empty content, so
   none may remain: `{{id}}`, `{{title}}`, `{{lane}}`, `{{base-sha}}` (from step 2), `{{date}}`
   (today, `YYYY-MM-DD`), `{{next-action}}` (`op-build: implement the tasks` on quick,
   `op-plan: write the spec` otherwise), `{{first-task}}`. Leave the `spec:` frontmatter field
   blank — op-plan fills it with the spec artifact's path on the standard lane.
4. Fill the sections:
   - **Problem** — what is asked, in the requester's terms, and why it matters. 3–10 lines on
     the quick lane (it doubles as the acceptance criterion); shorter on standard — the spec
     document carries the detail.
   - **Triage** — the scorecard from step 3, plus one line naming the chosen lane.
   - **Scope** — the paths or globs the work is expected to touch, one per line. Declare
     honestly: files in the real diff that match nothing here fail `diff-within-scope` at the
     build gate. When the work grows beyond it, escalate — never silently widen.
   - **Tasks** — quick lane: write the full task list now (small, ordered, each verifiable).
     Standard: one seed task is enough (e.g. `- [ ] Plan: spec written and approved`);
     op-plan owns the task list and will rewrite it.
5. The instantiated Journal must contain exactly one line — append-only from here on:
   `- <YYYY-MM-DD> CREATED lane=<lane>`

### 5. Run the intake gate

Run `node .operator/bin/op.mjs gate <id>`. On pass, the checker itself appends the
`GATE intake PASSED` journal line and advances `stage:` — never write that line or move the
stage by hand; a self-asserted gate is exactly what iron rule 2 forbids. On fail, it prints
each failing check with its fix and changes nothing: fix the item, re-run.

### 6. Route

Report briefly to the operator — item id, lane, gate output as proof, what happens next — then:

- **quick** → follow `.agents/skills/op-build/SKILL.md`. There is no spec stage; the Problem
  statement is the contract.
- **standard** → follow `.agents/skills/op-plan/SKILL.md` to author the spec (via the project's
  spec tool when one is installed) and get the operator's approval. Never start implementing
  before the spec gate passes.

Invoke the next procedure as a skill if your host supports skills; otherwise read its SKILL.md
and follow it literally.

## Exit gate

`node .operator/bin/op.mjs gate <id>` at stage `intake` verifies:

- `workitem-sections` — Problem, Triage, Scope, Tasks non-empty; frontmatter parses; no TBD in
  Problem or Scope.
- `triage-scorecard` — every row answered yes/no and the chosen lane matches the lane rule.
- `base-recorded` — frontmatter `base:` resolves to a git commit.
- `protected-paths-lane` (quick lane only) — nothing in Scope or the diff matches
  `protectedPaths`.

On pass the checker sets `stage:` to `build` (quick) or `spec` (standard). If your
environment has no Node runtime, apply this checklist manually from `.operator/gates.json` and
append: `- <YYYY-MM-DD> GATE intake PASSED (manual) — evidence: <one line per check>`.

## Failure modes

- **`git rev-parse HEAD` fails** (no commits, or not a git repo) — `base-recorded` cannot pass.
  Ask the operator to initialize the repo or make an initial commit; never invent a sha.
- **Gate fails `workitem-sections`** — leftover `{{placeholders}}`, `TBD`, or template default
  text count as empty. Fill the sections and re-run; never edit `stage:` to move on.
- **Gate fails `protected-paths-lane`** — the work cannot travel the quick lane. Run
  `node .operator/bin/op.mjs escalate <id>`; it appends the `ESCALATED` journal line and
  names what to backfill. Then re-run the gate.
- **The operator insists on a lower lane than the rule gives** — de-escalation requires their
  quoted instruction: append `- <YYYY-MM-DD> WAIVER lane: operator said "<their words>"` before
  changing `lane:`. Never de-escalate on your own judgment; the caps still apply at build.
- **The request duplicates an open item** — resume the existing item (op-status shows the next
  action) instead of creating a twin; two items driving one change collide in the diff.
- **Mid-intake it turns out to be a bug** — switch to `.agents/skills/op-fix/SKILL.md`; a fix
  without a journaled reproduction is guesswork.
