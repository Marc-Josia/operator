# Operator architecture

Operator is a Node ESM CLI with zero runtime dependencies. The catalog describes upstream Matt Pocock, Addy Osmani, and pstack skills. Install/update/remove shell out to the skills CLI. Reference fetching, skill scanning, agent selection, and managed AGENTS block updates live in `src/lib/`.

The shipped `operator` skill is the only router. Understand remains collaborative through spec and approved tickets. The short AGENTS payload exposes the same map in consumer projects. Upstream skills remain unchanged.

The implementation controller adds a bounded execution path after user authorization:

- `src/lib/loop-contract.mjs` validates approved spec/tickets, dependency edges, criterion/check mappings, executable argv, and budgets. It loads installed project/global skill instructions and validates structured phase reports.
- `src/lib/loop.mjs` manages the repository lock, atomic state writes, approved snapshots, process execution, fixed checks, sequential reviews, retries, freshness, and interruption recovery.
- `src/bin/operator.mjs` exposes `loop start`, `loop status`, and `loop resume` alongside installation commands.
- `src/payload/skills/operator/references/execution.md` is installed with the router and defines the contract, agent adapter protocol, and incomplete states.

The controller launches a configured headless executable with a phase prompt on stdin and context/result paths in environment variables. It executes project checks itself. Review phases report findings without editing source; implementation makes corrections and restarts verification. Two reviews remain sequential: Matt Standards/Spec review, then Addy's production review after security, observability, and CI assessments. Shipping reviews readiness. External delivery follows separate authorization.

Execution records live in the consumer project's reserved `temp/operator/<id>/`. They retain approved documents, skill instructions, ticket evidence, process logs, and iteration history. Fresh completion requires all checks and reviews to match the same Git snapshot. Iteration budgets survive resume. The controller adds no agent SDK, service account, approval bypass, or runtime package dependency.
