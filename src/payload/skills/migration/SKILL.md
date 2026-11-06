---
name: migration
description: Use when old code, a feature, or an API is leaving, or when a production database schema changes (rename, drop, or retype a column or table), so it lands as expand/contract with no data loss or downtime.
---

## Mission

Move users and data from the old shape to the new one without losing data, breaking a consumer, or taking the product down. Trigger: old code, a feature, or an API is leaving, or a production database schema changes. Data is the one thing a code revert cannot bring back.

## Done when

- A schema change ships as separate deploys: expand (additive only), backfill, switch reads, contract. Old and new code are both valid against the schema at every step: the previous release's tests pass against the expanded schema.
- Every migration has a down path that was run on a copy: up, down, up.
- Backfills run in throttled batches off the hot path; row count and measured duration on a production-sized copy are in the report. Large indexes build without blocking writes.
- A backup or restore point exists before the first destructive step, and restoring it was tried once.
- The contract step (drop or rename) ships alone, after a code search finds no reference to the old shape and logs or metrics show zero reads of it. Until then it is its own ticket, with the condition that unblocks it.
- Removing code, a feature, or an API: current consumers are counted from usage data, not assumed; the replacement covers each of their uses; the count is zero before removal.
- After removal: old code, tests, docs, config, and flags are gone, and a search of the repo finds no reference.

## Never

- Rename, drop, or retype a column in place, or in the same deploy as the code that stops using it.
- Ship a schema change and the code that depends on it in one deploy.
- Run one unbatched update over a large table.
- Merge a migration whose down path was never run.
- Remove something that still has active consumers, or add features to what is leaving.

## Stop and ask

- Downtime or a read-only window: "Can users tolerate 5 minutes tonight where saving is disabled?" Recommend no: the change ships in steps with no downtime, unless that costs days.
- Something users or other teams rely on goes away: "<N> customers used export last month; OK to remove it on <date> and tell them now?" Recommend a notice period and a named replacement.
- Data would be lost for good: "The old notes field holds data for 120 accounts; keep an archived copy or delete it?" Recommend keeping a copy until the PM confirms nobody needs it.
- Any other choice (migration tool, batch size, dual-write method, flag): decide, list one line each, continue.

## Hand-off

- The change reaches users (each expand or switch step usually does): `ship`.
- Otherwise: the merge gate, then `retro`.
