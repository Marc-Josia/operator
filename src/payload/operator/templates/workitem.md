---
id: {{id}}
title: {{title}}
lane: {{lane}}
stage: intake
base: {{base-sha}}
spec:
created: {{date}}
updated: {{date}}
next: {{next-action}}
---

# {{title}}

## Problem

<!-- What is being asked, in the requester's terms, and why it matters.
     3–10 lines on the quick lane; the spec document carries the detail on standard. -->

## Triage

| Question | Answer |
|---|---|
| Public interface or API change? | yes/no |
| Schema or data migration? | yes/no |
| Touches protected paths? | yes/no |
| New dependency? | yes/no |
| Hard to reverse? | yes/no |
| More than ~3 files expected? | yes/no |
| Crosses module boundaries? | yes/no |
| User-visible behavior change? | yes/no |

<!-- Lane rule: all "no" → quick. Any "yes" → standard.
     Protected paths always exclude the quick lane. -->

<!-- `spec:` frontmatter stays empty at intake. On the standard lane, op-plan fills it with
     the spec document's path from the project root: the spec tool's artifact when one is
     installed (spec-kit `specs/NNN-slug/spec.md`, OpenSpec `openspec/changes/<name>/proposal.md`)
     or `.operator/work/<id>/spec.md` from the fallback template otherwise. -->

## Scope

<!-- The files/areas this work is expected to touch, as paths or globs, one per line.
     The build gate compares the real measured diff against this list — declare honestly,
     and escalate (never silently widen) when the work grows beyond it. -->

## Tasks

- [ ] {{first-task}}

## Definition of done

- [ ] Acceptance criteria (Problem statement on the quick lane) demonstrably met
- [ ] Tests exist for the changed behavior and pass
- [ ] No unrelated changes in the diff
- [ ] Applicable rules in `.operator/memory/conventions.md` respected
- [ ] Docs updated, or no-doc-impact journaled

## Journal

<!-- Append-only. One line per event, newest last. Never edit or delete a previous line.
     Each line is date-prefixed: `- <ISO date> <EVENT> <details>`.
     Event vocabulary: CREATED, TASK, GATE <name> PASSED, APPROVAL, REVIEW, REPRO,
     ESCALATED, WAIVER, DOCS, MEMORY, BLOCKED, RESUMED, ATTEMPT, POSTMORTEM.
     ATTEMPT <task> failed: <reason> — one per failed fix/build retry; POSTMORTEM <file>: <line>
     once a method postmortem is written (the build gate forces one after repeated ATTEMPTs).
     (The checker writes the GATE PASSED line itself on a passing gate; a gate failure prints
     to the console and is never journaled — do not write GATE lines by hand.) -->

- {{date}} CREATED lane={{lane}}

## Retro

<!-- Filled at ship time: what worked, what to improve, lessons worth memorizing.
     Keep it to a few lines; promote durable items via the memory harvest. -->
