---
name: op-new
description: "Intake for all new work: restate the request, triage it into a lane (quick/standard/full) with the honest scorecard, create the work item, pass the intake gate, and route to op-plan or op-build. Use it whenever the operator asks for a feature, change, refactor, or chore that no existing work item covers — even a 'tiny' one-line request; all development work enters here. Bugs and regressions go to op-fix instead, which reproduces first and then comes back through this triage."
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
  exploratory — you cannot yet state the Problem or answer the scorecard — back up to
  `.agents/skills/op-discover/SKILL.md` first; it interviews the operator into a confirmed problem
  brief and hands it back here.
- The request is not a bug with known-good past behavior — those follow
  `.agents/skills/op-fix/SKILL.md`, which reproduces first and then triages through intake.
- You have read `.operator/constitution.md` (required when starting a work item).

## Steps

### 1. Ensure the project is set up (first run only)

Read `.operator/memory/project.md`. If it still reads `_Not yet surveyed._`, the project was never
onboarded: stop and run `.agents/skills/op-init/SKILL.md` first. It surveys the codebase into
memory, confirms the test command, and sets where work is tracked (markdown / GitHub / Linear) —
triage, scope, and the build gate all depend on that survey, and the tracker choice decides whether
this item is mirrored to an issue. Come back here once `project.md` is filled. If it is already
filled, continue.

### 2. Restate and clarify

Restate the request in your own words — one to three sentences: what changes, for whom, why.
Then ask only the questions whose answers would change the lane, the scope, or the approach.
Decide everything else yourself: pointless confirmation wastes the operator's time and violates
the autonomy policy. "Should the limit apply per user or per API key?" changes the design —
ask it. "Should I write tests?" never changes anything — the answer is always yes.

This is *light* clarification on an already-precise request, not problem discovery. If you cannot
even restate the request because it is genuinely vague or exploratory, you skipped a step: stop,
run `.agents/skills/op-discover/SKILL.md` to interview the operator into a shared problem, and come
back with its confirmed brief.

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
- One or two "yes", and "Touches protected paths?" is "no" → **standard** (`spec-lite.md`).
- Otherwise → **full** (`spec.md` with architecture and ADRs).
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

Honest: two "yes" → standard lane; a short spec-lite is written and approved before code, once.
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
   `op-plan: write the spec` otherwise), `{{first-task}}`. Leave the `project:` and `milestone:`
   frontmatter fields blank for standalone work; if you arrived here from op-roadmap, set `project:`
   to the roadmap id and `milestone:` to the milestone (e.g. `M1`) so op-status can roll the item up.
4. Fill the sections:
   - **Problem** — what is asked, in the requester's terms, and why it matters. 3–10 lines on
     the quick lane (it doubles as the acceptance criterion); shorter elsewhere — the spec
     document carries the detail.
   - **Triage** — the scorecard from step 3, plus one line naming the chosen lane.
   - **Scope** — the paths or globs the work is expected to touch, one per line. Declare
     honestly: files in the real diff that match nothing here fail `diff-within-scope` at the
     build gate. When the work grows beyond it, escalate — never silently widen.
   - **Tasks** — quick lane: write the full task list now (small, ordered, each verifiable).
     Standard/full: one seed task is enough (e.g. `- [ ] Plan: spec written and approved`);
     op-plan owns the task list and will rewrite it.
5. The instantiated Journal must contain exactly one line — append-only from here on:
   `- <YYYY-MM-DD> CREATED lane=<lane>`

### 5. Run the intake gate

Run `node .operator/bin/op.mjs gate <id>`. On pass, the checker itself appends the
`GATE intake PASSED` journal line and advances `stage:` — never write that line or move the
stage by hand; a self-asserted gate is exactly what iron rule 2 forbids. On fail, it prints
each failing check with its fix and changes nothing: fix the item, re-run.

### 6. Mirror the item to the tracker (external trackers only)

Read `tracker` in `.operator/config.json`. If it is `markdown`, skip this step — `tracker_ref:`
stays blank and no external call is made. If it is `github` or `linear`, mirror the work item to an
issue through that tracker's MCP tools (the constitution's `## Tracking` section is the authority —
mirror, never author):

- Create the issue: title = the work item title; body = a short summary (the Problem, the lane, and
  a pointer to `.operator/work/<id>/`). Take the target from `trackerConfig` (`owner`/`repo` for
  GitHub, `team` for Linear). If the operator named an existing issue for this work, link that one
  instead of creating a duplicate.
- Record the handle in frontmatter `tracker_ref:` — `github:#<number>` or `linear:<identifier>` —
  and journal `- <YYYY-MM-DD> TRACKER linked <handle>`. `tracker_ref:` is a convenience field the
  checker ignores (it tolerates unknown keys); editing it is not a stage transition.
- If the tracker's MCP tool is absent or the call fails, do not block intake: journal
  `- <YYYY-MM-DD> TRACKER create (deferred: <reason>)` and continue. The local work item is the
  source of truth; the mirror can be reconciled on the next op-init or by hand.

### 7. Route

Report briefly to the operator — item id, lane, gate output as proof, what happens next — then:

- **quick** → follow `.agents/skills/op-build/SKILL.md`. There is no spec stage; the Problem
  statement is the contract.
- **standard / full** → follow `.agents/skills/op-plan/SKILL.md` to write the lane's spec and
  get the operator's approval. Never start implementing before the spec gate passes.

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

On pass the checker sets `stage:` to `build` (quick) or `spec` (standard/full). If your
environment has no Node runtime, apply this checklist manually from `.operator/gates.json` and
append: `- <YYYY-MM-DD> GATE intake PASSED (manual) — evidence: <one line per check>`.

## Failure modes

- **`git rev-parse HEAD` fails** (no commits, or not a git repo) — `base-recorded` cannot pass.
  Ask the operator to initialize the repo or make an initial commit; never invent a sha.
- **Gate fails `workitem-sections`** — leftover `{{placeholders}}`, `TBD`, or template default
  text count as empty. Fill the sections and re-run; never edit `stage:` to move on.
- **Gate fails `protected-paths-lane`** — the work cannot travel the quick lane. Run
  `node .operator/bin/op.mjs escalate <id> --to standard` (or `full`); it appends the
  `ESCALATED` journal line and lists what to backfill. Then re-run the gate.
- **The operator insists on a lower lane than the rule gives** — de-escalation requires their
  quoted instruction: append `- <YYYY-MM-DD> WAIVER lane: operator said "<their words>"` before
  changing `lane:`. Never de-escalate on your own judgment; the caps still apply at build.
- **The request duplicates an open item** — resume the existing item (op-status shows the next
  action) instead of creating a twin; two items driving one change collide in the diff.
- **Mid-intake it turns out to be a bug** — switch to `.agents/skills/op-fix/SKILL.md`; a fix
  without a journaled reproduction is guesswork.
