# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Operator: a pack of agent skills for Claude Code and Codex, installed per project with `npx operator install` and refreshed with `npx operator update`. It walks a non-engineer PM through Idea → Spec → Code → Test → Debug → Review → Ship and aims at clean, maintainable, non-AI-slop code with a light process.

The repo was restarted from scratch on 2026-11-16. Do not use the git history or earlier Operator versions as a reference. `docs/brief.md` is the validated product brief and the source of truth: read it before any work. No build, lint or test commands exist yet; add them here once the CLI is scaffolded.

## Product decisions that shape the code

- Skills only. Operator must not write rules into a consumer's CLAUDE.md or AGENTS.md. Phase order is carried by the skills themselves: each skill hands off to the next phase.
- Skills are model-invoked (auto-triggered from their description). The one manual exception is `init-operator`, run once per project to choose where specs and tickets live (local markdown, GitHub, Jira, Linear…) and write a small config file in the consumer repo that the other skills read.
- Install targets both agents' project skill folders (Claude Code and Codex), versioned with the consumer's code.
- Skill files are written in English. Everything the end user reads (chat, specs, tickets, PRs) is in the user's language.
- Every skill is our own. pstack (cursor/plugins) and Bombadil are inspirations only, not dependencies or vendored copies.
- Out of scope: orchestration (subagents, parallelism), asking for the project stage (proto/dev/prod: the user states it at use time, default is "dev"), changelog.
- Verification is the main anti-slop lever: always the real user path, never weaken a test to make it pass, a verification never executed doesn't count, evidence over claims.

## Working with the owner

The owner is a Product Manager who does not read code. Ask product-level questions only, one or two at a time, each with a recommended answer; make technical decisions yourself and state them briefly so they can be vetoed. Reply in French, short and conversational.

Commit finished work without being asked, on a feature branch. Never commit to or merge into `main`; pushing or opening a PR needs a go.
