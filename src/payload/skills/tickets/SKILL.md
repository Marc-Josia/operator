---
name: tickets
description: Use when a spec exists without tickets, or the user asks to break a spec, plan, or conversation into work items. Opens the breakdown gate.
---

## Mission

Cut the spec into tickets the PM can see and try one by one, and that agents can build in parallel, each in its own worktree, without waiting on each other more than the work requires. The PM approves the breakdown before any build starts.

## Done when

- Every ticket is a vertical slice: once merged, the PM can see and try something new. Each states what the PM will see, how to try it (URL, screen, or command), and checkable acceptance criteria.
- Invisible work (infra, refactor, migration, setup) never stands alone; it rides inside the first slice that needs it. Too large to ride in one slice: its tickets share an integration branch that merges only with that slice.
- Each ticket fits one fresh agent session and names the spec it comes from.
- A blocking edge exists only where a ticket needs another's output (code, data shape, a decision), never for order or neatness. Two tickets that would rewrite the same files are merged or chained so their worktrees cannot collide.
- The dependency graph is shown (ASCII is fine), with the tickets that can start at once visible at a glance.
- The PM approved the breakdown. This is the breakdown gate.
- The tickets are where the AGENTS.md line under `## Project context` says ("Specs and tickets live in: …"), in dependency order, with native blocking links where the platform has them. No line: `docs/changes/<change-id>/tickets.md` next to the spec. Platform tool missing (no `gh`, no Linear MCP): local markdown, and the PM was told why in one line.

## Never

- Slice by layer (database ticket, API ticket, UI ticket), or ship a ticket the PM cannot try.
- Add a blocking edge you cannot justify by a concrete output the blocked ticket consumes.
- Put file paths or code in tickets, except a state shape or schema a prototype settled.
- Publish before the PM approved, or close or edit the parent spec or issue.

## Stop and ask

- The breakdown, as a numbered list (title, what the PM will see, blocked by) plus the graph. Recommend it as is or name the one change you would make. Ask only two things: is any slice too big or too small to try, and is the order of value right.
- A technical reason forces an order the PM did not expect: say it in one line, keep it unless they veto.

## Hand-off

- A UI or state-shape question is still open: `prototype`, then fold its decisions into the affected tickets.
- A new project or significant feature and the repo has no `CONSTRAINTS.md`: `constraints`.
- Otherwise: `implement`, which fans the tickets out to subagents in worktrees.
