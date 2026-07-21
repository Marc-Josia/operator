# ADR-0020: Operator is the harness only — spec authoring and expertise are pluggable

- Status: accepted
- Date: 2026-07-21

## Context

Operator had grown two layers with different natures. The **harness** — the always-loaded
router block, the constitution, the staged work items, the mechanical gates measured on the
real git diff, the capped memory — is what no other tool in the ecosystem provides: spec-kit's
"Constitution Checks" and `/speckit.analyze` are LLM prompts, OpenSpec's `validate` checks
document structure only, and the Pocock/Osmani skill collections verify nothing mechanically.
The **executive layer** — spec authoring (`op-plan` templates `spec.md`/`spec-lite.md`), the
project/exploration tier (`op-discover`, `op-explore`, `op-roadmap`, `roadmap.md`, `map.md`),
and the four `operator-*` expertise packs — duplicates, less well and with a permanent context
cost (14 skill descriptions loaded by model-invocation hosts), what dedicated ecosystems now do
better: GitHub spec-kit and OpenSpec for spec-driven development, mattpocock/skills and
addyosmani/agent-skills for expertise (Osmani alone covers all four pack domains).

Research confirmed the namespaces are disjoint (`.specify/` + `speckit.*`, `openspec/` +
`opsx:*`, `.operator/` + `op-*`; no skill-name collisions with either collection) and that the
single real contention point is routing: external procedural skills (`to-spec`,
`spec-driven-development`, `using-agent-skills`, `/speckit.implement`, `/opsx:apply`) each claim
to drive the workflow.

## Decision

Operator concentrates on the harness — architecture, rules, conventions, orchestration — and
**plugs into** external tools for everything else.

1. **Spec authoring is delegated.** `op-plan` authors the spec through the detected spec tool —
   spec-kit (marker `.specify/`) or OpenSpec (marker `openspec/`) — falling back to a single
   `templates/spec.md` when none is installed. The workitem frontmatter gains `spec:`, the
   artifact's path from the project root; the spec gate's new `spec-artifact` check is
   provider-aware: fallback-template specs are held to the template contract (sections filled,
   no TBD, numbered acceptance criteria — the old `spec-doc-sections` +
   `acceptance-criteria-present` checks merged), external artifacts must exist and be non-empty,
   their structure being their own tool's contract. The external artifact's directory is
   excluded from the measured diff, like `.operator/`. The operator's journaled `APPROVAL`
   remains the mandate regardless of who authored the spec.
2. **The project/exploration tier is removed.** `op-discover`, `op-explore`, `op-roadmap`, the
   `roadmap.md`/`map.md` templates, and the `projects/` state tier are deleted (supersedes
   ADR-0014, ADR-0015, ADR-0019). Vague requests are clarified through an installed
   discovery/interview skill when present, else by interviewing the operator; project-sized
   ambitions are decomposed through the spec tool or agreed slice lists, every slice entering
   `op-new` as its own gated work item.
3. **The expertise packs are removed.** The four `operator-*` skills are deleted; procedures
   consult installed third-party expertise skills (review, security, testing, debugging) and
   carry built-in baselines for when none exist (op-ship's review/security checklists, op-fix's
   debugging loop). The `op-*`/`operator-*` two-contract mechanism (ADR-0005) survives as
   `op-*` vs everything-else: only procedures move work-item state.
4. **Lanes collapse to two.** With spec depth now the external tool's concern, standard vs full
   had no material support; the triage rule becomes *all no → quick, any yes → standard*
   (amends ADR-0008; the quick lane, its measured caps, and one-way escalation are unchanged).
5. **Routing precedence is explicit.** The always-loaded block (ADR-0013) states that when a
   third-party skill's workflow conflicts with an active work item, the `op-*` procedure wins —
   external tools author and advise inside the procedures, never instead of them. One SOP per
   repo.
6. **Detection is passive and zero-dependency.** `op.mjs status`, the escalate hint, and
   `doctor` report detected markers (`.specify/`, `openspec/`, third-party skill directories).
   Operator never installs, removes, or configures another tool.

## Consequences

- The payload drops from 14 skills to 7 (`op-new`, `op-plan`, `op-build`, `op-fix`, `op-ship`,
  `op-status`, `op-memory`) and from 7 templates to 4 — roughly half the permanent description
  context load, and no more competing with the ecosystems users already adopt.
- Operator's pitch sharpens to its unique value: the only piece in the stack that measures the
  real diff, refuses unearned stage advances, and remembers — composable with any spec tool and
  any skill collection.
- Users without external tools lose the richer full-lane template and the guided
  discovery/roadmap procedures; the fallback template, built-in review baselines, and direct
  operator interviews are the floor.
- Work items created under the old schema (`project:`/`milestone:` frontmatter, `lane: full`,
  spec docs inside the item directory) need a one-line migration (`lane: full` → `standard`,
  set `spec:`); `op.mjs` rejects unknown lanes loudly rather than guessing.
- Supersedes ADR-0014 (discovery), ADR-0015 (project layer), ADR-0019 (exploration); amends
  ADR-0005 (two contracts → procedures vs external advice), ADR-0008 (three lanes → two).
