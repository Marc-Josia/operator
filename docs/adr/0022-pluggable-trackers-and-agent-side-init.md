# ADR-0022: Pluggable work trackers (mirror model) and an agent-side `op-init`

- Status: accepted
- Date: 2026-07-21

## Context

Two gaps sit next to each other.

**Onboarding is thin.** ADR-0011 put first-run setup agent-side, but only as a lazy paragraph
buried in `op-new` step 1 (survey `memory/project.md` if it is still a seed). The CLI `init`
interview asks for a test command and protected paths and stops. There is no moment where the
operator is walked through how this project will be run — the codebase surveyed, the test command
confirmed, and, crucially, **where the work will be tracked** — before the first work item opens.

**Tracking is markdown-only, by an earlier deliberate choice.** ADR-0015 decided the project
layer would be "local markdown only … to keep the toolkit agent-agnostic, zero-dependency, and
forge-independent; a GitHub adapter can come later if wanted", and closed with: "Live GitHub sync
is explicitly deferred; the local model mirrors the issue/milestone concepts so a future export
adapter has a clean source of truth." Many teams already run their work on GitHub Issues or Linear
and want Operator's method without a second, disconnected list of tasks in `.operator/work/`.

This ADR cashes in that deferred decision and attaches it to the onboarding moment where the
operator naturally chooses it.

## Decision

### 1. The local work item stays the source of truth; a tracker is a mirror

A configured **tracker** — `markdown` (default), `github`, or `linear` — decides where the
human-facing task lives and where status is published. It never becomes the state the method runs
on. In every mode the local `.operator/work/<id>/workitem.md` remains the single source of truth:
the triage scorecard, Scope, append-only Journal, and gate evidence live there, and
`node .operator/bin/op.mjs gate <id>` measures the real git diff to advance stages.

This is forced, not merely convenient: `op.mjs` is zero-dependency and **zero-network** (a
constraint of the constitution and ADR-0009), so the gate checker cannot read or advance state
that lives behind a GitHub or Linear API. A network-authoritative tracker would require rewriting
the entire mechanical-gate engine to be online — contradicting "gates are checked, not asserted"
the moment the network is down. So the tracker is a **mirror**: the agent, which does have network
and MCP tools, publishes the local truth outward at defined touchpoints. `markdown` mode makes
zero external calls and behaves exactly as today.

### 2. Sync is agent-side, at named touchpoints, and degrades gracefully

Mirroring is done by the `op-*` procedures using the host's MCP tools (the `github` / `Linear`
servers), never by `op.mjs`. The touchpoints are minimal and lifecycle-shaped:

- **create/link** — `op-new` and `op-fix`, once the intake gate passes, create (or link to an
  existing) issue on the tracker and record its handle in frontmatter `tracker_ref:`.
- **advance** — each gate passage publishes a short status note/comment (stage moved, evidence
  line) to the linked issue.
- **close** — `op-ship`, at `done`, closes/completes the linked issue with the ship report.
- **read** — `op-status` surfaces the `tracker_ref` link beside each item.

This reuses the constitution's existing "capabilities differ across hosts" contract: when the
tracker is `github`/`linear` but the MCP tool is absent or a call fails, the procedure records the
intended sync in the Journal and continues — the local gate is never blocked on an external
system. A dropped tracker call is a warning, not a failed gate.

### 3. Onboarding becomes an explicit agent-side procedure, `op-init`

A new `op-*` procedure — the 11th, **15 skills total** — owns first-run setup:

1. survey `memory/project.md` if it is still a seed (the work moved out of `op-new` step 1, which
   now delegates here; ADR-0011's intent, made a first-class step);
2. confirm the test command and protected paths in `config.json`;
3. **choose the tracker** — ask the operator markdown / GitHub / Linear; on an external choice,
   verify the MCP server answers (a read call), capture the target (repo for GitHub, team for
   Linear) into `config.json` `trackerConfig`, and degrade to `markdown` with a note if it does
   not connect.

Like `op-discover`, `op-roadmap`, and `op-explore`, `op-init` **moves no work-item state and
passes no mechanical gate** — it writes `config.json` and `memory/`, the operator approves. It is
run once after install (the CLI quickstart points at it) and is safe to re-run to change the
tracker later. The CLI `init` interview stays as the offline fallback for hosts without an agent
loop, but the agent, not the CLI, does the rich setup — the CLI cannot survey a codebase or reach
an MCP server.

### 4. `op-init` also sets a communication profile in `AGENTS.md`

The agent should not address a total novice and a staff engineer the same way, and not everyone
works in English. `op-init` asks the operator three things — **language**, **verbosity**, and
**operator expertise** (novice ↔ expert) — and writes them into `AGENTS.md`, because tone must apply
to *every* turn (plain chat included) and only `AGENTS.md` is always-loaded by every host;
`config.json`, read only on demand, cannot tune casual conversation.

It goes in a **second managed region** with its own markers
(`<!-- operator:profile:begin -->` / `<!-- operator:profile:end -->`), distinct from the router
block's, placed just after it. This keeps the promise that everything outside Operator's markers is
the user's: the profile is Operator's to manage, not smuggled into user prose. The markers cannot
collide with the block's (`BEGIN_RE`/`END_RE` match `operator:begin`/`operator:end` literally), so
`update` — which only replaces the block — **preserves** the profile as user data (like
`config.json`), and `remove` strips both regions. The constitution's `## Communication` section is
the authority on honoring it. Stack and routing are deliberately out of scope here: those live in
the always-regenerated block and the constitution, not in per-operator tuning.

## Consequences

- `op.mjs`, `gates.json`, and the lane machinery are **untouched**. `parseFrontmatter` already
  tolerates unknown keys (ADR-0015), so `tracker_ref:` needs no checker change, and the mechanical
  test surface is unchanged.
- Skills go from 14 to 15 (11 `op-*` + 4 `operator-*`); the two-contract model (ADR-0005) holds —
  `op-init` is a stateless-but-`op-*` procedure like `op-discover`.
- `config.json` gains `tracker` (default `"markdown"`) and `trackerConfig` (`{}`); both are
  user-owned, so `update` never overwrites them (ADR-0009).
- The router-consistency surfaces `router.test.mjs` pins — `agents-block.md` (within its 60-line
  budget), the constitution's `## Routing` section, and `src/README.md`'s Skills list — all name
  `op-init`. The block is already at budget, so its `op-init` line is added net-zero by tightening
  existing prose; the full tracking doctrine lives in the constitution (single source of truth),
  of which the block is a summary.
- The tracker doctrine is written once, in the constitution's new `## Tracking` section; the
  lifecycle skills reference it at their touchpoint rather than restating it (authoring rule 6).
- GitHub and Linear ship together because both MCP servers are first-class agent-agnostic targets;
  a third tracker later is a `trackerConfig` shape plus touchpoint prose, no engine change.
- Trying an external tracker is reversible: re-run `op-init`, pick `markdown`, and the local source
  of truth is already complete — the mirror was never authoritative.
- `AGENTS.md` now has two Operator-managed regions (block + `operator:profile`); `fsutil` gains
  `findProfileRegion`/`removeProfileRegion`, `remove` strips both, `update` preserves the profile,
  and the README documents the split. The block's line budget is unaffected — the profile is
  per-project content, never shipped in the payload.
