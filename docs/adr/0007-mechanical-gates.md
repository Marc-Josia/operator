# ADR-0007: Gates are checked mechanically by a runtime checker, not asserted

- Status: accepted
- Date: 2026-07-14

## Context

The core failure of prompt-only methodologies: agents claim compliance. Prose in context
cannot enforce anything; only artifacts and checks can. No host tool lets us hard-block a
non-compliant agent, but we can make honesty cheaper than fabrication.

## Decision

The pipeline is encoded once, machine-readably, in `.operator/gates.json` (stages, per-lane
checks, check descriptions). A zero-dependency, single-file runtime checker ships into user
projects at `.operator/bin/op.mjs` (`status` | `gate <id>` | `escalate <id>`). It verifies
required sections, operator-approval journal lines, test exit codes, and the **measured git
diff** (vs the item's recorded `base`) against declared Scope, lane caps, and protected
paths. On pass, the checker itself appends the journal line and advances the stage — the
agent never writes gate evidence by hand.

## Consequences

- Intake-time promises are never trusted; the diff is measured at the gate.
- The checker is real software with its own test suite (`src/test/gate.test.mjs`); its scope
  is deliberately capped at three subcommands.
- Environments without Node degrade to manual checklists journaled as `(manual)` — weaker,
  explicit, visible.
- Compliance remains behavioral at the outermost layer (an agent can refuse to run the
  checker); doctor's state-consistency check and the git-tracked journal make that visible.
  The README states this limit honestly.
