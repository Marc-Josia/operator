# ADR-0009: `update` syncs from the running package; ownership zones; no self-fetch

- Status: accepted
- Date: 2026-07-14

## Context

The panel judge recommended `update` self-fetch a pinned GitHub release tarball to defeat npx
cache staleness. That adds network code, checksum verification, and a second distribution
path to a zero-dependency CLI.

## Decision

`operator update` uses the payload of the **package it is running from** — the freshly
invoked `npx --yes github:Marc-Josia/operator#vX.Y.Z` *is* the new version; no network needed.
Staleness is handled by documenting pinned invocation and by `update` warning when its own
version is older than the project's installed version (with the exact cache-clearing fix).

Sync is a per-file three-way using `.operator/.installed.json` (sha256 at install time):
unmodified → overwrite; user-modified → keep user's file and write `<file>.operator-new`;
missing → restore. **Never touched:** `work/**`, `memory/**`, `config.json`. Only the marked
AGENTS.md block is rewritten. Adapters re-render idempotently on every update because host
formats churn.

## Consequences

- Zero network code, zero checksum infrastructure in v1; release integrity rides on GitHub/
  npm transport. Signed releases become relevant if/when an npm channel ships (ADR-0012).
- A future workitem/frontmatter schema change needs a migration hook — `gates.json` and
  `config.json` carry `schemaVersion` from day one for that reason.
