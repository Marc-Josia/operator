---
name: op-memory
description: "Maintain Operator's durable memory in .operator/memory/ — three modes: record (capture a convention, lesson, or durable fact), consolidate (dedupe, promote repeated lessons into conventions, archive stale entries), and gc (enforce the line caps). Record the moment the operator corrects you or states a rule — 'always use X', 'we don't do that here', 'remember this' — corrections that wait for a gate get lost. Consolidate or gc when a memory file is at or over its cap or the ship gate's memory-caps check fails. Never for work-item state, specs, or transient notes."
---

# op-memory — record, consolidate, gc

## Purpose

Keep `.operator/memory/` worth loading. Memory is a strategic asset only while it stays dense:
a conventions file full of duplicates and dead rules stops being read, and knowledge that is
not read might as well not exist. This procedure is the single maintenance path for the capped
memory files — it captures durable knowledge in the exact formats the files define, and it
keeps them under their caps by consolidating and archiving, never by deleting.

Two rules make the asset trustworthy: every entry cites its source, so any rule can be traced
back to why it exists; and IDs are immutable, so references in old work items always resolve.

## Entry criteria

- Something durable-shaped needs recording (an operator correction, a rule, a hard-won lesson,
  a project fact), or a memory file is suspected or known to be over its cap.
- You have read the header comment of each memory file you will touch — the formats and write
  triggers live there and are the contract.
- This is not work-item state. Progress, approvals, and events belong in the item's journal;
  design decisions with alternatives belong in an ADR (op-plan's job).

## Write triggers — who writes memory, and when

Memory writes are gate-bound so they happen at natural harvest points instead of continuously.
This table is the whole policy:

| Trigger | Written by | What gets written |
|---|---|---|
| A real design decision (alternative considered and rejected) | op-plan, at the spec stage | an ADR in `.operator/memory/decisions/` |
| A non-obvious root cause | op-fix, when the fix lands | an `L-NNN` lesson in `lessons.md` |
| Ship-time harvest | op-ship, at the ship stage | at most 3 durable items (`L-NNN`, `C-NNN`, or a `project.md` fact) |
| Repeated failure on one item (the build gate forced a pause) | op-fix / op-build, when thrashing | a `postmortem-NNN.md` under the work item — a method postmortem, harvested to `L-NNN`/`C-NNN` at ship |
| **The operator corrects you or states a rule** | **op-memory record — immediately** | `C-NNN` or `L-NNN`, cited |
| The operator rejects a request or discards a direction | op-new (at triage) / op-discover (in the interview) | a concept file in `memory/out-of-scope/` |

The operator-correction row is the one exception to gate-binding: a correction is the most
expensive knowledge there is — the operator had to notice you doing it wrong — and one that
waits for a gate gets lost when the session ends. Record it the moment it lands, then return
to what you were doing.

## Steps

### 0. Choose the mode

- Something to capture now → **record**.
- Duplicates, stale entries, or a lesson pattern recurring → **consolidate**.
- A file over its cap in `.operator/config.json` `memoryCaps`, or the ship gate's
  `memory-caps` check failed → **gc** (which runs consolidate as its first move).

### Mode: record

1. **Apply the durability test first.** *Will this matter in three months to someone who was
   not here?* If not, do not record it. Never memorize temporary information ("the staging API
   is down today"), intermediate states, or conversation details — they age into noise that
   buries the entries that matter. And never store secrets or credentials in memory files:
   they are committed to git.

2. **Check for duplicates.** Search `project.md`, `conventions.md`, `lessons.md`, and
   `archive/` for the same knowledge. If it already exists, report the existing ID to the
   operator instead of writing — duplicated knowledge drifts, and the two copies eventually
   disagree. (If it exists but the operator's correction changes it, see the revision rule in
   consolidate step 3.)

3. **Classify and format.** Pick the destination by shape, and use the file's exact format:

   - **A rule this project must follow** → append to `.operator/memory/conventions.md`.
     Scope it with `paths:` when it only applies to part of the tree; a rule without `paths:`
     always applies. The reason is required — a rule with no why gets cargo-culted or ignored:

     ```
     C-014 (paths: src/api/**): Validate all request bodies with the shared schema helpers,
     because hand-rolled validation caused the injection bug fixed in 004-input-validation.
     ```

   - **A cause-and-effect learned the hard way** → append to `.operator/memory/lessons.md`:

     ```
     L-007: When editing the billing worker, run the integration suite locally first,
     because its CI job is stubbed and misses queue regressions. (source: 007-billing-retry)
     ```

   - **A durable fact every session needs** (a command, a port, a quirk) → the matching
     section of `.operator/memory/project.md`. No ID; keep it to a line.

   - **A decision among alternatives** → not this file. File an ADR from
     `.operator/templates/adr.md` per `.operator/memory/decisions/README.md`.

   - **A deliberate rejection** (the operator considered a request or direction and said no)
     → one file per concept in `.operator/memory/out-of-scope/`, per its README: the concept
     as a kebab-case filename, the durable reason, existing escape hatches, and the original
     ask quoted under `Prior requests`. If a file for the concept already exists, append the
     new request to its `Prior requests` list instead of creating a twin. **Never record
     "already implemented"** — a request covered by existing behavior is a built feature, not
     a rejection; recording it would poison the prior-rejection check. And never record
     deferrals ("not now") — only considered rejections. No ID, no line cap; these files are
     read by op-discover and op-new, and the operator can reopen a concept at any time by
     deleting its file.

4. **Number and cite.** Next `NNN` = highest existing number for that prefix across the live
   file **and** `archive/`, plus one — numbers are never reused, even after archiving,
   because old work items reference them. Every entry cites its source: the active work item
   id when there is one; for a correction made outside any item, cite the operator and date,
   e.g. `(source: operator correction, 2026-07-14)`.

5. **Append, check the cap, journal.** Append at the end — never insert, reorder, or renumber.
   Then compare the file's line count against its cap in `.operator/config.json` `memoryCaps`
   (defaults: project 120, conventions 200, lessons 150); if it is over, run consolidate now
   rather than leaving the debt to the next ship gate. If you are inside a work item, append
   to its journal:

   ```
   - 2026-07-14 MEMORY recorded: C-014 (validate at boundary) — operator correction
   ```

6. **Echo the entry back to the operator** in one line. A correction you misunderstood and
   recorded wrong will now misdirect every future session — one sentence of confirmation is
   the cheapest verification you will ever run.

### Mode: consolidate

1. **Read everything in scope**: `memoryCaps` from `.operator/config.json`, then `project.md`,
   `conventions.md`, and `lessons.md` in full. Consolidation done from a partial read merges
   the wrong things.

2. **Dedupe.** Entries stating the same rule or lesson merge into the one with the **lowest
   (oldest) ID**: fold the extra reasons and source citations into it, and move the newer
   duplicates to archive with a note (`merged into C-003, 2026-07-14`). The oldest ID survives
   because it has existed longest and is the most-referenced.

3. **Revise without rewriting history.** When a rule has genuinely changed (the operator
   corrected it, the codebase moved on), do not edit the old entry into its opposite — move it
   to archive with a `superseded by C-NNN` note and record the new rule as a fresh entry.
   `project.md` is the exception: it is a fact sheet, not a log — correct wrong facts in place.

4. **Promote lessons seen three times.** When three lessons (or one lesson confirmed by three
   work items' citations) point at the same underlying rule, the pattern is proven: write one
   `C-NNN` convention capturing the rule, cite the source lessons and their work items, and
   move the constituent `L-NNN` entries to archive with a `promoted to C-NNN` note. This is
   the pipeline from experience to law — it is why lessons are worth recording at all.

   The same rule applies to postmortems: when three postmortems point at the same method defect
   (a recurring blockage, not three unrelated bugs), the method itself is the problem. Promote it
   to a `C-NNN` convention that changes how the work is done — or, when it is structural, raise it
   with the operator as an ADR (a meta-postmortem that revises the method, not just a rule).

5. **Archive the stale.** An entry is stale when its `paths:` no longer exist, the practice it
   guards against is gone, or the fact is obsolete. Move it — never delete — by appending it
   verbatim to the matching file in `.operator/memory/archive/` (e.g. `archive/lessons.md`;
   create the file if missing) with one line noting the date and reason. **Original IDs are
   preserved**, per `.operator/memory/archive/README.md`, so references in old work items
   still resolve. Archived entries are never auto-loaded; they exist for archaeology.

6. **Verify:** nothing deleted, no ID reused or renumbered, every merged entry's citations
   carried over, every touched file at or under its cap.

### Mode: gc

1. **Measure.** Compare each memory file's line count against its cap in
   `.operator/config.json` `memoryCaps`. All under → report the counts and stop.

2. **Consolidate first.** Run the consolidate mode on any file over its cap — dedupe,
   promotion, and stale-archiving usually recover the space while *increasing* signal, which
   is strictly better than evicting good entries.

3. **If still over, evict to archive until under the cap.** Move the lowest-value entries —
   value order to keep, highest first: entries whose `paths:` match code under active
   development, operator corrections, then the most recently cited. Same mechanics as
   consolidate step 5: moved to `archive/` verbatim, IDs preserved, never deleted.

4. **Report** what moved and where each file now stands against its cap. The ship gate's
   `memory-caps` check (standard/full lanes) and the installer's `doctor` verify the same
   thing mechanically — gc is how you make them pass, not a substitute for them.

## Exit gate

op-memory is not a staged procedure: it moves no work-item stage, so there is no
`op.mjs gate` invocation of its own. Its exit conditions are checked by hand before you stop:

- [ ] Every touched memory file is at or under its cap in `.operator/config.json` `memoryCaps`
- [ ] Every new or merged entry cites its source (work item id, or operator + date)
- [ ] No ID was reused or renumbered; archived entries kept their original IDs
- [ ] Nothing was deleted — overflow and stale entries were moved to `.operator/memory/archive/`
- [ ] If working inside a work item, the `MEMORY` journal line was appended

The caps are also enforced mechanically after the fact: the ship gate's `memory-caps` check
fails standard- and full-lane items while any file is over, and `doctor` flags it between
items. Leaving a file over cap does not save work — it hands the same work to the next gate.

## Failure modes

- **Waiting for a gate to record a correction.** The gate-bound triggers exist for routine
  harvests; corrections are the exception by design. If the operator corrected you and the
  session ended before you recorded it, the knowledge is gone — record first, then continue.
- **Memorizing a temporary.** "The deploy is frozen this week" fails the three-month test.
  When it expires, someone has to notice it is wrong before trusting the file again — a stale
  entry costs more than the blank line it replaced.
- **Recording without checking for duplicates.** Two phrasings of one rule drift apart until
  they conflict, and then neither is trusted. Search first, including `archive/`.
- **Editing or renumbering existing entries.** IDs are load-bearing: old work items cite them.
  Changed rules get archived and re-recorded (consolidate step 3), never rewritten in place.
- **Deleting instead of archiving.** Deletion destroys the history that lets anyone ask "why
  did we stop doing X?". Moving is the same effort and keeps the answer.
- **An uncited entry.** A rule with no source cannot be challenged, verified, or safely
  archived — six months later nobody knows if it still applies. The citation is not
  bureaucracy; it is the entry's expiry-check mechanism.
- **Recording secrets.** Memory files are plain text in git. A credential in `project.md` is
  a leak, not a quirk — point to where the secret lives (env var name, vault path) instead.
- **Blowing past a cap "just this once".** The cap is what forces consolidation to happen at
  all; the file that is 10 lines over today is 300 lines over in three months, and then no
  session loads it. Run gc now — it is minutes, not hours.
