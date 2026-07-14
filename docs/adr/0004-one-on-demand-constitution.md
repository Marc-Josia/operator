# ADR-0004: One on-demand constitution; harness policy merged into it

- Status: accepted
- Date: 2026-07-14

## Context

The original vision named two kernel documents (constitution + harness). Both are read at the
same moment (work-item start), by the same reader, and cross-reference each other. Every
on-demand document is one more thing an agent can fail to load.

## Decision

Ship a single `.operator/constitution.md` (~180 lines): identity, ranked values, laws, the
method (stages/lanes/gates), state rules, orchestration policy with a per-capability
degradation table (sub-agents / skills / web / shell), memory protocol, autonomy,
communication. The always-loaded AGENTS.md block is its summary; the constitution states that
it wins on conflict.

## Consequences

- No separate harness.md, no separate role-card files in v1 — the reviewer brief lives inline
  in op-ship. Role cards can graduate to files if two consumers need them (same rule as
  expertise packs).
- The French constitution template is adapted and distilled, not shipped verbatim; identity
  content is kept because it measurably shapes agent behavior, poetry without behavioral
  consequence is cut.
