# ADR-0001: Distribute via a root package.json and `npx github:`

- Status: accepted
- Date: 2026-07-14

## Context

The toolkit must be installable with something like `npx github:Marc-Josia/operator init`
(AGENTS.md requirement), while the toolkit itself must live entirely under `/src`. npm git
specifiers require `package.json` at the repository **root**; subdirectory installs are not
portable across npm versions. When installing from git, npm (≥7) runs `npm pack`, so the
`files` field is honored. npx silently fails on git dependencies that declare lifecycle
scripts, and caches git resolutions (stale-version gotcha).

## Decision

Keep a minimal `package.json` at the repo root as distribution glue only: `bin` →
`src/bin/operator.mjs`, `files: ["src"]`, `engines.node >= 18`, **zero runtime dependencies,
zero lifecycle scripts**. Documented invocation is `npx --yes github:Marc-Josia/operator init`
(tag-pinned `#vX.Y.Z` variant for reproducibility). Publishing to the npm registry as
`@marcjosia/operator` is a post-v1 second channel.

## Consequences

- The root manifest is the one toolkit file outside `/src`; it contains no toolkit content.
- No build step may ever be added to install (no `prepare`); the payload stays plain files.
- README must document the npx git-cache staleness workaround.
