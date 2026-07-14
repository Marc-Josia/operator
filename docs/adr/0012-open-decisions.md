# ADR-0012: Open decisions deferred to the project owner

- Status: proposed
- Date: 2026-07-14

## Context

Some decisions are the owner's to make, not the architect's, and none block v0.1.0.

## Open items

1. **License** — `package.json` currently omits `license`. Needs an explicit choice (MIT
   suggested for a toolkit seeking adoption) before public promotion.
2. **Name collision** — "Operator" collides with OpenAI's Operator product. The npm scope
   `@marcjosia/operator` is safe; the unscoped name and general discoverability deserve a
   decision before public launch.
3. **npm registry channel** — publishing `@marcjosia/operator` gives real `@latest`
   semantics and enables signed provenance; recommended once the toolkit stabilizes.
4. **Outcome measurement** — a dev-environment eval harness that runs the pipeline on the
   supported tools before each release (does Operator measurably improve results? how often
   are gates followed per host?) is the highest-value v0.2 investment.
5. **Supply-chain hardening** — publish release checksums once an update self-fetch or npm
   channel exists (see ADR-0009).
