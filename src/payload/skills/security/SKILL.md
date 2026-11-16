---
name: security
description: Use when a change touches auth, permissions, untrusted input (forms, uploads, webhooks, URLs the server fetches, model output), secrets, personal data, or a third party, while that code is being built and again before it merges.
---

## Mission

Nobody can reach data or actions that are not theirs, and no secret or personal detail leaks, before the change reaches users. Trigger: the change touches auth, permissions, untrusted input, secrets, personal data, or a third party. During Build it runs as an overlay on the code being written, not as a pass after it. Repo setup (no dependency audit or secret scan running yet) happens once and leaves both running on every change.

## Done when

- The trust boundaries this change crosses are listed in the ticket or PR, each with its abuse case ("how would I misuse this?"), and each abuse case is a test that fails without the control.
- Every protected action checks that this user may act on this specific resource, not only that someone is logged in. A test proves user A cannot read or change user B's data.
- Untrusted input, model output included, is parsed against a schema at the boundary; downstream code uses only the parsed value. Queries are parameterized, output is encoded, uploads are allowlisted by type and size.
- Server-side fetches of user-influenced URLs allow only listed hosts, reject private and reserved addresses, and do not follow redirects.
- Sessions use httpOnly, secure, sameSite cookies; security headers and a restricted CORS origin list show on a real response.
- Login and other auth endpoints are rate limited, backed by a shared store when more than one instance serves traffic.
- Secrets come from the environment; `.env.example` holds placeholders only; the staged diff and history contain no secret.
- The package manager's own audit shows no reachable critical or high finding left unmitigated; each deferral has a reason and a review date.
- Error responses are generic; actual log output was read and holds no token, password, or full personal data.
- Each new personal-data field has a stated purpose, a retention limit, and a working export and deletion path that reaches caches, search indexes, and analytics copies.
- Repo setup: the audit and a secret scan run in CI on every change (hand to `ci` if no pipeline exists yet).

## Never

- Commit a secret. One that reached a remote is compromised: rotate it first, then purge history.
- Treat client-side validation or a system prompt as a security boundary.
- Pass untrusted or model output into `eval`, raw HTML, a shell, SQL, or a file path.
- Delete, move, or overwrite a path derived from an untrusted value without an allowlisted root, a minimum depth below it, and ownership checked first.
- Run forced audit fixes, or blanket-approve dependency install scripts.
- Use a wildcard CORS origin with credentials, or loosen headers for convenience.
- Store auth tokens in browser storage readable by scripts.

## Stop and ask

- The change collects a new kind of personal or payment data: "Do we need customers' birth dates, and for how long?" Recommend: collect only what the feature uses, delete after the shortest useful period.
- User data goes to a third party (analytics, AI vendor, payment provider): "OK to send customer names to <vendor>?" Recommend: send the minimum, anonymized when possible.
- Who can see or do what changes (roles, sharing, a new way to log in): "Should team admins see members' invoices?" Recommend the narrowest access that serves the use case.
- A control changes what legitimate users feel (lockout after failed logins, upload limits): ask with the number you recommend.
- Any other choice (libraries, hashing, header values, limits): decide, list one line each, continue.

## Hand-off

- Running as an overlay during Build: back to the skill that was building (`implement`, `debug`).
- Otherwise the first whose trigger holds: `observability` (no error tracking baseline, or a new endpoint, job, or external call), `ci` (no pipeline running the checks, or the pipeline changed), else `review` in high-risk mode: this skill firing makes the change high-risk, so that is its one review.
