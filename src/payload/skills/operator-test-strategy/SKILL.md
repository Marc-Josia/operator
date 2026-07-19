---
name: operator-test-strategy
description: "Expertise pack for what to test, at which seam and pyramid level, and when to stop: per-lane test depth, mapping acceptance criteria to tests, the mocking policy (system boundaries only), what NOT to test, the flaky-test policy, and choosing the single regression test for a bug fix. Consult it before writing the first test, when deciding where a test should attach or whether to mock, and when a test flakes — op-build plans each task's proof with it; op-fix picks its reproduction test with it. Advisory only: it returns a test plan and never moves work-item state."
---

# operator-test-strategy

## Role of this pack

This is an expertise pack, not a procedure. It never changes a work item's stage, lane, or
records — it returns a test plan to the procedure that invoked it (op-build or op-fix), and
that procedure acts on it and records the evidence. If applying this advice exposes a scope or
lane problem (a needed test would touch files outside the declared Scope, say), report that in
your returned plan: escalation is the invoking procedure's decision, not yours.

## How much testing each lane owes

Every lane verifies — the quick lane skips the spec document, never the proof. Lanes differ in
how far the proof must reach, because the risk they carry differs.

| Lane | Required coverage | Why this bar |
|---|---|---|
| quick | Regression coverage of the changed behavior: at least one test that fails on the pre-change code and passes after. | Small diffs still break things. One targeted test is cheap insurance, and the Definition of done demands "Tests exist for the changed behavior and pass". |
| standard | Every numbered acceptance criterion in `spec-lite.md` maps to at least one test (technique below), plus regression coverage of any changed behavior the ACs do not name. | The ACs are the contract the operator approved; an untested AC is an unverified promise. |
| full | Everything standard requires, plus integration or contract coverage of every boundary the work introduces or changes — new module interfaces, external API calls, schemas, queue messages. | Full-lane work reshapes structure. Unit tests cannot see wiring, and boundary defects are the ones that surface in production. |

Coverage percentages are not part of any bar. Chasing a number produces low-signal tests; the
real question is "would this suite catch the realistic failures of this change".

## The test pyramid — and where each change type sits

- **Unit** (most tests): pure logic in isolation — parsing, calculation, branching, validation.
  Milliseconds to run, and a failure names the exact function.
- **Integration** (fewer): components talking through real seams — a handler with its router, a
  repository against a real or in-memory database, two modules across their contract.
- **End-to-end** (fewest): whole-system runs of critical user journeys only. Slow and brittle,
  and a failure names a symptom, not a cause — reserve them for flows whose breakage is an
  incident.

Default placement by change type — start here, deviate only with a stated reason:

| Change | Test level |
|---|---|
| Pure function / algorithm / parsing change | Unit |
| Bug fix | Lowest level that exercises the real defect (see the regression section) |
| New or changed module boundary, API contract, schema, message format | Integration / contract |
| HTTP endpoint behavior (status, headers, body shape) | Integration at the handler seam |
| Configuration or wiring change | One integration test proving the wiring holds |
| Data migration | Run against a representative data snapshot; assert row-level outcomes |
| Copy, styling, layout | Usually no automated test — say so in the plan rather than writing a brittle one |

Why the shape matters: the whole suite runs at every build gate (`tests-pass` requires the
`testCommand` in `.operator/config.json` to exit 0), so suite speed is iteration speed, and a
failure's precision is the next debugger's starting point.

## Seams — where tests attach

A **seam** is the stable boundary where a behavior can be observed and substituted without
reaching inside — a public function, a handler interface, a module contract. **The interface
is the test surface**: a test and a caller cross the same seam, which is exactly what lets the
suite survive refactoring. Choosing the seam is choosing the pyramid level. Two rules cover
most cases:

- **New behavior:** the highest seam at which the behavior is still real — nothing of your own
  mocked away — without dragging in unrelated system setup.
- **Regression (bug fix):** the lowest seam that exercises the real defect (the regression
  section below).

If reaching a behavior requires testing *past* the interface — asserting on private state or
internals — the module's shape is the finding: report it under `for the operator:` instead of
writing the coupled test.

## Mocking policy

Mock **only at system boundaries**: the network and third-party APIs, the clock, randomness,
the filesystem — and sometimes the database, though a real or in-memory one usually beats a
mock. **Never mock your own modules**: such a test verifies call wiring, not behavior, and
breaks on refactors that change nothing observable. If a behavior cannot be tested without
mocking your own code, the missing seam is a design finding — report it under
`for the operator:`. At the boundaries you do mock, prefer narrow SDK-style interfaces (one
function per operation, dependencies injected) over generic fetchers: each stub returns one shape.

One assertion trap at any seam: the **tautological test**, whose expected value is recomputed
the way the code computes it — it passes by construction and can never disagree with the code.
Expected values come from a source independent of the implementation: a known-good literal, a
worked example, the spec.

- Bad: `expected = items.reduce((s, i) => s + i.price, 0); expect(total(items)).toBe(expected)`
- Good: `expect(total([{price: 10}, {price: 5}])).toBe(15)`

## Mapping acceptance criteria to tests

Apply this per AC, in order:

1. Extract the observable behavior — what a reviewer could check "met / not met" from outside.
2. Restate it as *given / when / then*.
3. Choose the seam — the lowest one at which that behavior is real (not mocked away); the
   seam sets the pyramid level.
4. Name the test after the behavior and reference the AC number, so a reviewer can walk from
   spec to suite without a map.

Example:

- AC 3: "Requests over the rate limit receive HTTP 429 with a `Retry-After` header."
- → *given* a client at its limit, *when* it sends one more request, *then* the response is 429
  and carries `Retry-After`.
- → integration test at the middleware seam:
  `test/rate-limit.test :: "AC3: returns 429 with Retry-After when the limit is exceeded"`.

One AC often needs more than one test — the boundary case and the error path are separate
tests. The reverse is a smell: a single test asserting several ACs fails as a blob and tells
the reader nothing about which promise broke.

Apply the same mapping to the spec's **Non-functional constraints**. A non-trivial NFR is a
promise too, so it earns a test wherever it is objectively checkable: no hard-coded user-facing
strings (a lint/scan test over the i18n boundary), no secrets in logs (a redaction assertion), a
performance budget (a threshold check on a representative profile). Return these under `mapping:`
keyed by the constraint, exactly like an AC. NFRs that resist a deterministic test — a subjective
look, a hard-to-reproduce load profile — say so plainly and flag them `for the operator:` rather
than shipping a flaky guard (see Flaky tests below).

## What NOT to test

Every test is permanent maintenance surface; a low-signal test taxes every future change and
buries the failures that matter. Do not write tests for:

- **Implementation details** — private helpers, internal call order, intermediate state. Test
  at the seam; a test that breaks when behavior did not is a false-alarm generator.
- **Framework and library internals** — do not verify that the router routes or the ORM saves.
  Test your code's use of them, at the seam.
- **Live third-party API behavior** — test your adapter against a stub of the documented
  contract. The provider's actual behavior is an assumption; unverified assumptions belong in
  the spec's Risks & assumptions section, not in a suite where network weather fails your gate.
- **Logic-free code** — pass-through getters, one-line mappers, generated code.
- **Exhaustive input matrices** — when boundary analysis gives the same confidence with five
  cases: minimum, maximum, just-outside, empty, malformed.

## Flaky tests

A test that passes and fails without a code change is a defect in the suite. It erodes the one
thing a suite exists for — trust in green — and flakiness is usually a genuine race, time, or
shared-state bug in the test *or in the code under test*.

- Never delete a flaky test silently, never skip it without a trail, and never wrap it in
  blind retries — all three destroy a real signal.
- Quarantine explicitly: mark it skipped with a comment naming the observed flake and the work
  item that will investigate it. The suite goes green for the gate without pretending the
  problem is gone.
- Recommend in your returned plan that the flake be filed as its own work item (via op-new);
  the investigation is a bug hunt, so op-fix and the operator-debugging pack apply.
- If the flaky test is the only coverage of behavior the current change touches, flag it:
  shipping on quarantined coverage is the operator's call, never a silent default.

## Choosing the regression test in op-fix

op-fix writes exactly one failing test before any fix attempt. Choose it with these criteria,
in order:

1. **It fails on pre-fix code for the bug's own reason.** Read the failure output and match it
   to the reported defect — a test failing on a setup error reproduces nothing.
2. **Lowest seam that exercises the real defect.** If the bug lives in a parse function, a
   unit test on that function beats an end-to-end test through the UI: it pins the cause, runs
   in milliseconds forever, and cannot rot with unrelated UI changes.
3. **Deterministic.** Pin the clock, seed randomness, stub the network, fix ordering. A
   regression test that flakes ends up quarantined — and then the bug is unguarded.
4. **Named for the behavior, not the incident.** `"parses ISO dates with negative UTC offsets"`
   outlives `"fix bug 412"`; put the work-item id in a comment if the trail helps.

Then test your choice: would this test still fail if someone reintroduced the bug with a
*different* implementation? If it only detects the original patch's absence — asserting on
internals the fix happens to touch — it guards the patch, not the behavior. Pick again.

Example — bug: "dates render one day early for users east of UTC."

- Tempting: an end-to-end test that loads the profile page and reads the rendered date. Slow,
  needs a browser, breaks on every layout change.
- Right: a unit test on the date-parsing helper with input `2026-03-01T00:30+02:00`, asserting
  the returned calendar date — it fails pre-fix with the exact off-by-one and is immune to UI
  churn.

## What to return to the invoking procedure

Return the plan in this exact shape; the invoking procedure does all recording and writing:

```
TEST PLAN (operator-test-strategy)
lane: <quick|standard|full>
mapping:
  - <AC n | behavior>: <unit|integration|e2e> — <file :: test name> — <exists | to write>
not testing: <item — reason> (or "nothing excluded")
flakes: <none | test name, quarantine recommendation, work item to file>
for the operator: <none | coverage gap or risk that needs their call>
```
