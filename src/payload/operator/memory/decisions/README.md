# Architecture Decision Records

One file per decision: `ADR-NNN-short-slug.md`, numbered sequentially, created from
`.operator/templates/adr.md`.

Rules:

- ADRs are **immutable once accepted**. To change course, write a new ADR that supersedes
  the old one, and update only the `Status:` line of the superseded file.
- op-plan files an ADR whenever a real alternative was considered and rejected — no ADRs
  for choices with no alternative.
- Every ADR cites its work item, so the full context is one hop away.
