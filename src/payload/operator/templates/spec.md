---
item: {{id}}
status: draft
---

<!-- status: draft | approved — op-plan sets approved only after the operator's approval
     is journaled in workitem.md. -->

# Spec — {{title}}

## Problem & goal

<!-- The need behind the request. Who is affected, what "done" changes for them,
     and how we will know it worked. -->

## Acceptance criteria

<!-- Numbered. Each criterion is independently checkable — a reviewer can answer
     "met / not met" without interpretation. These drive the tests. -->

1. …

## Architecture & decisions

<!-- The shape of the solution: components touched or created, data flow, contracts
     between parts. Every significant decision gets a one-paragraph rationale here;
     decisions with rejected alternatives worth remembering become ADRs in
     `.operator/memory/decisions/` and are linked from this section. -->

## Rejected alternatives

<!-- Each serious alternative considered, and the concrete reason it lost.
     "We didn't think of another way" is an answer — write it if true. -->

## Impact

| Dimension | Impact | Notes |
|---|---|---|
| Security | none / low / high | |
| Performance | none / low / high | |
| Operations (deploy, config, migrations) | none / low / high | |
| Documentation | none / needs update | |

## Out of scope

<!-- Explicitly excluded work. Prevents silent scope creep during build. -->

## Risks & assumptions

<!-- Anything unverified. Every assumption listed here must be verified or accepted
     by the operator before ship. -->

<!-- Note: the declared change surface lives in workitem.md → Scope. Keep it current;
     the build gate measures the real diff against it. -->
