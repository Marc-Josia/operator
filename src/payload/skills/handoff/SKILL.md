---
name: handoff
description: Use when the session is ending, the context is nearly full, or the PM asks to continue in a fresh session or with another agent.
---

## Mission

Compact this session so a fresh agent picks up the work without asking the PM anything already decided and without redoing finished work.

## Done when

- One handoff document exists in the OS temp directory (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows), not in the repo, and the PM has its path plus one line to paste into the new session.
- It states the goal in the PM's words, and the focus of the next session when the PM gave one.
- It lists every question the PM answered, with the answer, and every technical decision the agent took that the PM did not veto.
- It states the current state with evidence: branch and worktree, what is committed, which checks pass or fail and the command that shows it, what is deployed or open as a PR.
- It names the next action, the skill that runs it, and the gate where the next agent stops.
- It lists questions still open for the PM, each with the agent's recommended answer.
- Specs, tickets, commits, PRs and the project's instruction files are linked by path or URL, not restated.
- No secrets, tokens, passwords or personal data appear in it.
- Read cold, as the next agent with only this document and its links, it leaves no decided question to re-ask.

## Never

- Copy a spec, ticket or diff into the document.
- Turn a decided question into a "to confirm".
- Report a state (tests pass, deployed, merged) not checked in this session.

## Stop and ask

- The work has several open branches and the PM gave no focus: ask which one the next session takes (recommend the one that unblocks the most).

## Hand-off

- The next session starts with the skill the document names. This session ends after the PM has the path.
