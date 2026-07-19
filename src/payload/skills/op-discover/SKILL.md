---
name: op-discover
description: "Problem-discovery interview that runs BEFORE op-new when the ask is vague, exploratory, or problem-shaped — 'onboarding feels bad', 'help me think this through', or one request hiding several problems. Grill the operator one question at a time, recommending an answer to each and researching facts instead of asking them, until you share one confirmed problem statement; hand it to op-new for triage, or to op-roadmap when it spans several milestones. Skip it when the request is already precise enough to triage (op-new) and for bugs (op-fix, which reproduces first). Discovery defines the problem, never the solution (op-plan)."
---

# op-discover — frame the problem before intake

## Purpose

Turn a vague ask into a problem statement precise enough to triage. op-new assumes it already
receives a discrete unit of work; when the operator is still exploring — "something's off with
onboarding", "we should probably speed up the dashboard" — there is nothing solid to triage yet.
Building from a fuzzy request is how agents solve the wrong problem confidently. This procedure is
the front door for that case: interview until you and the operator hold the *same* understanding
of the real problem, then hand it to op-new. It is the first two Laws made operational —
understand before you build; code is never the first step.

Discovery defines the **problem**. It never designs the **solution** (that is op-plan) and never
creates a work item or triages (that is op-new). It writes no work-item state and passes no gate;
its only output is a shared, confirmed understanding.

## When to use — and when to skip

Interviewing a request that was already clear wastes the operator's time and violates the autonomy
policy. So calibrate before you engage:

- **Use op-discover** when the request is open-ended, problem-shaped, or ambiguous: you cannot
  restate it as one concrete change, it could plausibly mean several different things, it is really
  several problems bundled together, or the operator explicitly wants to think it through or be
  grilled.
- **Skip to op-new** when you could write the Problem in one sentence and fill the triage scorecard
  right now — e.g. "add an `--json` flag to the `status` command". A precise ask needs triage, not
  an interview.
- **Skip to op-fix** for a bug, defect, crash, or regression — even a vaguely described one
  ("checkout is weird sometimes"). op-fix's reproduction step is the right way to pin down a fuzzy
  defect; discovery is for *new* work.

When in doubt on a new-work request, one framing question resolves it: *is the desired end state
already clear to me?* If yes, op-new. If no, discover.

## Entry criteria

- The operator asked for new work and the request is not yet precise enough to triage.
- You have read `.operator/constitution.md` (you are starting a work stream).
- No open work item already covers this — check `node .operator/bin/op.mjs status`. If one does,
  resume it via op-status instead of re-discovering it.

## Steps

### 1. Ground yourself before asking anything

Facts are researched, not interviewed. Read `.operator/memory/project.md` and skim the relevant
code, config, and tools so you arrive informed — every question you could have answered yourself
is one the operator should never see.

**Prior-rejection check.** As part of grounding, scan `.operator/memory/out-of-scope/` (if it has
entries). Matching is by concept similarity, not keyword — "night theme" matches `dark-mode.md`.
If the ask overlaps a rejected concept, surface it before interviewing: name the file, quote the
recorded reason, and ask whether the operator wants to reopen it. The record is memory, not a
veto — **the operator decides**; if they reopen, continue discovery and update or delete the file.

From that grounding, form a **hypothesis of the real problem**: what outcome the operator is
actually after, and why now. You will test it, not assume it.

### 2. Open with your hypothesis, not a blank page

Restate the problem as you understand it — one or two sentences of what you believe is really being
asked and the outcome it serves — and ask the operator to correct it. Starting from a concrete
guess surfaces disagreement faster than an open "so what do you want?" ever will.

### 3. Interview — one question at a time

Walk the problem down as a decision tree, resolving dependencies in order. This is the core loop:

- **One question at a time.** Ask, wait for the answer, let it shape the next question. A wall of
  simultaneous questions gets shallow answers and hides which answer drove what.
- **Recommend an answer to every question.** Never ask blankly — propose your best guess and your
  reasoning so the operator can confirm with a word or correct with a sentence. You are a senior
  engineer thinking alongside them, not a form to fill in.
- **Research facts; ask only for decisions and intent.** Anything discoverable from the codebase,
  memory, or tools, find yourself. Reserve questions for what lives only in the operator's head:
  goals, priorities, constraints, acceptable trade-offs, what "done" means to them.
- **Chase the why.** Behind a requested feature is a need; behind the need, a goal. Ask "so that…?"
  until you reach the real objective — often the best solution serves the goal without the feature
  originally named.

Cover, as they apply: the underlying goal and who it is for; what success looks like in observable
terms; hard constraints and non-negotiables; what is explicitly out of scope; and the rough shape
and risk of the work (this feeds op-new's triage — but you are gauging size, not deciding the lane).

### 4. Know when to stop

Stop interviewing the moment the picture stabilises — when new answers stop changing the shape of
the problem and you could hand a colleague a brief they would not need to re-litigate. Discovery is
bounded understanding, not exhaustive interrogation; grilling past clarity is its own failure. If
the problem turns out to be several problems, say so and recommend splitting it into separate work
items rather than forcing one.

### 5. Write the shared problem brief

Summarise what you converged on, in the operator's terms:

```
Problem:      the real underlying problem/outcome, plainly stated
For whom:     who feels it, and why it matters now
Success:      the observable signals that would mean it is solved
Constraints:  hard limits, non-negotiables, things that must not change
Out of scope: what this explicitly does not include
Open later:   questions deferred to planning — not blocking the problem definition
Likely shape: a rough sense of size/risk for triage (not a lane decision)
```

If discovery uncovered several distinct problems, list one brief per problem and recommend the
order to tackle them.

When the interview *deliberately discarded* a direction — the operator considered an idea and
said no, not just "not in this item" — record that rejection via op-memory into
`.operator/memory/out-of-scope/` (concept, reason, the original ask) so it is never re-litigated
from zero. Deferrals stay in the brief's `Out of scope` line; only considered "no"s are recorded.

### 6. Confirm alignment, then hand off by size

Present the brief and get an explicit "yes, that's the problem" — this confirmation *is* the shared
understanding the whole procedure exists to produce; do not proceed on a guess. Then route by how
big the confirmed problem really is:

- **One work item, or a few:** go to `.agents/skills/op-new/SKILL.md`, which triages the confirmed
  problem into a lane and creates the work item, using this brief as raw material for its Problem and
  Scope. One brief becomes one op-new intake; a few unrelated problems become a few.
- **Bigger than one work item — a project spanning several demonstrable phases:** go to
  `.agents/skills/op-roadmap/SKILL.md`, which decomposes the confirmed problem into an ordered
  roadmap of milestones and work items, gets the operator's approval, then feeds items to op-new one
  at a time. Discovery framed the problem; op-roadmap sequences the work.

Invoke the next procedure as a skill if your host supports skills; otherwise read its SKILL.md and
follow it.

## Exit

op-discover has no mechanical gate — no work item exists yet, so there is nothing for the checker
to measure. It ends when the operator has confirmed the problem brief and you have routed to op-new.
The understanding is the deliverable; op-new turns it into gated state.

## Failure modes

- **Interviewing a request that was already clear.** If you could have restated it in one sentence
  and triaged it, you should have. Stop and route to op-new; save the grilling for genuine fog.
- **Grilling past clarity.** Once answers stop reshaping the problem, more questions are theatre.
  Write the brief and move.
- **Asking what you could look up.** A question about a fact in the codebase, config, or memory is
  a research task you skipped. Find it yourself; ask only about intent and decisions.
- **Sliding into solution design.** Deciding *how* to build it — interfaces, dependencies,
  architecture — is op-plan's job, downstream of intake and the operator's approval. Discovery
  defines *what problem* and *why*, nothing more.
- **Letting the brief become the spec.** The brief is a shared problem statement, not a plan. It
  feeds op-new's triage; the spec is written later by op-plan for standard/full lanes.
- **A vague *bug* report.** Not this procedure — route to op-fix, whose reproduction step is how a
  fuzzy defect gets pinned down.
