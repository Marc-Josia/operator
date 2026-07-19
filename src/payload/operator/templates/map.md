---
id: {{id}}
title: {{title}}
status: exploring
created: {{date}}
updated: {{date}}
next: {{next-action}}
---

# {{title}} — exploration map

## Problem

<!-- The confirmed problem this exploration navigates, carried from the op-discover brief in the
     operator's terms. The problem is settled; what is unknowable is the path. -->

## Decisions

<!-- One line per decision you can POSE PRECISELY (the fog-of-war test: can you pose the
     question? — not: can you answer it?). Phrase each as behaviour and intent, never paths or
     symbols of today's code — a decision may wait weeks for its session.
     type: research (a fact answers it, AFK) · prototype (a throwaway build answers it, AFK;
     spike code never ships) · grilling (only the operator can answer, HITL).
     blocked-by names the sibling decisions that must resolve first; omit it when the decision
     can start now. Work the frontier: any unresolved decision whose blockers are all resolved.
     On resolution, check the box and add "— resolved: <answer>" (evidence goes in the Journal). -->

- [ ] {{first-decision-question}} — type: {{research|prototype|grilling}}
- [ ] {{second-decision-question}} — type: {{type}} — blocked-by: {{first-decision-question}}

## Not yet specified

<!-- The fog: directions you only sense, not yet posable as precise questions. Re-read this
     section at the start of every session; each resolution sharpens it. Promote an entry to
     Decisions the moment you can pose it. -->

## Journal

<!-- Append-only. One line per event, newest last, date-prefixed.
     Event vocabulary: CREATED, APPROVAL (map, collapse), RESOLVED (decision + answer + evidence),
     PROMOTED (from Not yet specified), DISCARDED (direction → out-of-scope memory), REPLANNED,
     COLLAPSED, ABANDONED. -->

- {{date}} CREATED status=exploring

## Progress

<!-- A short living summary the operator reads first: decisions resolved / open, the current
     frontier, what the next session should take, and how close the collapse looks. -->
