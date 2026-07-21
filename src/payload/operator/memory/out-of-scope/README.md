# Out-of-scope memory

One file per **rejected concept** — why the operator said no, so the reasoning survives the
session and the same idea is never re-litigated from zero. This directory records *rejections
only*; what was built lives in the code, and why it was built lives in `decisions/`.

Rules:

- **One file per concept, not per request.** Several requests for the same thing share one
  file: kebab-case name recognizable at a glance (`dark-mode.md`, `plugin-system.md`).
- **Matching is by concept similarity, not keyword** — "night theme" matches `dark-mode.md`.
  op-new checks here before the triage scorecard; on a match it
  surfaces the file and its reason to the operator. **The operator decides** — a recorded
  rejection is memory, never a veto. To reopen a concept, delete or rewrite its file.
- **Never record "already implemented".** A request closed because the behavior already exists
  is a built feature, not a rejected one — recording it would poison the check into refusing
  legitimate asks about existing behavior. Point to where the feature lives instead.
- **Reasons must be durable.** "Too busy right now" is a deferral, not a rejection — do not
  record it. Cite project scope, technical constraints, or a strategic choice.
- Files here are user-owned like the rest of `memory/`: never touched by `operator update`.
  No line cap applies; if the directory grows stale, prune concepts that no longer make sense
  by moving them to `../archive/`.

File format:

```markdown
# <Concept name>

One sentence: what this project deliberately does not do.

## Why this is out of scope

The substantive reason — scope, philosophy, technical constraint, or strategic choice.

## Escape hatches

What already exists that covers the underlying need, if anything.

## Prior requests

- <date or work item id> — "<the original ask, quoted>"
```
