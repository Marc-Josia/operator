---
name: op-roadmap
description: "Decompose an effort bigger than one work item — 'build an app like Airbnb', a whole subsystem, a v2, or a problem op-discover confirmed as project-sized — into a Project: an ordered roadmap of milestones, each a demonstrable slice grouping issue-sized work items, approved by the operator, then fed to op-new one item at a time. Skip it for a single feature or quick change (op-new), for one already-scoped item's spec (op-plan), and for a bug (op-fix). The roadmap plans; every item it spawns is still gated by the normal pipeline."
---

# op-roadmap — decompose a project into milestones

## Purpose

Give large work a home above the work item. The pipeline's atomic unit is the work item — one
gated issue — and that is the right grain for *executing*. But "build something like Airbnb" is
not one issue; it is dozens, sequenced across phases. Without a layer above the work item, an agent
either freezes at the size of the ask or starts coding brick eleven before bricks one through ten
exist. op-roadmap is that layer: it turns an ambition into an ordered roadmap of **milestones**,
each a demonstrable slice, each holding **work items** that flow through the normal pipeline when
their turn comes. It is to a project what op-plan is to a single item.

A **Project** (`.operator/projects/<id>/roadmap.md`) groups **milestones**; a milestone groups
**work items** (`= issues`, unchanged). The roadmap is a planning artifact, approved by the
operator, not a gated work item: `op.mjs` never gates it, and it never bypasses a gate — every work
item it spawns is triaged and gated exactly as always.

## When to use — and when to skip

- **Use op-roadmap** when the effort is genuinely bigger than one work item: it spans multiple
  demonstrable milestones, bundles many features, or op-discover confirmed a problem too large to
  triage as a single intake.
- **Skip to op-new** when it is one feature or a quick change — even a substantial one that still
  fits a single work item. A roadmap for a one-item effort is ceremony the lanes exist to avoid.
- **Skip to op-plan** when a single, already-scoped work item just needs its spec.
- **Skip to op-fix** for a bug.

A few related work items on one theme do not automatically need a roadmap — three quick items are
often better run as three op-new intakes. Reach for a project when *sequencing and phasing* is the
hard part, not just the count.

## Entry criteria

- You arrive from `op-discover` with a confirmed problem brief for a large effort (the normal path),
  or the operator directly framed the ask as a project, or you are resuming/updating an existing
  roadmap.
- You have read `.operator/constitution.md` and `.operator/memory/project.md`.
- No project already covers this — check `.operator/projects/`. If one does, update it rather than
  forking a rival roadmap.

## Steps

### 1. Ground in the brief and the existing bricks

Start from the op-discover brief (the problem, success, constraints, out-of-scope) — do not
re-interview what is already settled. Then research what already exists: the modules, services,
data, and prior work items this project builds on or must not break — a roadmap that re-plans
what exists wastes everyone's time. Capture both in the roadmap's Vision and Existing bricks
sections.

### 2. Carve the milestones

Break the project into an ordered sequence of milestones. The discipline that makes this work:

- **Each milestone is a demonstrable vertical slice** — something you could show working
  end-to-end, not a horizontal layer ("all the database models"). M1 of an Airbnb-like app is
  "a host can create a listing and a guest can see it", not "the schema".
- **Order by dependency and value** — earliest milestones unblock the most and prove the riskiest
  assumptions. Ship a thin thing that works, then thicken it.
- **Plan near, sketch far.** Detail the next one or two milestones; leave later ones as a goal and
  a rough item list. False precision about milestone six is a lie you will re-plan anyway.
- **Give each milestone a "done when"** — the observable acceptance that lets the operator agree it
  shipped. A milestone with no demonstrable done-state is a bucket, not a milestone.
- **Expand–contract is the one named exception to vertical slicing.** A wide refactor — a rename,
  a schema migration, an internal API replacement whose blast radius spans the codebase — cannot
  land as a slice. Sequence it instead: *expand* (build the new beside the old, nothing breaks),
  *migrate* (move call sites over in batches sized by blast radius, each batch green alone because
  the old form still exists), *contract* (delete the old once no caller remains).

### 3. Break milestones into work items

Within each near-term milestone, list issue-sized work items — each the kind of thing that will
become one op-new intake and travel a lane. Three slice rules bound every item:

- **Complete but narrow** — the item cuts one full path through every layer it needs (data, logic,
  interface, tests), never one layer shared across items ("the models", "the endpoints").
- **Demonstrable alone** — once shipped, the item can be shown working without waiting for its
  siblings.
- **One fresh session** — the item fits a single agent working in one fresh context window. If it
  cannot, split it.

Before slicing a hard change, look for the **prefactoring** item — the small preparatory item that
makes the change easy, so the next item makes the easy change.

Describe each item by observable behaviour and contract — a roadmap item may wait weeks before it
is built, and the code it names will have moved by then. Good: "a guest can filter listings by
date range". Bad: "add `filterByDate()` in `src/search/filters.ts`". Durability binds the roadmap
only: a workitem's Scope and op-plan's Tasks cite real paths *by design* — the build gate measures
the diff against Scope — because they live hours, not weeks.

Declare each item's **blocked-by** edges: the sibling items that must ship before it can start,
named on the item's own line (`blocked-by: <item names>`); omit it when the item can start
immediately. Edges name roadmap items — never create work items just to point at them;
create-as-you-reach remains the law. You are naming the issues, not scoping them in detail; each
gets its real triage, scope, and (for standard/full) spec when op-new and op-plan pick it up. Keep
Sequencing for *cross-milestone* dependencies; intra-milestone order lives on the items.

### 4. Write the roadmap and get approval

Copy `.operator/templates/roadmap.md` to `.operator/projects/<id>/roadmap.md` (id = `NNN-slug`,
next free `NNN` across `.operator/projects/`, kebab slug from the title). Fill every section and
instantiate every `{{placeholder}}`. Then present the roadmap to the operator and get an explicit
approval — this is the project-level human gate, the analogue of op-plan's spec approval. Present
the breakdown as a numbered list — per item: what it delivers and its blocked-by edges — and ask
whether the granularity and the edges are right; iterate until they are. Journal the approval
in the roadmap:

```
- 2026-07-15 APPROVAL roadmap granted by operator: "yes, ship M1 first, defer payments to M3"
```

Set frontmatter `status:` to `active` once approved (`shaping` before). Do not create work items
against an unapproved roadmap — the operator owns the shape of the project, just as they own each
plan.

### 5. Kick off execution — one work item at a time

Work the **frontier** of the active milestone: the items whose blocked-by edges have all shipped —
an item with no edges is in the frontier from the start. Take one frontier item (when several are
open, the operator picks, or take the first listed) and route it to `.agents/skills/op-new/SKILL.md`.
It triages that item into a lane and creates `.operator/work/<item-id>/workitem.md` as always — with
one addition: set the item's frontmatter `project:` to this roadmap's id and `milestone:` to the
milestone (e.g. `M1`), so the item knows where it belongs and op-status can roll it up. Then the
item proceeds through op-plan/op-build/op-ship exactly as any work item does.

Do not fan out the whole backlog into work items at once. Create items as you reach them; an item
created months early is a scope guess that will be stale by the time you build it.

### 6. Maintain the roadmap as reality moves

The roadmap is a living document, not a cage. As work lands, keep it honest:

- When a work item ships (op-ship reaches `done`), tick it in the milestone and append
  `- <date> ITEM shipped: <item-id>` to the roadmap Journal; refresh the Progress section.
- When every item in the active milestone has shipped and its "done when" holds, append
  `- <date> MILESTONE shipped: M<n>` and start the next milestone (`MILESTONE started: M<n+1>`).
- When reality diverges from the plan — a milestone splits, an item turns out unnecessary, the
  order changes — **re-plan openly**: revise the milestones, present the change to the operator,
  and append `- <date> REPLANNED: <what changed and why>`. Never silently rewrite history; the
  Journal is append-only like a work item's.

## The roadmap document

The contract lives in `.operator/templates/roadmap.md`: Vision, Existing bricks, ordered Milestones
(goal + done-when + work items), Sequencing & dependencies, Out of scope, Risks & open questions, an
append-only Journal, and a living Progress summary. Frontmatter `status:` moves
`shaping → active → done`.

## Relationship to the pipeline

op-roadmap sits *above* intake; it does not replace it. The roadmap has no mechanical gate — like
op-discover, there is no work-item diff to measure — so it is approved by the operator, not by
`op.mjs`. Every work item it spawns still enters `op-new` and is gated through
`intake → spec → build → review → ship → done` in full. The project layer plans and sequences; the
gate machinery still guarantees each brick.

## Exit

There is no single gate. Shaping ends when the operator approves the roadmap (`status: active`) and
the first work item has been routed to op-new. The procedure then recurs at maintenance: advance
milestones, spawn the next items, re-plan when needed. The project reaches `status: done` when its
last milestone has shipped — record it and write a short project retro in Progress.

## Failure modes

- **Over-planning the far future.** Detailing milestone six now produces fiction. Plan the next one
  or two deeply; keep the rest coarse and revise as you learn.
- **Horizontal milestones.** "All the models", then "all the endpoints", then "all the UI" delivers
  nothing demonstrable until the end and hides integration risk. Slice vertically.
- **Fanning out the whole backlog into work items up front.** Early items are stale scope guesses.
  Create each item at op-new when you reach it.
- **Treating the roadmap as the spec.** It names and sequences work; it does not design solutions.
  Each item still gets its own spec via op-plan on standard/full lanes.
- **Skipping discovery.** Building a roadmap on an un-framed problem plans the wrong project
  confidently. If the problem is not yet confirmed, go back to op-discover first.
- **A roadmap for a single item.** If it is really one work item, you added a layer for nothing —
  route to op-new. The lanes already right-size a single change.
- **The roadmap frozen while reality moved.** A plan nobody updates becomes a lie. Re-plan openly
  and journal it; a living roadmap is worth more than a tidy dead one.
