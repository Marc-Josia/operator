# ADR-0018: Vertical-slice discipline and blocking edges on roadmap items

- Status: accepted
- Date: 2026-07-19

## Context

ADR-0015 added the project layer: a roadmap of milestones, each grouping issue-sized work items.
At the milestone grain the discipline was already firm — demonstrable vertical slices, ordered by
dependency and value. At the *item* grain it was not: `op-roadmap` said only "keep them vertical
and independently shippable where possible", and dependencies between items were "noted in
Sequencing" as free prose. Two failure shapes follow: horizontal items ("the models", "the
endpoints") or items too big for one session; and dependencies an agent cannot act on, because
they live in a paragraph rather than on the items they constrain.

The `to-tickets` skill in `mattpocock/skills` does this better: per-ticket vertical-slice rules,
per-ticket `blocked-by` edges, work driven from the *frontier* (tickets whose blockers are all
done), an *expand–contract* sequence for wide refactors that cannot slice vertically, and a
*prefactoring* reflex ("make the change easy, then make the easy change"). Those pieces translate
to our model; its issue-tracker publication and sub-issue links do not (our state is local
markdown, zero network, per ADR-0015).

## Decision

**Three slice rules bound every roadmap item.** An item (1) cuts a *complete but narrow* path
through every layer it needs — vertical, never one layer of many items; (2) is *demonstrable
alone* once shipped; (3) fits *one fresh session* — a single agent in a single fresh context
window. Before splitting a hard change, look for the **prefactoring** item that makes the change
easy first.

**Expand–contract is the named exception at the milestone grain.** A wide refactor — a rename, a
schema migration, an internal API replacement whose blast radius spans the codebase — cannot land
as a vertical slice. It is sequenced instead as *expand* (build the new beside the old), *migrate*
(move call sites in batches sized by blast radius, each batch green alone because the old form
still exists), *contract* (delete the old once no caller remains).

**Blocking edges live in `roadmap.md`, on the item lines — not in workitem frontmatter.** Each
item may declare `blocked-by: <sibling item names>`; omitted means it can start immediately. The
alternative — a `blocked-by:` key in `workitem.md` frontmatter — loses to two facts. First, the
roadmap sequences and the workitem executes: ADR-0015's create-as-you-reach law means most items
an edge points at do not exist as work items yet, so frontmatter would reference ids that cannot
exist. Second, by the time a work item is created its blockers are `done` by construction (that
is what the frontier means), so the field would be dead on arrival. Work items keep only their
existing `project:`/`milestone:` back-references. The edges name roadmap items; the roadmap's
Sequencing section is refocused on *inter-milestone* dependencies only.

**The frontier is a reading discipline, not a gate.** At any moment the workable items of the
active milestone are those whose blockers have all shipped. `op-roadmap` step 5 picks from the
frontier; `op-status` reports it. Nothing mechanical enforces it: ADR-0015 stands — the roadmap
is an operator-approved planning artifact, never gated by `op.mjs`, and this ADR does not touch
the checker.

**`blocked-by:` is markdown for agents, not a parsed format.** No tool parses the edges — op-status
reads the roadmap as prose like every other section. Therefore there is no parser and no mechanical
test for the format; if a future tool needs to consume the edges, that tool brings its parser and
the parser brings its tests.

## Consequences

- `op-roadmap` step 3 replaces "where possible" with the three slice rules, the prefactoring
  reflex, and the `blocked-by` declaration; step 2 gains expand–contract; step 5 works the
  frontier instead of "the first item".
- The roadmap template shows an item carrying `blocked-by:` and narrows Sequencing to
  cross-milestone ordering.
- The breakdown quiz `to-tickets` runs before publishing folds into the operator approval of
  step 4, which is already mandatory — presenting each item with its edges and what it delivers
  is now part of that presentation, not a new gate.
- `op.mjs`, `gates.json`, and the workitem template are untouched; no new test surface exists
  because no new code exists.
