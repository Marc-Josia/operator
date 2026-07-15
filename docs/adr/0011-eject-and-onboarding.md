# ADR-0011: Ship `operator remove` and first-run onboarding in v1

- Status: accepted
- Date: 2026-07-14

## Context

The design panel judge flagged two gaps all three designers missed: (1) no uninstall path —
without one, trying Operator is a one-way door, which suppresses adoption; (2) memory seeds
start empty, but most installs land in mature codebases, so memory starts useless.

## Decision

- `operator remove` cleanly deletes the managed block (preserving user AGENTS.md content),
  the eleven skills and their Claude mirror, and `.operator/` — **keeping `work/` and
  `memory/` unless `--purge`**, reverting only artifacts Operator itself created.
- Onboarding is agent-side, not CLI-side: `op-new`'s first step checks whether
  `memory/project.md` is still an unsurveyed seed and, if so, surveys the codebase (stack,
  commands, layout, quirks) and fills it before any other work. The CLI cannot analyze a
  codebase well; the agent can.

## Consequences

- Trying Operator is reversible; the eject path is tested.
- The first op-new in a project is slower by one survey; every later session starts warm.
