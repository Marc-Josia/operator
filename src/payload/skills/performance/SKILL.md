---
name: performance
description: Use when there is a measured performance problem (users report slowness, a budget fails), Core Web Vitals need work, an N+1 query appears, or someone claims a speedup or regression; every number goes through benchmark-checklist.
---

## Mission

The slowness users feel goes away by a measured amount, and nothing is kept that the measurement does not justify. Trigger: a measured performance problem, Core Web Vitals outside "good", an N+1 query, or any performance claim. It runs as an overlay wherever the trigger appears, not as a step every change passes. A guard is left behind so the same regression is caught next time.

## Done when

- The user-facing metric has a baseline from one re-runnable command on representative data, hardware, and network.
- The bottleneck is named from a profile, a trace, or a query plan, not a guess.
- Each change was measured alone, the same way as the baseline, and beats run-to-run variance; every number went through `benchmark-checklist` before it was reported or acted on.
- Changes that did not beat the baseline are reverted. Every attempt, kept or reverted, is logged in the ticket or PR so a dead idea is not run twice.
- Web pages touched: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, measured on a throttled mobile profile or field data.
- New data fetching has no N+1 and list endpoints paginate. A new index is justified by the query plan before and after. A new cache names every input it keys on (tenant, locale, viewer) and how it goes stale.
- A regression guard exists for this metric: a budget in CI or a production monitor with an alert. Repo setup does this once.
- Existing tests pass unchanged.

## Never

- Optimize without a baseline, or bundle several changes into one measurement.
- Keep a change that did not measurably help.
- Change, skip, or delete a test to get a win.
- Raise a pool size, add a cache, or add an index as a reflex, before finding what actually holds the time.
- Report a number that skipped `benchmark-checklist`, or one not re-measured at report time.

## Stop and ask

- The fix trades something users see: "Search results could be up to 1 minute stale so the page loads in 1s instead of 4s. OK?" Recommend with the measured numbers.
- No target exists: "What load time is good enough for this page?" Recommend under 2.5s on a mid-range phone.
- The fix costs money (bigger server, paid CDN): state the monthly cost and the measured gain, recommend.
- Any other choice (profiler, query rewrite, caching layer, bundle split): decide, list one line each, continue.

## Hand-off

- Slow for a reason nobody can find yet: `debug`.
- Called as an overlay from another skill: back to it (`implement`, `ship`).
- Otherwise the first whose trigger holds: `ci` (the regression budget needs the pipeline), `review` in high-risk mode, `ship` (the change reaches users). None: the merge gate, then `retro`.
