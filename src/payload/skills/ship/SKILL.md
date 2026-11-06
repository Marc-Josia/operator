---
name: ship
description: Use when a change is about to reach users (deploy, publish a package or app, flip a feature flag) and the cycle must end with a PM test kit, a rollout, and a rollback in place.
---

## Mission

The change reaches users safely and the PM proves it works by walking the journey themselves. Trigger: the change reaches users through a deploy, a publish, or a flag flip. This ends the cycle: the agent has already run the journey on the real artifact, rollout and rollback are ready, and releasing is the PM's call.

## Done when

- Checks are green in CI, and every Production skill whose trigger held is done (`security`, `observability`, `ci`, `review` high-risk mode, `migration`).
- Configuration and environment variables for the target environment are set from code or documented commands, not by hand from memory.
- Rollout: a risky or visible change sits behind a flag or a staged rollout (team, then a small share, then everyone), with numeric stop lines written down, for example errors above twice the baseline or p95 latency up 50% means roll back. Each flag has an owner and a removal ticket.
- Rollback: the exact command or flag switch, how long it takes, and what happens to data written meanwhile, tried once on preview or staging. It never depends on reversing a destructive migration.
- Error tracking and a symptom alert cover the new path; after release the agent checks health, new error types, latency, and logs flowing.
- UI change: the journey works with the keyboard alone, inputs have labels, text contrast meets WCAG AA, and an automated accessibility scan reports no violations. Touched web pages keep LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, otherwise `performance`.
- Package or app release: version bumped, a changelog entry per user-visible change, and the built artifact installed fresh and run.
- The agent ran the journey on the real artifact (preview URL, production behind the flag, or the fresh install) per `principle-prove-it-works`, and the report shows what it saw.
- The PM has a test kit: where to go (URL or one command), the journey step by step in user words, what they should see at each step, what is live versus behind a flag, and the one-line rollback.
- After the PM's go: released, watched for the first window against the stop lines, numbers re-measured at report time.

## Never

- Merge, deploy, publish, or flip a flag without the PM's explicit go.
- Hand the PM a diff, a list of changes, or "should work" instead of a journey the agent already ran.
- Release a risky change to everyone at once when a flag or staged rollout is available.
- Hold a release past a red stop line to investigate: roll back first, then `debug`.
- Put a production credential in the test kit.

## Stop and ask

- The merge gate, with the test kit: "Try the journey at <URL>. When it looks right, release to everyone, or to 10% first?" Recommend the staged option for anything risky.
- Who sees it first: "Turn it on for your team today and for all users tomorrow?" Recommend team first when a flag exists.
- Users must act or be told (breaking change, price, data use): "Should we announce this before release?" Recommend yes when anything they rely on changes.
- Any other choice (deploy method, flag tool, watch window, thresholds): decide, list one line each, continue.

## Hand-off

- The PM's journey fails: cause clear, back to `implement`; cause unknown, `debug`.
- A stop line turns red after release: roll back, then `debug`.
- The pull request body is not written yet: `pr`.
- Released, medium or larger change: `retro`. Small change: done.
