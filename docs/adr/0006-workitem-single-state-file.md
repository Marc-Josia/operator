# ADR-0006: One workitem.md per work item is the whole state

- Status: accepted
- Date: 2026-07-14

## Context

Work must be resumable by any agent in any session on any tool. Candidate designs: a central
state file (merge conflicts, second source of truth), git-branch-as-state (couples the method
to a branching model), or per-item files.

## Decision

Each work item is a directory `.operator/work/NNN-slug/` whose `workitem.md` is the single
source of truth: flat frontmatter (`id`, `title`, `lane`, `stage`, `base`, `created`,
`updated`, `next`) + Problem / Triage / Scope / Tasks / Definition of done / **append-only
Journal** / Retro. Spec documents scale with lane as siblings. There is **no generated global
index** — status is derived by globbing frontmatter (`op.mjs status`).

## Consequences

- Resume = read one file. Merge-friendly because each item owns its directory. Git is the
  only history mechanism.
- Frontmatter must stay flat and machine-parseable without a YAML library (gate checker
  constraint). Gate evidence lives in journal lines, not nested frontmatter.
- Approvals, waivers, and escalations are journal lines — process erosion is visible in
  `git log`/`git blame`, which is the audit mechanism.
