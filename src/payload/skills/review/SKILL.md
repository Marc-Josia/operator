---
name: review
description: Use once per medium or larger change, to check it against its spec or ticket and the project standards: after the build by default, or in high-risk mode before a high-risk merge.
---

## Mission

Catch what the builder cannot see in its own work before the PM spends time testing it: missing or wrong behaviour, scope creep, broken standards, and in high-risk mode, the ways the change can hurt users or data. One review per change, so findings are acted on, not re-litigated: a high-risk change gets high-risk mode instead of the default, never both.

## Done when

- The diff was pinned against a base that resolves and is not empty, and the spec or ticket it implements was found (or "no spec" reported).
- Default mode reported two separate verdicts, never merged into one ranking:
  - Spec: requirements missing or partial, behaviour nobody asked for, requirements that look done but are wrong, each quoting the spec line.
  - Standards: violations of documented project standards (cited) and design smells (labelled judgement calls; a documented standard overrides them).
- High-risk mode (the change touches what `security` covers, migrates data or schema, changes a public interface, or its release reaches users): ran once, after `security`, `observability` and `ci` (those whose trigger held), with CI green and `blast-radius` done; reported the spec and standards verdicts above plus correctness, readability, architecture, security, performance, most severe first, each finding labelled blocking or optional.
- Tests were read first: they check behaviour, would fail on a regression, and none were weakened.
- Every finding is fixed (checks rerun green) or explicitly accepted with a reason in the commit or PR.
- Each finding names file and line and says what breaks for whom; nothing is softened.

## Never

- Run a second review on the same change (default mode after the build, then high-risk mode later), or review a small change: its checks are the gate.
- Rubber-stamp, or bury a real defect under style nits.
- Block a change that improves the code because it is not how you would have written it.
- Fix findings by weakening a test, check, or threshold.
- Run high-risk mode before CI is green.

## Stop and ask

- A finding is really a product question (behaviour the spec did not decide, scope to cut or add): ask the PM in plain words with a recommendation.
- A blocking finding the builder proposes to accept instead of fix: the PM decides, with the user impact stated.
- Everything else (style, structure, which fix): decide and continue.

## Hand-off

- Seam or module friction remains after fixes: `architecture`.
- After default mode: `observability`, `ci`, `migration`, each only if its trigger holds.
- After high-risk mode: `migration`, then `ship`, each only if its trigger holds.
- No trigger holds: the PM test kit and merge gate, then `retro` for medium or larger work.
