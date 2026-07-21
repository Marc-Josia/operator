# ADR-0021: Operator is engaged explicitly with `/operator`, not always-on

- Status: accepted
- Date: 2026-07-21

## Context

ADR-0013 made the always-loaded `AGENTS.md` block the router: *you are the router; the operator
speaks in plain language; classify and dispatch*. Every natural-language turn was therefore an
Operator turn — the block instructed the agent to intercept the request, triage it, and drive it
through a work item. Combined with the trigger-rich `description:` on every shipped skill (which
auto-fires on hosts with skill auto-discovery), this meant that once Operator was installed the
plain code agent was gone: "the login crashes" pulled `op-fix`, "add a flag" pulled `op-new`, and
there was no way to just ask the agent a question or make a quick edit without the method engaging.

That was the intended behaviour at the time, but it costs the operator the ordinary coding-agent
relationship. Not every message wants a work item, a triage scorecard, and a gate — some want a
direct answer or a two-line change. An always-on router removes the operator's ability to choose
when the heavier method applies, and makes Operator feel like it took over the agent rather than
equipping it.

## Decision

We will make Operator **opt-in per request**. By default the agent behaves as a normal coding
agent and routes nothing. The method engages only when the operator's message starts with
`/operator` (or names Operator directly); everything after `/operator` is the plain-language
request the agent then classifies and dispatches, exactly as before. A bare `/operator` routes to
`op-status`. This reverses ADR-0013's *always-on* stance while keeping its core mechanism: the
router still lives in the harness, the constitution's `## Routing` section still holds the full
decision tree, and no router skill is introduced.

The engagement gate lives in two places, single-source-of-truth preserved: the always-loaded block
states the default-off / `/operator`-on rule and points to the constitution for the tree; the
constitution's Routing section opens with the same rule. Skill `description:` fields are left
trigger-rich (they help the router aim once engaged); the block's explicit "do not invoke
`op-*`/`operator-*` skills by default" instruction is what keeps them dormant — consistent with the
toolkit's stated enforcement model (instructions are context the model almost always follows).

## Alternatives considered

- **A real `/operator` slash command** (`.claude/commands/operator.md` plus a block fallback).
  Rejected: it adds a Claude-only distribution surface the installer, `doctor`, and `remove` would
  all have to manage, for a benefit that only materializes on one host. A textual `/operator`
  trigger recognized by the always-loaded block works identically across all five supported hosts
  with zero new surface.
- **A dedicated `operator` router skill.** Rejected for the same reasons ADR-0013 gave (a skill
  must be invoked to run; a bare `operator` name breaks the `^(op|operator)-` inventory regex and
  the op-*/operator-* two-contract model) — and it is unnecessary here, since the block already
  holds the trigger.
- **Neutering every skill's trigger-rich `description:`** so nothing auto-fires. Rejected as
  disproportionate: it rewrites all 14 skills, fights the "description = triggers" authoring rule,
  and the block-level suppression instruction already delivers the default-off behaviour.

## Consequences

- The always-loaded block is reframed: a default-off statement, the `/operator` engagement rule,
  and the router/iron-rules/system-documents summary "once engaged". It shrinks, staying well
  within its 60-line budget.
- `router.test.mjs` "coverage" no longer requires the block to name every shipped skill (the block
  points to the constitution instead); coverage is asserted against the constitution's Routing
  section and the README skills list. The ghost check and 60-line budget check are unchanged.
- `src/README.md` shows `/operator` in the quickstart and explains the default-off behaviour.
- No new skill, no change to `op.mjs`, `gates.json`, templates, or the installer; the skill count
  stays 14.
- Reversal cost is low: restoring always-on means putting the "you are the router" instruction back
  in the block and constitution and dropping the `/operator` gate — no data or format migration.
- ADR-0013 is superseded; its rejection of a router *skill* still stands (we add none).
