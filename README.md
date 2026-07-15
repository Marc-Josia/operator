# Operator

**Operator** is an agent-agnostic toolkit that makes AI coding agents work like a senior
engineering team: the human decides, Operator organizes, agents execute.

**→ Toolkit documentation, installation, and usage: [`src/README.md`](src/README.md)**

```bash
npx --yes github:Marc-Josia/operator init
```

## Repository layout

This repository separates the toolkit from the environment used to build it
(see [`AGENTS.md`](AGENTS.md)):

- **`src/`** — the toolkit. Everything that ships to users lives here, in English,
  agent-agnostic. Nothing outside `src/` (plus the root `package.json` distribution glue)
  is part of it.
- `docs/adr/` — architecture decision records for the toolkit's own design.
- `AGENTS.md`, `CLAUDE.md`, `.claude/`, `start.md`, `constitution-template.md` — the
  development environment: contributor rules, mission documents, and dev-only tooling.
  None of this ships.

## Contributing

```bash
npm test                 # node:test suite for the CLI and the runtime gate checker
npm run build:manifest   # regenerate src/manifest.json after editing src/payload/
```

Rules for contributions (human or agent) are in [`AGENTS.md`](AGENTS.md). Design rationale
lives in `docs/adr/` — read ADR-0007 (mechanical gates) and ADR-0002 (managed AGENTS.md
block) first to understand the architecture.
