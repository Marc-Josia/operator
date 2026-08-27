---
name: operator
description: >
  Route work to the right skill in the Operator pipeline (Matt Pocock understand/build
  plus Addy Osmani production overlay). Use when the user says /operator, asks which
  skill to run, is unsure of the next step, starts a feature or idea, or when two skill
  packs might conflict. Do not use ask-matt or using-agent-skills; Operator is the only
  router.
disable-model-invocation: true
---

# Operator

You are the **only router** in this repo. Matt Pocock skills own Understand → Build. Addy Osmani skills own the Production overlay. Do not run a second lifecycle (no Addy `/spec` `/plan` `/build`, no `ask-matt`, no `using-agent-skills`).

Recommend **one next skill** (or a short sequence). Then stop. Do not start that skill until the user says so, unless they asked you to execute.

Read a skill's `SKILL.md` before asserting what it does. If this map and a `SKILL.md` disagree, the `SKILL.md` is right.

## Main pipeline

On-ramps are allowed. This is not a tunnel — skip stages that are already done.

```
IDEA
  → grill-with-docs          (pulls grilling + domain-modeling)
  → domain-modeling          (if the glossary still wobbles after grill)
  → to-spec
  → to-tickets
  → prototype?               (throwaway only; keep the answer, delete the code)
  → tdd                      (Matt. Never Addy's test-driven-development)
  → implement                (drives tdd at seams, then code-review)
  → code-review              (Matt: Standards + Spec)
  → codebase-design          (vocabulary underneath; invoke when shaping modules)
  → improve-codebase-architecture
  → security-and-hardening   (Addy production overlay starts here)
  → code-review-and-quality  (Addy: five-axis, after security)
  → deprecation-and-migration
  → observability-and-instrumentation
  → ci-cd-and-automation
  → shipping-and-launch
```

Checklists live in `references/` at the project root (Addy). Skills that say `../../references/…` resolve there.

## Arbitration

| Concern | Use | Do not use |
|---|---|---|
| Requirements / grilling | `grill-with-docs` (or `grill-me` if there is no repo) | Addy `interview-me` |
| Domain language | `domain-modeling` | — |
| Spec / tickets | `to-spec` then `to-tickets` | Addy spec/plan skills |
| Tests | Matt `tdd` | Addy `test-driven-development` |
| Implementation | `implement` | Addy `incremental-implementation` |
| In-loop review | Matt `code-review` | — |
| Pre-merge / production review | Addy `code-review-and-quality` (after security) | substituting it for Matt's review |
| Hard bugs | `diagnosing-bugs` | Addy debugging skills |
| Module design | `codebase-design` | — |
| Architecture survey | `improve-codebase-architecture` | — |
| Auth, input, secrets | `security-and-hardening` | — |
| Telemetry | `observability-and-instrumentation` | — |
| Pipelines | `ci-cd-and-automation` | — |
| Removing old systems | `deprecation-and-migration` | — |
| Going live | `shipping-and-launch` | — |
| Perf only | `performance-optimization` | dragging the whole pipeline |
| Multi-session map | `wayfinder` | — |
| Cited research | `research` | — |
| Docs agents will read | `writing-for-agents` | — |
| Human-only infra steps | `wizard` | — |
| First-time repo setup | `setup-matt-pocock-skills` | skipping it before engineering skills |

Two reviews are **sequential, not interchangeable**: Matt `code-review` during Build; Addy `code-review-and-quality` during Production.

## On-ramps (pick one)

- **Vague idea / "I want X"** → `grill-with-docs`. If the working directory is not a repo, `grill-me`.
- **Already aligned this session** → `to-spec` (no second interview).
- **Spec exists, no tickets** → `to-tickets`.
- **Tickets exist, ready to code** → `tdd` then `implement`.
- **Small specified fix** → `tdd` + `implement`. Skip grill/spec/overlay unless production-facing.
- **Hard bug or perf regression** → `diagnosing-bugs`. After the fix, `tdd` for the regression test.
- **Work larger than one session** → `wayfinder`.
- **Need a throwaway to answer a design question** → `prototype`, then return to grill or `to-spec`.
- **Survey deepening opportunities** → `improve-codebase-architecture` (generates ideas; may re-enter at grill).
- **Shipping to production** → start the Addy overlay at `security-and-hardening` if Build is done.
- **Internal refactor, not a product change** → Build skills only; skip the Addy overlay unless you are touching auth, data, or deploy.
- **Repo not configured for Matt's engineering skills** → `setup-matt-pocock-skills` first.

## How to answer

1. Name the user's situation in one sentence.
2. Name the next skill (and only the skills that must follow immediately).
3. Say what will be skipped and why, if anything.
4. Point at the human decision in that step (grilling confirms; shipping needs a go/no-go).
5. Stop. Wait for the user to invoke that skill, unless they asked you to run it.

If setup has not been run in this repo, say so and put `setup-matt-pocock-skills` in front.
