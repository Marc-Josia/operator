# ADR-0002: Inject a managed block into AGENTS.md; never own the file

- Status: accepted
- Date: 2026-07-14

## Context

AGENTS.md is the de-facto cross-tool rules file (verified mid-2026: Codex, OpenCode, Cursor
read it natively; Gemini via `contextFileName` setting; Claude Code via a `@AGENTS.md` import
in CLAUDE.md). Users have their own AGENTS.md content. Codex caps the concatenated rules
chain at 32 KiB. Always-in-context tokens are the scarcest resource in the whole design.

## Decision

Operator injects a **≤60-line managed block** between `<!-- operator:begin -->` /
`<!-- operator:end -->` markers, preserving all user content. The block carries only:
identity, five iron rules, the intent→skill routing table, and pointers to on-demand
documents. `operator update` rewrites only the block. `operator doctor` warns when the file
approaches the 32 KiB chain cap (24 KiB threshold).

## Consequences

- Everything else (constitution, procedures, expertise) is loaded on demand — enforcement
  cannot rely on prose being in context, hence mechanical gates (ADR-0007).
- Marker integrity becomes a doctor check; a deleted marker pair means manual repair.
