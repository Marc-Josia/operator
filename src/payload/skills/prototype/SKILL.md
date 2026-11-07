---
name: prototype
description: Use when what a screen should look like, or how a flow or state should behave, is still open and the PM needs to see it to decide.
---

## Mission

Settle one open design question with the PM by putting a cheap, rough, throwaway artifact in front of them. The artifact dies; only the decision survives.

## Done when

- The question it answers is written at the top of the prototype in one sentence.
- It opens with one command or one file the PM double-clicks, no setup, and it says it is a prototype.
- For a look question: several clearly different variants, switchable in place. For a behavior question: the PM can click through the cases that are hard to judge on paper, and the full state shows after every action.
- The PM reacted and picked, or named what to change. The decision and the question it settled are written into the spec or the affected tickets (a state shape or schema may be inlined, trimmed to the decision).
- The prototype code is off the main branch: deleted, or committed to a throwaway branch that the spec or ticket points to.

## Never

- Merge prototype code into the main branch or build on it.
- Add tests, error handling, persistence, or polish beyond what makes it run. If persistence is the question, use a scratch store named so anyone can wipe it.
- Answer more than one question per prototype, or keep iterating once the PM has decided.
- Ask the PM to read code to judge it.

## Stop and ask

- Which variant or behavior they want, with your recommendation and its reason in one clause.
- The question is ambiguous between look and behavior and the PM is reachable: ask which one matters (recommend the one the surrounding work points to). Unreachable: pick that one and say so at the top.

## Hand-off

- Called from `grill`: back to `grill` with the decision.
- The spec or tickets need the decision: `spec` or `tickets` to fold it in.
- Otherwise: `constraints` when the repo has no `CONSTRAINTS.md` for a new project or significant feature, else `implement`.
