---
name: retro
description: Use after a medium or larger change merged or shipped, after `debug` fixed a hard bug, or when the user asks what went wrong or how to work better next time, to turn this session's mistakes into checks, standards, and project skills.
---

## Mission

Improve the environment the next agent works in, not the code just written. Turn what went wrong or slow in this session into checks, pointers and standards, so the PM never corrects the same mistake twice. After a bug fix, the question is what would have prevented the bug.

## Done when

- The evidence is this session's log (after a clear: the log the PM points at), not a memory of it. Every candidate cites the moment it comes from.
- Candidates are listed most severe first, one line each: what went wrong, what it cost, the fix, where the fix lives.
- Every mistake the agent made or repeated that a machine could catch maps to a check that would have failed on it (lint rule, type, test, hook, CI job), wired into the command the repo already runs. A check that exists but is unwired or broken is the finding.
- A repo where nothing runs lint, typecheck and tests on every change is a candidate.
- Judgement calls no check can catch become one-line standards in the project's instruction file (`CLAUDE.md` for Claude Code, else `AGENTS.md`), where `review` enforces them.
- Instruction-file lines that changed nothing, went stale, or restate a config file are proposed for deletion.
- A multi-step task that came back, a missed step that was expensive (deploy, migration, release), or a task the PM corrected twice is a candidate project skill.
- Slow navigation (a missing pointer), missing information (logs, read access) and expensive tool calls each get a candidate when they cost the session real time.
- The PM chose what to keep. Only accepted candidates move on.

## Never

- Answer a repeated mechanical mistake with another instruction-file line. It becomes a check.
- Touch product code or installed Operator and pstack skill files.
- Drop a candidate because its fix is large; rank it and let the PM decide.
- Present a candidate in terms the PM cannot weigh (rule names, file paths) without the plain-words version first.

## Stop and ask

- Which candidates to keep. One question: "Keep the ones I recommend?" Each candidate in plain words (what went wrong for you, what the fix prevents) with keep or drop as the recommendation.

## Hand-off

- Accepted checks: `correct` (in it, "the operator" means the PM). It makes each mistake impossible and proves the check fails on the real past instance.
- Accepted standards, project skills, pointer edits or deletions: `writing-for-agents`.
- Nothing accepted: the cycle ends. Tell the PM in one line.
