---
id: {{id}}
title: {{title}}
lane: {{lane}}
stage: intake
base: {{base-sha}}
created: {{date}}
updated: {{date}}
next: {{next-action}}
---

# {{title}}

## Problem

<!-- What is being asked, in the requester's terms, and why it matters.
     3–10 lines on the quick lane; the spec document carries the detail on other lanes. -->

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

<!-- Lane rule: all "no" → quick. One or two "yes" (and protected paths "no") → standard.
     Otherwise → full. Protected paths always exclude the quick lane. -->

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
     Event vocabulary: CREATED, GATE <name> PASSED/FAILED, APPROVAL, REVIEW, ESCALATED,
     WAIVER, DOCS, MEMORY, BLOCKED, RESUMED. -->

- {{date}} CREATED lane={{lane}}

## Retro

<!-- Filled at ship time: what worked, what to improve, lessons worth memorizing.
     Keep it to a few lines; promote durable items via the memory harvest. -->
