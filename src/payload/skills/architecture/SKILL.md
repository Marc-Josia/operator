---
name: architecture
description: Use when module or seam friction remains after a review, when a bug had no good seam for its regression test, or when a deepening scan of the codebase is asked for.
---

## Mission

Find where the code makes the next change harder than it should be, and propose deepening it: more behaviour behind smaller interfaces at real seams, so callers get leverage, maintainers get locality, and tests cross the same interface callers do.

## Done when

- The scan was scoped first: the friction a review or debug named, or else the areas recent history keeps touching.
- Candidates are presented, each with: modules involved, the friction in plain words, the proposed change, what it buys (locality, leverage, which tests get simpler or become possible), and a strength (strong, worth exploring, speculative). One is marked as the top recommendation.
- Each candidate passed the deletion test: removing the shallow module would concentrate complexity, not just move it.
- Candidates use the project's domain terms and do not reopen recorded decisions unless the friction justifies it, said explicitly.
- The chosen candidate, if any, became a ticket or a short plan with the seam its tests will use.
- A rejected candidate with a lasting reason is recorded so later scans do not propose it again.

## Never

- Refactor during the scan, or mix restructuring into a feature change.
- Add a seam with only one implementation behind it and nothing varying across it.
- Propose abstractions for needs no spec has.
- Ask the PM to choose between technical designs.

## Stop and ask

- The top candidate changes product scope or delays agreed work: say what the PM gains (fewer bugs, faster next features) and what it costs in time, recommend, and let them decide.
- Otherwise: pick, state the choice in one line, continue.

## Hand-off

- A candidate was accepted: `implement` with its ticket or plan.
- Otherwise: Production skills whose trigger holds, in order `security`, `observability`, `ci`, `review` in high-risk mode, `migration`, `ship`; none holds: merge gate, then `retro`.
