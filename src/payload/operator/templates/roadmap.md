---
id: {{id}}
title: {{title}}
status: shaping
created: {{date}}
updated: {{date}}
next: {{next-action}}
---

# {{title}} — roadmap

## Vision

<!-- The outcome this project delivers and who it is for, in the operator's terms.
     Carry it from the op-discover problem brief; do not re-interview what is settled. -->

## Existing bricks

<!-- What is already in place that this project builds on or must not break — modules,
     services, data, prior work items. Researched from the codebase and memory, not guessed.
     This is what stops the roadmap from re-planning things that already exist. -->

## Milestones

<!-- Ordered, each a demonstrable vertical slice — something you could show working, not a
     horizontal layer ("all the models"). Plan near milestones in detail, far ones coarsely;
     you will re-plan as you learn. Each work item becomes one op-new intake when its turn comes. -->

### M1 — {{first-milestone-name}}

- **Goal:** {{first-milestone-goal}}
- **Done when:** <!-- demonstrable acceptance: what a person can see working when M1 ships -->
- **Depends on:** none
- **Work items:** <!-- one line each, described by observable behaviour ("a guest can filter
       listings by date range"), never by paths or symbols of today's code — they go stale.
       blocked-by names the sibling items that must ship first, omitted when the item can start
       immediately. Work the frontier: any item whose blockers have all shipped. -->
  - [ ] {{first-work-item}} <!-- id filled at op-new intake; status: planned → in progress → shipped -->
  - [ ] {{second-work-item}} — blocked-by: {{first-work-item}}

<!-- Add M2, M3, … below as the project grows. Later milestones may hold only a goal and a
     rough item list until you plan them properly — coarse is honest, false precision is not. -->

## Sequencing & dependencies

<!-- Cross-milestone ordering and hard dependencies only — what must land before what, and why.
     Intra-milestone order lives on the items' blocked-by lines, not here. -->

## Out of scope

<!-- What this project explicitly does not include — the boundary that keeps it finishable. -->

## Risks & open questions

<!-- Unknowns that could reshape the plan; decisions deferred to the milestone that needs them. -->

## Journal

<!-- Append-only. One line per event, newest last, date-prefixed.
     Event vocabulary: CREATED, APPROVAL, MILESTONE (started/shipped), ITEM (planned/shipped),
     REPLANNED, BLOCKED, RESUMED. Approvals and re-plans live here so the plan's history is visible. -->

- {{date}} CREATED status=shaping

## Progress

<!-- A short living summary the operator reads first: which milestone is active, what shipped,
     what is next. Updated as milestones and work items move; the Journal keeps the full history. -->
