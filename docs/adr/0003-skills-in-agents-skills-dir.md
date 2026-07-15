# ADR-0003: Canonical skills live in `.agents/skills/` (Agent Skills format)

- Status: accepted
- Date: 2026-07-14

## Context

The panel's portability research (mid-2026) verified that the Agent Skills SKILL.md format is
discovered natively from `.agents/skills/` by Codex CLI, OpenCode, Cursor, and Gemini CLI,
while Claude Code reads `.claude/skills/`. A prose-only `.operator/sop/` folder would be
invisible to every tool and double the adapter surface.

## Decision

All eleven skills ship as SKILL.md directories in `.agents/skills/` — the single canonical
location. The Claude Code adapter maintains a **copy-mirror** in `.claude/skills/` (copies,
not symlinks — symlinks break on Windows git). `operator doctor` detects mirror drift;
`operator update` re-renders it.

## Consequences

- One source of truth, one thin mirror; slash-command/skill invocation comes free on every
  tool that supports it, and the AGENTS.md routing table covers tools that do not.
- A user editing a mirrored copy silently forks the skill until doctor runs — accepted risk,
  surfaced by doctor rather than prevented.
