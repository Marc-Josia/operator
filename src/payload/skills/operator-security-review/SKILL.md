---
name: operator-security-review
description: Expertise pack for security review of a diff — surface-driven checklists covering input validation and injection (SQL, command, path, template), authentication and authorization, secrets and credential handling, dependency risk, data exposure and logging, and CI/CD supply chain, with severity mapped to the constitution's value ranking (security outranks everything and is never traded for speed). Mandatory whenever the measured diff or the declared Scope touches any protectedPaths entry in .operator/config.json — op-ship runs it then as a separate review pass; also consult it from op-build before writing code in auth, session, payment, migration, upload, or CI workflow files, and whenever the operator asks whether a change is safe. Advisory only — it returns findings to the procedure that invoked it and never changes work-item stage, lane, or journal.
---

# operator-security-review — surface-driven security review

## Boundary: advise only

This pack is expertise, not a procedure. Use it to produce findings, then return them to the
procedure that invoked you — op-ship for the mandatory protected-path pass, op-build for a check
before touching a sensitive area. Never edit source files, never fix what you find, and never
write work-item state (stage, lane, journal) or memory files: the invoking procedure owns every
state change and records your findings — including the review-evidence line the review gate
looks for. "Checked, found nothing" is a result the procedure must be able to record; silence
is not.

## When this pack is mandatory

Match every path in the measured diff and in the work item's Scope against `protectedPaths` in
`.operator/config.json`. Any match makes this review non-optional: the review gate requires
security-review evidence whenever protected paths were touched, and protected paths never
travel the quick lane. The operator listed those paths precisely because a defect there costs
more than the time this review takes.

## The method

Security review is not a second code review. Do not re-read the diff line by line hoping to
notice something — identify which attack surfaces the change touches, then interrogate each one
with its checklist. Attackers think in surfaces and data flows; so must the reviewer.

1. **Load context.** Read `protectedPaths` from `.operator/config.json`; the work item's
   Problem and Scope (`.operator/work/<id>/workitem.md`); and the spec's Risks & assumptions
   section — an assumption nobody verified is security review input.
2. **Measure the real diff.** Diff from the work item's `base` sha (`git diff <base>`, plus
   staged and untracked files). List every touched path that matches `protectedPaths` — the
   invoking procedure records that list.
3. **Classify by surface.** Map each touched file with the surface map below. Run every matched
   checklist in depth; skim the rest — a diff rarely touches only the surface its filename
   suggests.
4. **Follow the data, not the file.** For each new or changed entry point of untrusted input —
   request, file upload, message, environment, CLI argument — trace the data to its sinks:
   query, shell, filesystem path, template, log, response. Injection findings live on that
   trace, often two files away from the diff.
5. **Trust nothing that is merely named safely.** A function called `sanitize`, a comment
   saying "validated upstream", a variable named `safeQuery` — these are claims, not evidence.
   Read the implementation, or report the unverified assumption as a finding.
6. **Report** in the exact output format and return the results (see "What you return").

## Surface map

| The diff touches… | Run these checklists |
|---|---|
| request handlers, parsers, forms, file uploads, CLI/env input | Input validation & injection |
| login, sessions, tokens, middleware, roles, `**/auth/**`, `**/security/**` | Authentication & authorization |
| configuration, key material, `.env*`, `**/*secret*`, `**/*credential*` | Secrets & credentials |
| package manifests, lockfiles, vendored code | Dependency risk |
| logging, error responses, serializers, analytics or exports | Data exposure & logging |
| `.github/workflows/**`, CI/CD config, build or release scripts | CI/CD & supply chain |
| `**/payment/**`, `**/billing/**`, `**/migrations/**` | Input validation & injection + Authentication & authorization + Data exposure |

## Checklists

### Input validation & injection

- [ ] Every untrusted input is validated at the boundary — allowlist over blocklist
- [ ] SQL goes only through parameterized queries or bound statements; string-built SQL is a
      finding even when today's inputs "look safe" — tomorrow's caller will not check
- [ ] No untrusted input in shell strings: argument arrays instead of interpolation; no user
      input in command names or flags
- [ ] Paths joined with user input are canonicalized and confined to the intended base
      directory (`../` traversal)
- [ ] No untrusted input reaches template engines, eval-like sinks, or deserializers of
      arbitrary objects
- [ ] Uploads and request bodies have size and type limits; new regexes over user input are
      checked for catastrophic backtracking (ReDoS)

### Authentication & authorization

- [ ] Every new route, endpoint, or handler sits behind the same auth middleware as its
      siblings — default-deny; the unprotected new endpoint is the classic regression
- [ ] Authorization checks ownership of the object, not merely that a login exists (IDOR)
- [ ] Privilege checks run server-side; hidden UI is not access control
- [ ] Tokens and sessions: expiry enforced, rotation on privilege change, invalidation on
      logout, cookies Secure/HttpOnly/SameSite, signatures verified against a fixed algorithm
- [ ] No auth decision reads a client-supplied field (role, user id, price) without
      server-side verification
- [ ] Credentials hashed with a password KDF (argon2, bcrypt, scrypt), compared timing-safe,
      never logged

### Secrets & credentials

- [ ] No secret, key, token, or password anywhere in the diff — including tests, fixtures,
      examples, comments, and deleted lines; git history keeps deletions, so a committed
      secret is a compromised secret: it must be rotated, not merely removed
- [ ] Secrets come from the environment or a secret manager, never from tracked files;
      `.env*` stays untracked
- [ ] Defaults and examples ship placeholders, never working credentials
- [ ] No secrets in URLs, query strings, error messages, or client-delivered bundles

### Dependency risk

- [ ] Each new dependency justifies its existence (Law 9) and is actively maintained; check
      advisories with the ecosystem's audit tool where available, otherwise report the
      unchecked advisory status as an assumption
- [ ] Versions are pinned through the lockfile; the lockfile diff contains only what the
      manifest change explains — nothing riding along
- [ ] Package names checked against typosquatting; install and postinstall scripts read
      before being trusted

### Data exposure & logging

- [ ] No PII, credentials, tokens, or session ids written to logs, crash reports, or analytics
- [ ] Client-facing errors carry no stack traces, SQL fragments, or internal paths
- [ ] New responses and serializers return the fields the consumer needs, not whole records —
      whole-object serialization leaks every column added later
- [ ] Newly stored sensitive data has a reason to exist and a protection story: encryption,
      access control, retention

### CI/CD & supply chain

- [ ] Workflow changes never expose secrets to untrusted code — no `pull_request_target` (or
      equivalent) that checks out and runs fork code with secrets available
- [ ] No untrusted input (branch names, PR titles, issue bodies) interpolated into shell steps
- [ ] Third-party actions and plugins pinned to a commit SHA — or at minimum a reviewed major
      version; workflow token permissions are least-privilege
- [ ] Build and release scripts fetch nothing unpinned over the network (no piping a moving
      URL into a shell); produced artifacts embed no secrets

## Severity — mapped to the constitution's value ranking

Security is the constitution's first value: never compromised to save time (speed ranks last).
That ranking is what these grades encode:

- **blocker** — an attacker can act on it, or a secret is exposed: any injection, an
  authorization bypass or missing auth check, a committed or logged credential, a workflow
  that leaks secrets to untrusted code. Blockers are fixed before ship — there is no schedule
  argument against a first-ranked value, and no waiver turns an active exposure into a lower
  grade.
- **major** — a defense is removed or weakened even though no complete exploit was
  demonstrated: validation missing with only one layer left, over-broad permissions, sensitive
  fields newly logged, an unpinned third-party action.
- **minor** — a hardening gap with no current path to exploitation: a missing security header,
  no rate limit on a non-authentication endpoint, weak legacy code made no worse.
- **nit** — hygiene and consistency in security-adjacent code.

Promotion rules:

- Reachable by untrusted input → at least major. Traced end-to-end from input to sink →
  blocker.
- On a `protectedPaths` match, promote one level — the operator declared those paths critical,
  which is why this pack is mandatory there.
- Unable to demonstrate safety on an authentication or injection question → report at major
  with the open question. In security review, uncertainty is a finding: the attacker chooses
  the inputs, so safety must be shown, not presumed — assumptions are verified (value 2,
  Reliability).
- Never downgrade because the system is "internal only" or "an attacker would first need X" —
  unless the diff or configuration you actually read proves X is enforced.

## Output format

Emit every finding on one line, in exactly this shape (identical to operator-code-review):

```
[severity] file:line — issue — why it matters — suggested fix
```

**Examples**

```
[blocker] src/api/search.ts:52 — SQL built by concatenating req.query.q — injection: full table read/write from an unauthenticated endpoint — use a parameterized query via the existing db.query(sql, params)
[blocker] .github/workflows/ci.yml:23 — pull_request_target checks out and runs fork head with secrets in env — any fork PR can exfiltrate the deploy token — split into an unprivileged pull_request job and keep secrets out of fork-triggered runs
[major] src/auth/session.ts:31 — session lifetime raised to 30d with no rotation or revocation change — a stolen cookie now works for a month — keep 24h with sliding renewal, or rotate the token on each use
[minor] src/api/profile.ts:77 — new endpoint serializes the full user row — leaks internal flags today and every column added tomorrow — return an explicit field list
```

One line per finding, most severe first. No prose between findings.

## What you return

Return to the invoking procedure — as your report, never as a file or state change:

1. The findings list in the exact format above, most severe first. An explicit "no findings"
   is a valid and necessary result: the review gate requires security-review evidence whenever
   protected paths were touched, and the procedure records that evidence from your report.
2. One summary line the procedure can record verbatim:
   `findings: N (a blocker, b major, c minor, d nit)`.
3. The list of diff paths that matched `protectedPaths`, and which surface checklists you ran.
4. Every assumption you could not verify — no audit tool available, an unreadable dependency,
   an upstream-validation claim you could not confirm.

Fixing, waiving, and recording belong to the invoking procedure and the operator. One grade has
no negotiation at this pack's level: report every blocker as a blocker, however inconvenient.
