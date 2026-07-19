# ADR-0019: An exploration mode (`op-explore`) for confirmed-but-foggy projects

- Status: accepted
- Date: 2026-07-19

## Context

The pipeline covers the vague (`op-discover` converges on a problem brief within a session), the
large (`op-roadmap` carves milestones that are demonstrable vertical slices), and the precise
(`op-new`). A gap sits between the first two: **the problem is confirmed but the solution space is
still unknowable** — too foggy to carve even M1 as a demonstrable slice, too big for one session.
The work of the next several sessions is not building but *resolving decisions* (research,
throwaway prototypes, operator interviews) until the way clears. That case had no procedure and no
persistent state: the roadmap's "Risks & open questions" section is a passive parking lot, and
`op-discover` stops at the brief.

The `wayfinder` skill in `mattpocock/skills` names this shape: a map of decision tickets on the
tracker, a "fog of war" section for decisions sensed but not yet posable, one decision resolved
per session, and a collapse toward the spec once the path is clear. Its tracker publication does
not transfer (our state is local markdown, zero network — ADR-0015); the rest does.

## Decision

The operator settled seven points (2026-07-19); this ADR fixes them.

1. **A new `op-*` procedure, `op-explore`** — the 10th procedure, 14 skills total. Not a mode of
   `op-roadmap`: exploration precedes the ability to carve milestones, and folding it in would
   dilute op-roadmap's contract (milestone = demonstrable slice).
2. **Decisions are never work items.** Gates measure diffs; a decision has none. Forcing decisions
   into the pipeline would produce items stuck at `spec` forever or a "research lane" that weakens
   "gates are checked, not asserted". `op-explore` is a non-gated procedure of the same regime as
   `op-discover` and `op-roadmap`: the operator approves, `op.mjs` is untouched.
3. **The map lives at `.operator/projects/<id>/map.md`**, beside the future `roadmap.md` in the
   same project directory. The collapse writes `roadmap.md` next to it, and the exploration history
   stays visible. No new state location: `projects/` is already user-owned for `update`/`remove`
   (ADR-0015), so the installer does not change.
4. **The fog-of-war test.** A decision goes on the map when you *can pose the question precisely*
   — not when you can answer it. What is only sensed stays in a "Not yet specified" section until
   it can be posed; a re-read of that section opens every exploration session.
5. **Hand off, don't build.** `op-explore` plans and resolves decisions; it never builds product
   code. Its exit is the **collapse**: when the frontier of posable decisions is empty enough to
   carve M1 as a demonstrable slice, route to `op-roadmap`, which writes the roadmap in the same
   project directory.
6. **Spike code never ships.** A prototype lives on a throwaway branch or worktree; its
   deliverable is the answer journaled on the map, never the code. Spike code that turns out good
   re-enters through a normal gated work item after the collapse.
7. **One decision resolved per session** — a discipline stated in the skill, like the frontier of
   ADR-0018: a reading discipline, never a gate. It keeps each resolution inside one fresh context
   window and keeps the operator in the loop between resolutions.

**The map reuses ADR-0018's edge format.** Decisions carry `blocked-by:` on their own lines; the
workable set is the frontier (decisions whose blockers are resolved and whose question is
posable). Each decision is typed by how it resolves — **research** (a fact to establish — runs
AFK), **prototype** (a throwaway build answers it — AFK, under rule 6), **grilling** (only the
operator can answer — HITL, via `op-discover`'s interview mechanics, not a reimplementation).
Like ADR-0018, the format is markdown for agents: no parser, no mechanical test; a future tool
that consumes it brings its own parser and tests.

**Resolutions land where the memory design already points** (ADR-0010, ADR-0017): a structuring
resolution becomes an ADR via op-memory; a deliberately discarded direction goes to
`.operator/memory/out-of-scope/`; everything is journaled on the map, append-only.

**Durability binds the map** (same rule as the roadmap, item 06): decisions are phrased as
questions of behaviour and intent, never as paths or symbols of today's code — a map decision may
wait weeks before its session comes.

## Consequences

- Skills go from 13 to 14 (10 `op-*` + 4 `operator-*`); the two-contract model (ADR-0005) holds.
- The routing surfaces pinned by `router.test.mjs` — `agents-block.md` (within its 60-line
  budget), the constitution's Routing section, `src/README.md` — all name `op-explore`.
- `op-discover` step 6 gains a third handoff (confirmed but unknowable → `op-explore`);
  `op-roadmap` points back to `op-explore` when M1 cannot be carved. One sentence each — the
  detail lives in `op-explore` (single source of truth).
- A `map.md` template joins `.operator/templates/`. `map.md` frontmatter `status:` moves
  `exploring → collapsed` (`abandoned` if the operator drops the effort).
- `op.mjs`, `gates.json`, and the workitem template are untouched; no parser means no new test
  surface beyond the existing router-consistency tests.
