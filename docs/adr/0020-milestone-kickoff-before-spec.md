# ADR-0020: A milestone kickoff beat — detail a milestone before speccing its items

- Status: accepted
- Date: 2026-07-20

## Context

ADR-0015 put a project layer above work items: `op-roadmap` carves an ambition into ordered
milestones, each a demonstrable slice grouping issue-sized work items, and step 3 slices those
items "plan near, sketch far" — the next milestone or two in detail, later ones coarse on purpose.
ADR-0019 added `op-explore` for the case where the problem is confirmed but no milestone will carve
yet.

A beat was missing between them. When a milestone becomes active — the operator says "attack M1" —
`op-roadmap`'s execution step went straight to the frontier: grab an item, route it to `op-new`,
which triages and hands to `op-plan` for the spec. But the item lines being spec'd were carved at
roadmap-authoring time, deliberately coarse for a far milestone, against a codebase that has since
moved as earlier milestones shipped. The agent therefore wrote a spec for a sketch. Observed
symptom (operator, 2026-07-20): "when I ask it to attack milestone M1, it goes straight to writing
the spec; I expected an exploratory phase to define what the milestone actually contains first."

"Plan near, sketch far" already implies the near-detailing must happen *somewhere* — but nothing
named the moment. Without a named beat, the deferred detail was never picked up: the sketch was
spec'd as if it were plan-near work.

## Decision

A **milestone kickoff** beat in `op-roadmap`, run when a milestone becomes active and before any of
its items is routed to `op-new`. It is not a new skill and not a new gate — it is the "plan near"
pass of ADR-0015, relocated from roadmap-authoring time to milestone-start time, where the code it
plans against is real.

1. **Detail, don't jump.** Starting a milestone (M1, or the next when the previous ships) is its own
   step. The agent re-grounds in reality (re-reads goal and done-when, surveys what earlier
   milestones actually shipped), sharpens the milestone's work items by the behaviour each delivers
   and its `blocked-by` edges — splitting or merging as reality now shows — and only then spawns the
   frontier item. The old "kick off execution" step is split into **step 5 (detail the milestone)**
   and **step 6 (spawn items one at a time)**.

2. **The operator owns the milestone's shape.** The detailed item breakdown is presented and
   iterated until the granularity is right, then journaled on the roadmap
   (`MILESTONE started: M<n> — detailed: <item ids/names>`). This is the milestone analogue of the
   roadmap approval (ADR-0015) and the map approval (ADR-0019), at a smaller grain — approved, not
   mechanically gated. `op.mjs` stays untouched; the beat moves no work-item state.

3. **Right-sized, reusing `op-explore` for the heavy case.** A milestone that carves cleanly needs
   only the light pass — minutes, no new artifact. A milestone whose items will not firm up because
   unresolved decisions would reshape them is fog, not detailing: the beat escalates to `op-explore`
   (ADR-0019), which maps and resolves those decisions one session at a time and collapses back.
   This keeps a single mechanism for cross-session fog instead of inventing a milestone-scoped
   parallel to it. `op-roadmap`'s existing "planning through fog" pointer to `op-explore` becomes
   the escalation path of the kickoff.

4. **No new skill, no new state, no new gate.** The router surface (ADR-0013) is unchanged — no new
   `op-*` name, so `router.test.mjs` needs no new coverage row. The only new artifact a heavy
   kickoff produces is an `op-explore` map, which already exists. The beat lives entirely inside
   `op-roadmap`.

## Consequences

- `op-roadmap` gains a step: steps renumber to 5 (detail the milestone), 6 (spawn items), 7
  (maintain). Its Purpose, Exit, and Failure modes name the kickoff; a new failure mode names
  "speccing a sketched milestone".
- The always-loaded block (`agents-block.md`) gains, within its 60-line budget, one clause: starting
  a milestone details it before any item is spec'd, never straight to `op-plan`. The constitution's
  Routing section carries the full sentence (single source of truth, ADR-0013).
- The roadmap template's Milestones section notes the kickoff so authored roadmaps carry the
  reminder forward.
- No change to `op.mjs`, `gates.json`, the workitem template, or the installer; no new test surface
  beyond the existing router-consistency checks, which continue to pass because no skill was added.
