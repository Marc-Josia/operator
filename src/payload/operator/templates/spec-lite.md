---
item: {{id}}
status: draft
---

<!-- status: draft | approved — op-plan sets approved only after the operator's approval
     is journaled in workitem.md. -->

# Spec — {{title}}

## Problem & goal

<!-- The need behind the request, in plain language. What "done" changes for the user. -->

## Acceptance criteria

<!-- Numbered. Each criterion is independently checkable — a reviewer can answer
     "met / not met" without interpretation. These drive the tests. -->

1. …

## Approach

<!-- The intended solution in a few paragraphs: what changes, what stays untouched,
     and why this approach over the obvious alternative. -->

## Non-functional constraints

<!-- Standing targets the result must satisfy regardless of this change, each a measurable
     met/not-met criterion — performance, accessibility, i18n (no hard-coded user-facing
     strings), no secrets in logs. Write `None — <reason>` when there are genuinely none. -->

## Out of scope

<!-- Explicitly excluded work. Prevents silent scope creep during build. -->

## Risks & assumptions

<!-- Anything unverified (external APIs, versions, behavior). Every assumption listed
     here must be verified or accepted by the operator before ship. -->

<!-- Note: the declared change surface lives in workitem.md → Scope. Keep it current;
     the build gate measures the real diff against it. -->
