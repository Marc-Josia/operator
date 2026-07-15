# ADR-0016: A postmortem loop for repeated failure, and non-functional constraints in the spec

- Status: accepted
- Date: 2026-07-15

## Context

Two failure modes survive the current pipeline.

**Thrashing.** When a fix or a task resists, an agent tends to shotgun changes — try, fail,
try again — until the suite happens to go green, with no reflection on *why* the method stalled.
`op-fix` and `op-build` both warn against this in prose, but nothing counts the attempts and
nothing forces a pause. The lesson `L-NNN` mechanism captures a non-obvious *root cause of a bug*;
it does not capture a *root cause of a blockage* — the times the method itself was the problem.
The transcript that motivated this work named the discipline directly: after N failed attempts,
stop correcting the bug and run a postmortem on the method; when postmortems recur, revisit the
method itself.

**Unstated non-functional expectations.** The spec captures acceptance criteria (functional,
observable) and, on the full lane, an `Impact` table assessing the blast radius of *this* change.
Neither states the *constraints the result must satisfy regardless of the change*: a performance
budget, accessibility, internationalization (no hard-coded user-facing strings), no secrets in
logs. Left implicit, these leak — dark-on-dark text, untranslated fragments, 503s under load —
and there is no gated place to declare them so tests can hold them.

Both gaps are addressable within the toolkit's constraints (agent-agnostic, zero-dependency, no
network) and in the toolkit's own idiom — "gates are checked, not asserted" (ADR-0007).

## Decision

**1. A postmortem loop, mechanically gated on the build stage.**

- Two new append-only Journal events: `ATTEMPT <task> failed: <reason>` (the agent self-reports
  each failed fix/build attempt) and `POSTMORTEM <file>: <one line>` (recorded when a postmortem
  is written). Added to the `workitem.md` event vocabulary.
- A new template `postmortem.md` (a static document, like `adr.md`): Symptom, Attempts summary,
  Root cause of the blockage, Method fix, Follow-up. It is copied into
  `.operator/work/<id>/postmortem-NNN.md` the same way `op-plan` copies a spec.
- A new gate check `postmortem-if-thrashing`, added to the **build** gate for all three lanes
  (the common chokepoint where both `op-build` and `op-fix` close the build stage). It counts
  `ATTEMPT` lines recorded since the last `POSTMORTEM` line; when that count reaches
  `config.postmortemThreshold` (default **3**) it fails the gate, directing the agent to write a
  postmortem, journal `POSTMORTEM`, then escalate or ask the operator. The teeth are conditional
  on honest self-reporting of `ATTEMPT` — consistent with every other journal-grep check
  (`REVIEW`, `REPRO`, `DOCS`, `MEMORY`).
- `op-memory` gains **meta-promotion**: three postmortems pointing at the same method defect are
  promoted to a `C-NNN` convention (or an ADR when structural), the same pipeline that turns three
  lessons into a convention.

**2. A required `Non-functional constraints` section in both spec templates.**

- Added to `spec.md` (between `Rejected alternatives` and `Impact`) and `spec-lite.md` (after
  `Approach`). Each constraint is written as a measurable, testable met/not-met criterion; when
  there are none, the author writes an explicit `None — <reason>` (which counts as filled).
- Because `spec-doc-sections` is template-driven — it requires every `##` section of the spec to
  be non-empty and TBD-free — the section becomes gate-enforced **with no checker change**.
- `op-plan` documents how to fill it; `operator-test-strategy` notes that non-trivial NFRs
  (performance, secrets, i18n) map to tests through its existing `mapping:` return field.

## Alternatives considered

- **Postmortem as procedure only (no gate).** Lighter, like the roadmap's operator-approval. Rejected:
  the whole point is to interrupt thrashing an agent is, by definition, not noticing; a soft
  suggestion is exactly what gets skipped. A gate on the shared build chokepoint gives it teeth
  without a new stage.
- **A separate `op.mjs` subcommand to scaffold the postmortem file.** Rejected: specs are already
  created by copying a template by hand; a postmortem follows the same path, so no new command
  surface is warranted.
- **NFRs as an optional section.** Rejected: optional would require *exempting* the section from the
  template-driven `spec-doc-sections` check — i.e. adding code to weaken a gate. Required is both
  stronger and simpler, and `None — <reason>` keeps it satisfiable when there are no NFRs.
- **Folding NFRs into the existing `Impact` table.** Rejected: `Impact` assesses the effect of *this*
  change; NFRs are standing targets the result must meet. Conflating them loses both meanings. They
  sit adjacent with a cross-reference instead.

## Consequences

- Skills remain **13** — no new skill is added; the two-contract model (ADR-0005) is untouched. The
  changes live in existing `op-*` procedures (`op-fix`, `op-build`, `op-memory`, `op-plan`), two
  `operator-*` packs (advice only), the templates, `config.json`, `gates.json`, and `op.mjs`.
- `gates.json` gains one check id on the build gate (all lanes) plus its `checkDescriptions` entry;
  `op.mjs` gains one check function and one `CHECKS` entry. No stage machine changes.
- `update`/`remove` ownership is unchanged in spirit: the new `postmortem.md` **template** is a
  managed file (synced by `update`, removed by `remove`); the per-item `postmortem-NNN.md` documents
  live under `work/` and are never touched by `update`, like specs.
- `config.json` gains `postmortemThreshold` (default 3); setting it to `0` disables the check for
  projects that do not want it — the check treats a non-positive threshold as "off".
- Existing spec fixtures in the test suite must gain the new section, since it is now required. The
  build-gate tests are unaffected by default (zero `ATTEMPT` lines → the new check passes).
- Reversal cost is low: delete the check id from `gates.json`, the function from `op.mjs`, the
  section from the templates, and the events from the vocabulary; nothing else depends on them.
