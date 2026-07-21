---
name: op-ship
description: "Review, deliver, and learn from a completed work item: fresh-context code review (plus security review when the diff touches protected paths), every finding fixed or waived, docs updated, memory harvested, retro written, review and ship gates passed. Use it when the build gate has passed and the operator says 'ship it', 'wrap up', 'deliver', or asks whether the work is done. The only path from build to done."
---

# op-ship — review, deliver, learn

## Purpose

Turn a built work item into a delivered one. Three things happen here and nowhere else: the
work is reviewed by fresh eyes, the project's documentation and memory absorb what was
learned, and the operator receives a report backed by gate-checker evidence. Skipping this
stage is how teams accumulate unreviewed code and repeat the same mistakes; op-ship exists so
that neither can happen silently.

## Entry criteria

- The work item is at `stage: review` — the build gate has passed (all tasks checked, tests
  green, diff within Scope). If the item is still at `build`, finish op-build first.
- You have read `.operator/constitution.md` and the item's `workitem.md` in this session.
- No other agent is active on this work item.

## Steps

### 1. Load the item and measure what shipped

1. Read `.operator/work/<id>/workitem.md` and the lane's spec document (`spec-lite.md` on
   standard, `spec.md` on full; the quick lane has none — the Problem statement and the
   Definition of done are the contract).
2. Regenerate the real diff from the frontmatter `base` sha: `git diff <base>` plus staged
   and untracked files. Review what actually changed, never what you remember changing.
3. Match every diff path against `protectedPaths` in `.operator/config.json`. Any match makes
   the security review mandatory in step 2 (the review gate checks for its journal line).

### 2. Run the fresh-context review

A review from your own working memory is worthless: you will read what you meant to write,
not what you wrote. The reviewer must reconstruct the work from disk.

- **If your host supports sub-agents:** spawn one reviewer sub-agent. Brief it with paths,
  not conclusions: the workitem path, the spec doc path, the `base` sha, and the instruction
  to follow `.agents/skills/operator-code-review/SKILL.md`. It reads the spec first, then the
  diff against the acceptance criteria, and returns findings in that pack's output format
  (`[severity] file:line — issue — why it matters — suggested fix`). It advises only — it
  never edits files or work-item state.
- **If it does not:** degrade per the constitution's table — re-read the spec document and
  the full diff from disk, fresh, then walk the code-review pack's checklist yourself as if
  the author were someone else.
- **Quick lane:** a fresh-eyes self-review is acceptable (still use a sub-agent if you have
  one). Review the diff against the Problem statement and the Definition of done, using the
  same pack.
- **If step 1 matched a protected path:** run a second, separate pass following
  `.agents/skills/operator-security-review/SKILL.md`, and journal it on its own line even
  when it finds nothing — the gate looks for the line, and "we checked, found nothing" is
  evidence too.

### 3. Resolve every finding, then journal the review

Every finding ends in exactly one of two states: **fixed**, or **waived by the operator in
their own words**. Never downgrade or silently drop a finding — that is asserting a gate
instead of passing it.

1. Fix blockers and majors. Fixes must stay within the item's Scope; a finding that needs
   out-of-scope work becomes a new work item (or an escalation if it blocks shipping this one).
2. Re-run the test command after fixes. A fix that breaks tests is not a fix.
3. For anything you will not fix, present it to the operator and journal their decision:

   ```
   - 2026-07-14 WAIVER review finding [minor] src/api/rate.ts:88 by operator: "acceptable, tracked in #142"
   ```

4. Append the review evidence lines the gate greps for — reviewer context, findings count,
   resolution:

   ```
   - 2026-07-14 REVIEW code (sub-agent) — findings: 3 (1 major, 2 minor); resolved: 2; waived: 1
   - 2026-07-14 REVIEW security (sub-agent) — findings: 0; protected paths: src/auth/session.ts
   ```

   Quick lane (the gate greps `REVIEW self`):

   ```
   - 2026-07-14 REVIEW self — findings: 1 minor (naming); resolved: renamed helper, tests re-run green
   ```

   With no sub-agent, write the context as `(fresh self)` — the journal must say how the
   review was actually performed.

### 4. Pass the review gate

Walk the Definition of done and tick each box only with the proof in hand — the checker
verifies the boxes, but you own their honesty. Then run:

```
node .operator/bin/op.mjs gate <id>
```

It checks review evidence (`REVIEW self` on quick; `REVIEW` plus `REVIEW security` when
protected paths were touched on standard/full) and that every Definition of done box is
checked. On pass it appends the journal line and advances the item to `ship`. On fail, do
exactly what each failing check names, then re-run.

### 5. Update the docs — or say why not

Ask: does anything a human reads describe behavior this change altered? README, API docs,
changelog, configuration examples, onboarding notes. Update what is stale, then journal one
of:

```
- 2026-07-14 DOCS updated: README.md (rate-limit config section), docs/api.md
- 2026-07-14 DOCS no-impact: internal refactor; no interface, behavior, or setup change
```

`DOCS no-impact:` always carries a reason — "no docs" is a decision, and decisions get
documented.

### 6. Harvest memory — at most three durable items

Scan the whole work item — surprises, corrections, decisions — and promote **at most three**
items that pass this test: *will this matter in three months to someone who was not here?*
The cap is the point: forced selection keeps memory dense enough to actually get loaded.

- A hard-won cause-and-effect → `L-NNN` in `.operator/memory/lessons.md`.
- A rule this project should always follow → `C-NNN` in `.operator/memory/conventions.md`.
- A durable fact every session needs (command, quirk) → the right section of
  `.operator/memory/project.md`.

Every entry cites this work item. Never memorize temporaries, intermediate states, or
anything already recorded. Then journal exactly one of:

```
- 2026-07-14 MEMORY harvested: L-007 (flaky ws test), C-013 (validate at boundary) (source: 003-rate-limiting)
- 2026-07-14 MEMORY none: mechanical dependency bump; nothing durable beyond the Retro
```

### 7. Fill the Retro

Write a few honest lines in the workitem's Retro section: what worked, what to improve,
what surprised you. No `TBD` — the ship gate rejects it. The Retro is the raw material;
the harvest is the refined output. Items not worth memory still belong here.

### 8. Garbage-collect memory if over caps

Compare each memory file's line count against `memoryCaps` in `.operator/config.json`. If any
file exceeds its cap: consolidate duplicates, promote lessons seen three times into a
convention, and move stale entries to `.operator/memory/archive/` — moved with their original
IDs, never deleted. The full consolidation procedure lives in
`.agents/skills/op-memory/SKILL.md`. The ship gate enforces caps on standard and full lanes;
on the quick lane, still gc when a file is visibly over — leaving it flags a doctor warning
for the next person.

### 9. Pass the ship gate

```
node .operator/bin/op.mjs gate <id>
```

It checks the `DOCS` line, the `MEMORY` line, the filled Retro, and (standard/full) memory
caps. On pass the item advances to `done`. Set the frontmatter `next:` to
`done — no further action`.

### 10. Close the tracker mirror (external trackers only)

Read `tracker` in `.operator/config.json` and the item's `tracker_ref:`. If `tracker` is `markdown`
or `tracker_ref:` is blank, skip this step. Otherwise close the linked issue through the tracker's
MCP tools: post the ship report (below) as a closing comment and set the issue to its done state
(GitHub: close as completed; Linear: move to a completed status). Journal
`- <YYYY-MM-DD> TRACKER closed <handle>`. If the tool is absent or the call fails, journal
`- <YYYY-MM-DD> TRACKER close (deferred: <reason>)` and continue — the item is already `done`
locally, and the mirror can be reconciled later. Closing the issue reflects the passed gate; it
never causes it (constitution `## Tracking`).

### 11. Report to the operator

Report in the constitution's order — accomplished, proof, decisions, remains — written for a
human discovering the work, not for a log file:

```
Shipped: 003-rate-limiting — Per-route rate limiting

Accomplished: token-bucket limiter on all public API routes, configurable per route.
Proof: ship gate passed (op.mjs output above); 42 tests green including 3 new; review
  found 3 findings, 2 fixed, 1 waived by you.
Decisions: in-memory buckets over Redis (ADR-004) — single-node deployment, revisit at scale.
Remains: #142 tracks the waived minor; nothing else open.
```

Never narrate internal reasoning, and never claim more than the gate output proves.

## Exit gate

op-ship crosses two gates, both via `node .operator/bin/op.mjs gate <id>`:

- **review gate** (after step 4): review evidence lines present for the lane, security review
  line when protected paths were touched, Definition of done fully checked. Advances
  `review → ship`.
- **ship gate** (after step 9, the exit of this procedure): `DOCS updated:`/`DOCS no-impact:`
  journaled with a reason, `MEMORY harvested:` (≤3 items)/`MEMORY none:` journaled, Retro
  filled, memory files within caps (standard/full). Advances `ship → done`.

The procedure ends only when the ship gate has passed and the operator has the report.

## Failure modes

- **A finding requires work outside Scope.** Do not widen the diff quietly. Small and
  in-spirit → escalate the lane and backfill. Genuinely separate → file a new work item and
  either fix-and-track or have the operator waive it here.
- **Reviewing from memory.** If you catch yourself reviewing without having re-read the spec
  and diff from disk (or without a sub-agent), stop and restart step 2 properly. A
  contaminated review that passes the gate is worse than no review — it launders unverified
  work as verified.
- **Fixing findings broke tests.** The review gate already passed dod, but never proceed to
  ship with red tests — re-run the test command after every fix and repair before step 5.
- **A protected path surfaces only now on a quick-lane item.** The build gate should have
  caught it; if it did not (path added during finding-fixes), stop, run
  `node .operator/bin/op.mjs escalate <id>`, backfill, and redo the review including the
  security pass.
- **More than three memory-worthy items.** Keep the three most durable; the rest stays in the
  Retro, retrievable later. The cap is your discipline, not a gate count — the gate only checks
  that a `MEMORY` line is present.
- **The gate fails.** Do exactly what the checker's failure output names — it prints the fix
  per check. Never edit or backdate journal lines to satisfy a grep; the journal is
  append-only and its history is the audit trail.
- **The operator is unavailable for a waiver.** The item stays at its current stage; journal
  `- <date> BLOCKED waiting on operator waiver for <finding>` and move to another work item.
