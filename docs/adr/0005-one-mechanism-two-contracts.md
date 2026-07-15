# ADR-0005: One skill mechanism, two contracts (procedures vs expertise)

- Status: accepted
- Date: 2026-07-14

## Context

The vision distinguishes SOPs (ordered process with gates) from Skills (expertise). At
runtime both are markdown loaded on demand; shipping them as different mechanisms doubles
lookup paths and the adapter surface. But the distinction itself prevents a real failure:
an agent finishing a checklist and believing it advanced the pipeline.

## Decision

Everything ships as SKILL.md, distinguished by name and contract:

- `op-*` — **procedures** (7: new, plan, build, fix, ship, status, memory): ordered steps,
  entry criteria, exit gates; the only skills allowed to move work-item state.
- `operator-*` — **expertise packs** (4: code-review, security-review, test-strategy,
  debugging): stateless advice consumed by a named procedure step; never write state.

`operator doctor` lints the invariant (an expertise pack instructing state changes is a bug).
Expertise graduates to its own pack only on demonstrated reuse (two consumers) or a 200-line
cap breach — architecture and documentation guidance therefore live inline in op-plan/op-ship
for v1.

## Consequences

- 11 skill directories instead of the ~20 in the first draft; no duplicated review content
  between a "validate SOP" and review skills.
- The SOP concept survives as the *contract* of op-* skills, not as a separate artifact type.
