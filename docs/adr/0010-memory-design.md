# ADR-0010: Four capped memory files with gate-bound write triggers

- Status: accepted
- Date: 2026-07-14

## Context

Unbounded memory rots: agents either load all of it (context waste) or none of it. Ad-hoc
writes produce duplicates and conversation residue. The design must answer *what agents load*
as much as *what they write*.

## Decision

`.operator/memory/` holds: `project.md` (durable facts, cap 120 lines — the only file
auto-loaded at task start), `conventions.md` (`C-NNN` rules with optional `paths:` scoping —
load only rules matching the files being touched, cap 200), `lessons.md` (`L-NNN`
trigger/action/reason one-liners, cap 150), `decisions/` (immutable ADR-per-file), and
`archive/` (pruned entries — moved, never deleted, never auto-loaded).

Writes happen only at gate-bound triggers: op-plan files ADRs; op-fix records lessons;
op-ship harvests ≤3 items; **plus one exception** — operator corrections are captured
immediately via op-memory, because corrections that wait for a gate get lost. Every entry
cites its source work item. GC (dedupe, promote 3×-seen lessons to conventions, archive
stale) is required by the ship gate when a file exceeds its cap; doctor enforces caps.

## Consequences

- Memory stays loadable and relevant after months; path-scoping answers "load the RIGHT
  memory".
- First-run value depends on onboarding populating `project.md` (ADR-0011).
