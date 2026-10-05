# Implementation tickets

- LOOP-1: Add contract validation and persistent execution state. Require spec, tickets, criteria, check commands, adapter, and bounded budgets. Verify invalid contracts, dependency cycles, contract changes, and locking.
- LOOP-2: Add execution and correction loop. Depends on LOOP-1. Verify checks, sequential reviews, evidence, failures, stale snapshots, budget stops, and resume with injected runners and a real subprocess adapter.
- LOOP-3: Expose the CLI and update routing. Depends on LOOP-2. Keep Understand and ticket approval, add automatic Build progression, document adapter protocol, and verify CLI exit behavior and package contents.

All tickets are implemented. Acceptance criteria remain above; their validation evidence is recorded in `docs/features/implementation-loop.md` and the behavioral tests at `src/test/loop.test.mjs` and `src/test/cli.test.mjs`.
