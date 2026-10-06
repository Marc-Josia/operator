# Implementation loop

Operator keeps spec and approved tickets as required preparation. After implementation authorization, a persistent controller runs implementation, fixed project checks, Matt review, and Addy's production reviews without routine human relaunches. Findings return to implementation. Each correction starts a new verification round.

## Execution

`operator loop start --contract <file>` accepts a versioned contract referencing local spec and ticket files, acceptance criteria mapped to checks, dependency edges, an agent command, and explicit iteration/no-progress/process budgets. Remote tracker tickets use local snapshots retaining the original links. The controller rejects invalid contracts before starting a process and pins approved documents and installed skill instructions.

The configured agent receives a phase prompt on stdin and context/result paths in environment variables. A CLI that accepts stdin can run directly; other agents use a project adapter. An optional reviewer command starts review processes separately from implementation. The controller executes argv arrays without a shell. It preserves existing permissions and uses shipping as readiness review. External delivery requires separate authorization.

Completion requires evidence for every ticket criterion, successful controller-run checks, no unresolved findings, and sequential reviews on the same current Git snapshot. The snapshot covers HEAD, tracked files, nonignored untracked files, deletions, symlink destinations, and file modes. Ignored generated outputs and the reserved execution directory are excluded. A changed source snapshot makes historical completion stale.

## Trace and recovery

`temp/operator/<id>/approved.json` retains approved spec/ticket contents, dependency order, and installed skill instructions. `state.json` holds current phase, criterion evidence, check results, review evidence, failures, and iteration history. Each iteration retains prompts, structured reports, command outcomes, and stdout/stderr logs. Operator removal leaves these records intact.

`operator loop status --id <id>` reports freshness and returns success only for current completion. `operator loop resume --id <id>` restarts verification using the remaining budget. Changed contracts, approved documents, or skill instructions require a new id. Missing reports, process failures, absent skills, human decisions, stalled work, and exhausted budgets remain incomplete. Ctrl-C persists interruption and terminates the active process tree. A repository lock prevents concurrent loops in the same working tree.

Model reviews remain judgments rather than formal proofs. The controller validates report shape, ordering, process results, and freshness; it does not sandbox an agent with filesystem access.

## Ticket validation

- LOOP-1 is implemented by `src/lib/loop-contract.mjs` and persistent state in `src/lib/loop.mjs`. Tests cover missing spec/tickets, approval, dependency cycles, criterion/check mappings, immutable approved inputs, missing/changed skill instructions, and repository locking.
- LOOP-2 is implemented by the execution loop and process runner. Tests cover failing checks, review findings, invalid evidence, source changes during checks/reviews, restart, stale completion, bounded retries, timeout, and cancellation. An offline subprocess adapter exercises the full CLI path without a model service.
- LOOP-3 is implemented by the `loop` CLI commands and updated router/AGENTS payload. CLI tests cover flag combinations and success/incomplete/usage exits. The package includes both controller modules and the installed skill's execution reference.

The permanent [spec](implementation-loop/spec.md) and [tickets](implementation-loop/tickets.md) retain the approved scope and acceptance criteria. The [execution reference](../../src/payload/skills/operator/references/execution.md) defines the contract and adapter protocol.
