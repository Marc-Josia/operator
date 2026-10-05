# Implementation execution

Read this reference when the user authorizes implementation or asks to resume an implementation. Understand remains collaborative. Keep `to-spec` and `to-tickets`; a clear task still needs a spec and approved tickets. Start the loop after approval and implementation authorization, without asking again for each technical phase.

## Contract

Write a JSON contract in the consumer project, with the decisions from the approved spec and tickets. Set `approved: true` only when the user has approved them. Use a new id for a new contract. Paths resolve from the Git project root. Spec and ticket files must exist locally; for a remote tracker, save approved ticket content and its tracker link in a local file. Keep those input files intact throughout execution.

```json
{
  "version": 1,
  "id": "account-settings",
  "approved": true,
  "spec": "docs/changes/account-settings/spec.md",
  "tickets": [
    {
      "id": "SETTINGS-1",
      "path": "docs/changes/account-settings/ticket-1.md",
      "dependsOn": [],
      "criteria": [
        {
          "id": "settings-persist",
          "description": "Updated settings persist after reopening the account.",
          "checks": ["behavior"]
        }
      ]
    }
  ],
  "agent": { "command": "node", "args": ["tools/operator-agent.mjs"] },
  "checks": [
    { "id": "behavior", "command": "node", "args": ["--test", "tests/settings.test.mjs"] }
  ],
  "deprecation": false,
  "budget": { "maxIterations": 10, "maxNoProgress": 2, "timeoutMs": 900000 }
}
```

The executable in `agent` is a project-configured headless agent adapter, not a bundled executable. Configure it for the installed agent and its documented noninteractive interface. The sample `tools/operator-agent.mjs` is a placeholder path: implement or replace it before starting. An optional `reviewer` has the same command/args shape and can use a separate review agent. Without it, each review starts a fresh invocation of `agent`.

An installed Codex CLI can consume the controller's stdin prompt directly with `"agent": { "command": "codex", "args": ["exec", "-"] }`, as documented in the [official iterative repair example](https://developers.openai.com/cookbook/examples/codex/build_iterative_repair_loops_with_codex). Its existing configuration must permit writing the implementation and result file. Operator adds no permission-bypass flags. Validate the local CLI installation and authentication before starting; a missing executable or unsupported interface blocks the run.

Commands are argv arrays, executed without shell expansion. Shell quoting and pipes in an argument are literal text. Use an executable adapter for environments that need a shell wrapper. Choose checks from the project's actual tooling: behavioral tests, typecheck, lint, builds, or targeted security checks as appropriate. Every acceptance criterion must reference one or more required checks; these commands supplement the model's review evidence. Keep meaningful checks and acceptance criteria intact during fixes.

The ticket graph must be acyclic. Every criterion id is globally unique. The controller freezes the contract and spec/ticket contents, including budgets and check commands. It locates required project or global skill instructions, includes them in the phase context, and rejects missing, empty, or changed instructions. Set `deprecation` according to the approved scope. All review phases still run; a review can explain why a checklist item does not apply, without adding unrelated infrastructure.

## Adapter protocol

The controller launches the configured executable in the Git project root, sends the phase prompt on stdin, and adds these environment variables:

- `OPERATOR_CONTEXT`: absolute path to JSON containing the phase, contract, approved sources, dependency order, previous failures, repository snapshot, and result path.
- `OPERATOR_RESULT`: absolute path where the adapter's agent must write the JSON report.

The adapter forwards the prompt to the coding agent and waits for it to finish. It preserves permissions, makes no implicit tool approvals, and exits nonzero on a runtime failure. Its agent reads the project's AGENTS instructions and the phase's installed skill. Check the host's supported skill invocation mechanism; where explicit-only skills cannot be invoked by another skill, read and follow their instructions as part of the authorized task. Operator does not change upstream frontmatter.

A report has this shape:

```json
{
  "outcome": "pass",
  "evidence": "Specific reviewed files, observations, and check references.",
  "findings": [],
  "criteria": [
    {
      "ticket": "SETTINGS-1",
      "criterion": "settings-persist",
      "evidence": "Implementation location and behavioral test covering persistence."
    }
  ]
}
```

`criteria` is required for an implementation pass. Reviews need `evidence` and `findings`, not criterion reports. `fix` requires at least one unresolved finding with `id`, `summary`, and concrete `evidence`. `blocked` requires an actionable `reason`, such as the missing access or unresolved human decision. A `pass` cannot contain unresolved findings. The controller rejects missing or malformed reports, and independently executes the required checks.

## Run and resume

Use the Operator executable available in the consumer project, for example:

```bash
operator loop start --contract docs/changes/account-settings/execution.json
operator loop status --id account-settings
operator loop resume --id account-settings
```

If Operator is installed through `npx`, use the same package entrypoint with those arguments. The CLI emits phase progress without asking for a reply. A successful start/resume exits 0 only after current completion; incomplete states exit 1 and usage errors exit 2. Status exits 0 only for a fresh completed run.

Each correction round runs `implement`, required commands, Matt `code-review`, then `security-and-hardening`, `observability-and-instrumentation`, `ci-cd-and-automation`, Addy `code-review-and-quality`, optional `deprecation-and-migration`, and `shipping-and-launch`. Shipping is readiness review; merge, push, publish, and deploy require separate authorization. Review phases are read-only; modifications return to implementation and restart verification. A human decision already settled in the approved documents uses that answer; an unresolved decision returns `blocked`.

The Git snapshot covers HEAD, tracked files, nonignored untracked files, deletions, symlink targets, and file modes. Generated ignored outputs and the reserved `temp/operator/` directory are excluded. Keep implementation inputs outside this reserved directory. Required checks and every review must refer to the same unchanged snapshot. Source changes after completion make status `stale`. Resume reruns verification within the remaining iteration budget. Contract or spec/ticket changes require a new approved contract and run id.

Artifacts live in `temp/operator/<id>/`: approved spec/ticket snapshots, current state, iteration history, prompts, structured reports, and process logs. These records retain the methodology and ticket evidence. They remain after completion and are not removed by `operator remove`. Keep or back them up according to the project's retention policy; logs may contain project data. Only one loop executes per Git working tree.

`maxIterations` counts correction rounds across resumes. `maxNoProgress` stops repeated identical failures after that many unchanged recurrences. `timeoutMs` limits each process, including each required check. Runtime failures and timeouts block rather than claiming completion. Ctrl-C persists an interrupted run and terminates the active process tree. Recovery checks the recorded child process before reusing a crashed controller's lock; a surviving process blocks a competing run. Resume retains all evidence and budgets. No-progress, budget exhaustion, unavailable checks, and new human decisions remain incomplete.

The controller verifies process results, ordering, report shape, and freshness. Review judgments and evidence text remain model-generated. This is a development control loop, not a sandbox against an agent with filesystem access or a guarantee that every possible bug is absent.
