---
name: op-explore
description: "Navigate a confirmed problem whose path is still unknowable — too foggy to carve even a first milestone — by mapping the open decisions and resolving them one session at a time until the way clears. Arrive from op-discover when the brief is confirmed but unplannable, or from op-roadmap when M1 will not carve. Skip it when milestones are carvable (op-roadmap), when the problem itself is unconfirmed (op-discover), and for precise changes or bugs (op-new, op-fix). Exploration plans, never builds; it collapses into op-roadmap."
---

# op-explore — map the fog before planning

## Purpose

Give the fog a procedure. Between discovery and planning sits a case the pipeline did not cover:
the problem is confirmed, but the solution space is still unknowable — you cannot carve even the
first milestone as a demonstrable slice, because the decisions that would shape it are unresolved.
The work of the next sessions is not building; it is **resolving decisions** — researching facts,
prototyping throwaway answers, interviewing the operator — until the way clears. op-explore holds
that campaign's state: a **map** of decisions (`.operator/projects/<id>/map.md`) worked one
decision per session, under **fog of war** — decisions you can pose go on the map; decisions you
only sense wait in "Not yet specified" until you can pose them precisely.

Exploration plans; it never builds. Its endpoint is the **collapse**: when enough decisions are
resolved to carve the first milestone, hand off to op-roadmap, which writes the roadmap beside the
map. Like op-discover and op-roadmap, op-explore moves no work-item state and passes no mechanical
gate — the operator approves the map and the collapse, `op.mjs` is never involved.

## When to use — and when to skip

- **Use op-explore** when a confirmed problem (an op-discover brief, or an operator ask already
  clear in intent) resists planning: the shape of the solution hangs on decisions nobody can
  answer yet, and answering them needs research, prototypes, or operator judgement across more
  than one session.
- **Skip to op-roadmap** the moment milestones are carvable. If you can name a demonstrable M1
  and its slices, you are planning, not exploring — and if you *arrive* able to, exploration was
  never needed.
- **Skip to op-discover** when the problem itself is unconfirmed. Exploration navigates the
  solution space of a settled problem; an unsettled problem needs the interview first.
- **Skip to op-new / op-fix** for a precise change or a bug — the pipeline right-sizes those
  without any project layer.

The test between discover and explore: discovery ends when you can state the *problem*;
exploration ends when you can plan the *path*. One session of open questions after a brief is
normal planning friction — reach for op-explore when the unknowns clearly span sessions.

## Entry criteria

- A confirmed problem: an op-discover brief, or op-roadmap sent you back because M1 would not
  carve into demonstrable slices.
- You have read `.operator/constitution.md` and `.operator/memory/project.md`.
- No map already covers this — check `.operator/projects/`. If one does, resume it at step 2;
  never fork a rival map.

## Steps

### 1. Lay the map

Create the project directory if the effort has none (id = `NNN-slug`, next free `NNN` across
`.operator/projects/`) and copy `.operator/templates/map.md` to
`.operator/projects/<id>/map.md`. Then split what you know into two piles:

- **Decisions** — every open question you can *pose precisely*. Each gets one line: the question,
  a **type** — `research` (a fact will answer it; you resolve it AFK), `prototype` (a throwaway
  build will answer it; AFK), `grilling` (only the operator can answer it; HITL) — and its
  `blocked-by:` edges naming the sibling decisions that must resolve first (omit when it can start
  now). Phrase each as a question of behaviour and intent, never as paths or symbols of today's
  code — a decision may wait weeks for its session.
- **Not yet specified** — everything you only sense. The fog-of-war test is the sorting rule:
  *can you pose the question precisely?* — not "can you answer it?". A poser goes on the map; a
  hunch stays here until resolutions sharpen it.

Present the map to the operator and get an explicit approval, journaled — the analogue of the
roadmap approval. Exploration works only an approved map.

### 2. Work the frontier — one decision per session

Each session: re-read the map and the "Not yet specified" section, then take **one** decision from
the **frontier** — the decisions whose `blocked-by:` edges are all resolved. When several are open
the operator picks, or take the one that unblocks the most. One decision resolved per session is
the discipline (a reading discipline, not a gate): it keeps each resolution inside one fresh
context window and the operator in the loop between resolutions. Resolve by type:

- **research** — establish the fact yourself: codebase, docs, memory, web if your host has it.
  Facts are researched, not asked.
- **prototype** — build the smallest throwaway that answers the question, on a throwaway branch or
  worktree. **Spike code never ships**: the deliverable is the answer journaled on the map, never
  the code — no merge, ever. Spike code that turns out good re-enters through a normal gated work
  item after the collapse.
- **grilling** — run op-discover's interview mechanics on this one decision: one question at a
  time or frontier rounds, a recommended answer every time, facts researched not asked. Do not
  reimplement the interview; `.agents/skills/op-discover/SKILL.md` §3 is the reference.

### 3. Journal the resolution and update the map

A resolution is written before the session ends, or it never happened:

- Mark the decision resolved on the map and append one Journal line: the decision, the answer,
  the evidence (what the research found, what the prototype showed, what the operator said).
- A **structuring** resolution — one that fixes an architecture, a boundary, a hard constraint —
  becomes an ADR via `.agents/skills/op-memory/SKILL.md`, not just a map line.
- A direction the operator *considered and discarded* goes to `.operator/memory/out-of-scope/`
  via op-memory; deferrals do not.
- Re-test "Not yet specified": resolutions sharpen hunches. Promote every entry you can now pose
  into a decision with its edges; new hunches surfaced by the resolution go in.

The map's Journal is append-only, like a work item's.

### 4. Collapse — hand off, don't build

After each resolution, ask the collapse question: *can I now carve a demonstrable first milestone?*
When yes — typically while unresolved decisions still remain — stop exploring. Present the collapse
to the operator, journal their approval, set the map's `status: collapsed`, and route to
`.agents/skills/op-roadmap/SKILL.md`, which writes `roadmap.md` beside the map; decisions still
open move to the roadmap's "Risks & open questions", each deferred to the milestone that needs it.
Exploration's product is the cleared path, never code — resist finishing the fog by building
through it.

## The map document

The contract lives in `.operator/templates/map.md`: Problem (carried from the brief), Decisions
(typed, with `blocked-by:` edges and resolutions), Not yet specified, an append-only Journal, and
a living Progress summary. Frontmatter `status:` moves `exploring → collapsed` (`abandoned` if the
operator drops the effort).

## Relationship to the pipeline

op-explore sits between op-discover and op-roadmap and touches nothing mechanical. **A decision is
never a work item**: gates measure diffs, a decision has none — so decisions carry no lane, no
stage, no gate. `op.mjs` and `gates.json` are untouched. The only code exploration produces is
throwaway spike code that never merges; all shippable work enters the pipeline as gated work items
after the collapse.

## Exit

No mechanical gate. Exploration ends at the operator-approved collapse (`status: collapsed`) with
the handoff to op-roadmap — or at `status: abandoned` if resolutions convince the operator to drop
the effort (journal why; record discarded directions in out-of-scope memory).

## Failure modes

- **Exploring what you could plan.** If M1 is carvable, every mapped decision is planning theatre.
  Route to op-roadmap; the collapse question applies on entry too.
- **Building through the fog.** Shipping "just this part" before the collapse is freelancing
  outside the mandate. Hand off, don't build — the map's product is a cleared path.
- **The spike that ships.** Merging prototype code bypasses every gate. Journal the answer, leave
  the branch to die; good spike code re-enters through a gated work item.
- **Batch-resolving the map.** Draining five decisions in one stretched session loses the operator
  between resolutions. One decision per session; end by updating the map.
- **Hunches dressed as decisions.** A map line you cannot pose precisely is fog on the map — it
  blocks nothing and resolves never. Apply the fog-of-war test; keep hunches in Not yet specified.
- **Answering a grilling decision yourself.** A grilling type means the answer lives only in the
  operator's head; an agent that answers its own interview broke the type. Ask, recommend, wait.
- **The map frozen while resolutions land.** A resolution that never re-tests "Not yet specified"
  leaves the map stale. Every session ends by updating the map — that update *is* the deliverable.
