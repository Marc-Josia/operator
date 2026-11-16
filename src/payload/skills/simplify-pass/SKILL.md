---
name: simplify-pass
description: Use right after a medium or larger change is built and before any review, so a fresh agent that did not write it makes the new code simpler without changing behaviour. Not for a small change.
---

## Mission

Ship the simplest code that does what was agreed. The builder is too close to its own work to see the detour, the duplicate, or the layer nobody needed, so a fresh agent rereads the change cold and removes them before review and the PM spend time on it. Behaviour does not change: only the code that carries it gets smaller and clearer.

## Done when

- The pass ran in a fresh subagent that did not build the change, given the diff against its base, the spec or ticket, the project's instruction files and `CONSTRAINTS.md`, never the builder's reasoning. No subagents available: this session reread the diff from scratch, and the PM was told why.
- A spec or several tickets got one pass over the integrated change, so duplication across tickets is caught, not one pass per ticket.
- Only code the change added or touched was simplified: dead code, duplicates, needless indirection or abstraction, defensive branches for cases that cannot happen, names that hide intent, existing helpers reimplemented.
- Each simplification is listed one line each (what, why it is simpler), or the pass reported "nothing worth simplifying" and changed nothing.
- Typecheck, the full suite and every `CONSTRAINTS.md` command pass, with the bar untouched. User-visible change: the PM journey was rerun on the real artifact (`principle-prove-it-works`) and the test kit still holds.
- The simplifications sit in their own commit, so they can be reverted without touching the build.

## Never

- Change behaviour, a public interface, or anything the spec or ticket decided.
- Touch code outside the change, or start the refactor `architecture` owns.
- Edit, delete, or weaken a test to get green. A test that blocks a simplification means the simplification is wrong.
- Trade clarity for fewer lines (clever one-liners, merged functions that do two things), or churn code that is already simple.
- Review the change: findings that are not simplifications (bugs, missing behaviour) are handed to `review`, not fixed here.

## Stop and ask

- Never for technical choices: decide, list them, continue.
- A simplification would change what the user sees or can do: do not make it; ask the PM in plain words, with a recommendation (usually keep the agreed behaviour).

## Hand-off

- Not high-risk: `review`.
- High-risk: the Production skills whose trigger holds, in order `security`, `observability`, `ci`, `review` in high-risk mode, `migration`, `ship`.
- The pass found seam or module friction it must not fix: note it for `architecture`.
