---
name: retro
description: Use after a medium or larger change shipped, or after `debug` fixed a hard bug, in the session being looked back on, to make the next run go better.
---

## Mission

Improve the environment the next agent works in, not the code just written. Turn what went wrong or slow in this session into checks, pointers and standards, so the PM never corrects the same mistake twice. After a bug fix, the question is what would have prevented the bug.

## Done when

- The evidence is this session's log (after a clear: the log the PM points at), not a memory of it. Every candidate cites the moment it comes from.
- Candidates are listed most severe first, one line each: what went wrong, what it cost, the fix, where the fix lives.
- Every mistake the agent made or repeated that a machine could catch maps to a check that would have failed on it (lint rule, type, test, hook, CI job), wired into the command the repo already runs. A check that exists but is unwired or broken is the finding.
- A repo where nothing runs lint, typecheck and tests on every change is a candidate.
- Judgement calls no check can catch become one-line standards in the project part of `AGENTS.md`, after the `operator:end` marker, where `review` enforces them.
- `AGENTS.md` lines that changed nothing, went stale, or restate a config file are proposed for deletion.
- Slow navigation (a missing pointer), missing information (logs, read access) and expensive tool calls each get a candidate when they cost the session real time.
- The PM chose what to keep. Only accepted candidates move on.

## Never

- Answer a repeated mechanical mistake with another `AGENTS.md` line. It becomes a check.
- Touch product code, the managed block between `operator:start` and `operator:end`, or installed skill files.
- Drop a candidate because its fix is large; rank it and let the PM decide.
- Present a candidate in terms the PM cannot weigh (rule names, file paths) without the plain-words version first.

## Stop and ask

- Which candidates to keep. One question: "Keep the ones I recommend?" Each candidate in plain words (what went wrong for you, what the fix prevents) with keep or drop as the recommendation.

## Hand-off

- Accepted checks: `correct`. It makes each mistake impossible and proves the check fails on the real past instance.
- Accepted standards, pointer edits or deletions: `writing-for-agents`.
- Nothing accepted: the cycle ends. Tell the PM in one line.
