---
name: observability
description: Use when the repo has no logging, error tracking, or metrics baseline yet, or when a change adds a service, endpoint, background job, or external call that must be visible in production.
---

## Mission

When something breaks for users in production, the team learns it from an alert and finds the cause from telemetry, not from a customer email and an afternoon of guessing. Trigger: no logging, error tracking, or metrics baseline yet (repo setup, done once), or the change adds a service, endpoint, job, or external call. Setup leaves error tracking and one alert running, so the next change only instruments its own path.

## Done when

- Two to four questions someone will ask when this breaks ("are payments failing, and why?") are written in the ticket or PR, and each maps to a named log event, metric, or trace.
- Logs are structured events with a stable name and a request ID on every line, propagated across outbound calls and queues. A stream written by several entry points (scheduler, endpoint, manual run) also names the entry point.
- Every new endpoint and external dependency reports rate, errors, and latency as a histogram (p95 and p99 queryable), with labels from small fixed sets only.
- External calls log endpoint, status, latency, and attempt count, never payloads.
- A failure was induced on a real environment (preview or staging) and located by request ID from telemetry alone, without reading the source.
- Actual log output was read: structured fields, no `[object Object]`, no secret, token, or full personal data.
- Repo setup: an unhandled error from the deployed app shows up in the error tracker; at least one alert fires on a symptom users feel (error rate, latency, queue age), has a three-line runbook in `docs/runbooks/` (what it means, first check, who to call), and was test-fired once to the right channel; the tools and where to find them are listed in `docs/runbooks/README.md`.

## Never

- Use user IDs, emails, raw URLs, request IDs, or error text as metric labels.
- Track latency as an average.
- Page a human on causes (CPU, disk, a restart); those go to dashboards. Keep an alert that fires without anyone acting on it.
- Log whole request bodies, auth headers, secrets, or unredacted personal data.
- Build log lines by string interpolation, or ship `console.log` as production telemetry.
- Call telemetry done without triggering it and reading what came out.

## Stop and ask

- Setup needs an account or paid service: "Can we use <tool>'s free tier for error alerts? It covers <N> errors a month." Recommend the cheapest tool that alerts on errors; the PM creates the account and hands over the key.
- Who is alerted and how: "If more than 1% of checkouts fail for 5 minutes, who should be told, and where?" Recommend one channel and one owner.
- Any other choice (logger, metrics backend, sampling rate, thresholds): decide, list one line each, continue.

## Hand-off

- Called because `debug` was blind in production: back to `debug`.
- Otherwise the first whose trigger holds: `ci` (no pipeline running the checks, or the pipeline changed), `review` in high-risk mode (`security` fired, data or schema migrates, a public interface changes, or the release reaches users), `migration` (old code leaving or a production schema change), `ship` (the change reaches users).
- None holds: the merge gate, then `retro`.
