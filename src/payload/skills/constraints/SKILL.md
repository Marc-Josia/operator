---
name: constraints
description: Use before the first build of a new project or significant feature when the repo has no CONSTRAINTS.md, when the PM wants a quality dimension enforced, or when an agent weakens a check, test, or threshold to get to green.
---

## Mission

Write this project's quality bar down as commands that run, so every change, by any agent, is judged against numbers chosen once and not argued per change. Guard that bar: the cheapest road to green is to lower it, and that road stays closed.

## Done when

- `CONSTRAINTS.md` exists at the repo root with:
  - the floor: no new suppression comments, no skipped or deleted tests, no assertions stripped from tests that stay, no stubs or empty catch blocks standing in for work, no secrets in source, no weakening of this file to make a change pass;
  - each dimension the PM chose, with its number, the reason for that number, the command that checks it, and where it runs (every edit, task end, CI, preview);
  - metrics without a target recorded as today's value plus a direction ("must not fall"), not an invented number.
- Every command in it was run today: the floor passes on the current code, and each enforced row fails on a known violation and passes on a clean control.
- At least one check is external (a scanner, a standard, a real browser), not only the project's own tests.
- Checks that take more than a few seconds stay out of the edit loop.
- `AGENTS.md` points at it in one line: read `CONSTRAINTS.md` before writing code; its commands gate every change; never weaken it to pass.
- When guarding: the weakening in the diff is reverted and the code fixed instead, or the PM accepted it as a dated exception with a reason.

## Never

- Silence a check, skip or delete a test, strip an assertion, lower a threshold, or add an exception row to get to green.
- Change `CONSTRAINTS.md` in the same commit as the code that was failing it.
- Write a number with no command behind it, or a command that cannot run in this repo (a page audit with no URL to hit).
- Set a target the code fails today with no ratchet; hold today's value instead.
- Hand-roll a checker when the stack already has a standard tool for it.
- Ask the PM about tools, thresholds, or where a check runs.

## Stop and ask

- Which qualities matter for this product, in plain words: speed, reliability, accessibility, security of user data, staying maintainable. Recommend two from what the repo already shows (for example reliability and user-data safety for an app with logins). The agent picks tools and numbers and lists them one line each for veto.
- The only way to green is to weaken the bar: say what the check protects and what fixing it costs, recommend fixing, and let the PM accept a dated exception or not.

## Hand-off

- A ticket or spec is ready to build: `implement`.
- The bar was being guarded mid-build: back to the skill that was running.
- Any prose written here: `unslop`.
