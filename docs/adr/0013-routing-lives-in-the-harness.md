# ADR-0013: Natural-language routing lives in the always-loaded harness, not a router skill

- Status: superseded by ADR-0021
- Date: 2026-07-15

## Context

The operator should describe work in plain language and have Operator run the right procedure —
never stop to pick a skill. Routing was already partly automatic: every SKILL.md carries a
trigger-rich `description`, so on hosts with skill auto-discovery "login is broken" pulls `op-fix`
on its own. But that mechanism is host-dependent, and the always-loaded AGENTS.md block — the one
context every supported tool reads on every turn — carried only a 7-row lookup table. It omitted
the four `operator-*` expertise packs, had no "resume vs. new" or "advice vs. work" logic, and
read as a passive reference rather than an instruction that the agent itself is the dispatcher.

The obvious alternative was a dedicated `op-route` / `operator` router skill: a single named entry
point holding the full decision tree. It was rejected. A skill must be *invoked* to run, so a
router skill is circular — you would need to already be routing to reach it — and on
auto-discovery hosts it would compete with the very procedures it dispatches to, intercepting
requests that should trigger `op-new` or `op-fix` directly. It also breaks the ADR-0005 contract:
a router neither moves work-item state (`op-*`) nor advises (`operator-*`).

## Decision

The always-loaded AGENTS.md block **is** the router. Its `## Routing` section is rewritten as an
active instruction — *you are the router; the operator speaks in plain language; classify and
dispatch; never ask "which command?"* — covering resume-vs-new (via the item's `stage:` field or
`op-status`), all seven `op-*` procedures, the four `operator-*` packs as advice-not-state, and an
ambiguity default (route to `op-new`, which reroutes to `op-fix` when the work is a bug). The
complete decision tree, too long for the block's under-60-line budget, lives in the constitution's
`## Routing` section, of which the block is a summary. No new skill is added; the count stays 11.

## Consequences

- Routing is automatic on every supported host, not only those with skill auto-discovery, and
  requires zero skill-picking by the operator.
- The block grows but stays within its line budget; the constitution absorbs the full tree.
- The `op-*` / `operator-*` two-contract model (ADR-0005) is preserved — no third skill category.
- Expertise packs are now discoverable from the harness, closing a gap where "review this" or
  "is it secure?" had no routing entry.
