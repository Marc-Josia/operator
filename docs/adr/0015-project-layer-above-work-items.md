# ADR-0015: A project layer (roadmap → milestones) above work items

- Status: accepted
- Date: 2026-07-15

## Context

The pipeline's atomic unit is the work item — one gated issue, the right grain for *executing*
work. But an ambitious ask ("build something like Airbnb", "ship a v2") is not one issue; it is
dozens, sequenced across phases. The toolkit had no layer above the work item: `op-discover` could
frame such a request and at most flag "this is several problems", but nothing decomposed it into an
ordered plan. An agent facing a project-sized ask either froze at its size or started building
brick eleven before bricks one–ten existed.

Using the startup/GitHub analogy the operator raised: a company tracks **issues** grouped into
**milestones** under a **project/roadmap**. Our issue is the work item — that mapping holds. The gap
was everything above it.

## Decision

Add a **Project** layer, local markdown only (the operator chose local over live GitHub sync, to
keep the toolkit agent-agnostic, zero-dependency, and forge-independent; a GitHub adapter can come
later if wanted). Depth is deliberately lean:

- `.operator/projects/<id>/roadmap.md` — an ordered list of **milestones**, each a demonstrable
  vertical slice with a "done when", each grouping issue-sized **work items**. Named *Project* per
  the operator (distinct from `memory/project.md`, which holds durable facts about the codebase).
- New `op-roadmap` `op-*` procedure: after discovery, decompose the project into milestones and
  work items, get the operator's approval, then feed items to `op-new` one at a time. It is to a
  project what `op-plan` is to a single item.
- Work items gain optional back-references `project:` / `milestone:` in frontmatter, set when an
  item is spawned from a roadmap, so `op-status` can roll progress up by milestone.
- **Epics are an optional tag, not a level; sprints are omitted** — an AI agent has no fixed
  two-week cadence, so "the active milestone" is the unit of focus.

Like `op-discover`, the roadmap moves no work-item state and passes **no mechanical gate** — there
is no diff to measure, so the operator approves it, not `op.mjs`. The gate checker is untouched; the
`op-status` skill reads roadmaps for the rollup. Every work item a roadmap spawns still enters
`op-new` and is gated in full. The project layer plans and sequences; the gate machinery still
guarantees each brick.

## Consequences

- Skills go from 12 to 13 (9 `op-*` procedures + 4 `operator-*` packs); the two-contract model
  (ADR-0005) holds — `op-roadmap` is a procedure, like `op-discover` a stateless-but-`op-*` one.
- `remove` and `update` treat `.operator/projects/` as user-owned — kept on remove (deleted only by
  `--purge`), never written by update — alongside `work/` and `memory/`.
- Right-sizing is preserved: only genuinely multi-work-item efforts get a roadmap; a single feature
  still goes straight to `op-new`, and the three lanes right-size that.
- `parseFrontmatter` already tolerates unknown keys, so the new `project:` / `milestone:` fields
  needed no checker change.
- Live GitHub sync is explicitly deferred; the local model mirrors the issue/milestone concepts so a
  future export adapter has a clean source of truth.
