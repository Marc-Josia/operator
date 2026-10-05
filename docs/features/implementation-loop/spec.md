# Implementation loop

Operator keeps Understand, spec, and tickets as the collaborative preparation lane. A user-authorized implementation starts a bounded execution loop. Skills remain upstream; Operator owns routing, state, and verification.

The loop reads an approved execution contract referencing an existing spec and tickets. It implements the ticket graph, executes fixed checks, runs Matt review, then Addy's production checks in order. Findings return to implementation. Completion requires current checks, ticket evidence, and all required reviews on the same repository snapshot.

State and per-pass artifacts survive restarts. A command adapter receives a prompt and writes a structured result. Operator runs commands without a shell and preserves the host's permission policy. Missing access, scope decisions, stalled work, command failures, and exhausted budgets produce an incomplete state with a reason.

Merge, publish, and deployment are outside the default contract. Shipping is readiness review. A model's review is recorded evidence, not a mathematical security guarantee.

Acceptance criteria:

- Spec and nonempty, acyclic tickets are required before any process runs.
- Fixed checks execute in the controller, rather than trusting agent success claims.
- Corrections invalidate prior verification and restart the sequence.
- Every ticket criterion references successful checks and has recorded evidence.
- Resume rejects a changed contract or changed spec/ticket content.
- Completion never follows a failure, missing report, stale snapshot, or budget stop.
- Router, distributed AGENTS block, and CLI describe the same implementation-only behavior.

The user approved this scope in chat and required retaining spec and tickets. The implementation and validation evidence are recorded in `docs/features/implementation-loop.md`.
