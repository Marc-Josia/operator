---
name: wayfinder
description: Use when a vision is too big for one grill-to-spec session (several releases, a new product, a large overhaul) and needs to be cut into milestones first.
---

## Mission

Turn a big, foggy vision into a short, ordered list of milestones, each one something users can see and try, so the PM steers by product value and every milestone runs through the normal lane on its own. It must feel like a roadmap the PM owns, not an engineering plan.

## Done when

- The destination is stated in one or two lines and the PM confirmed it.
- Each milestone is one line: what a user can do once it lands, and how the PM will try it. No milestone is invisible work; foundations ride inside the first milestone that needs them, said in one line.
- The PM ordered the milestones by product value. A technical dependency that forces a different order is stated in one line and kept unless they veto.
- What is past the destination is listed as out of scope. What is in scope but still too vague to cut is listed loosely as later, not forced into milestones.
- The map is saved where the AGENTS.md line under `## Project context` says ("Specs and tickets live in: …"); no line: `docs/changes/<change-id>/milestones.md`; platform tool missing (no `gh`, no Linear MCP): the same, and the PM was told why in one line.
- After each milestone ships, the map is updated: milestone marked done with a one-line outcome, newly clear later items turned into milestones, the PM re-confirmed the order.

## Never

- Write technical sequencing, layers, components, or estimates into the map, or ask the PM about them.
- Detail any milestone beyond the next one. Its detail comes from its own `grill`.
- Grill or build more than one milestone per session.
- Ask the PM a fact you can find yourself; find it, and keep the decisions for them.
- Cut a map when the whole vision fits one grill-to-spec session.

## Stop and ask

- The destination: confirm it in one or two lines, with your recommended wording.
- The order: present the milestones with your recommended order by value and why in one clause each; the PM reorders, merges, or drops.
- After a milestone ships: keep the order or change it (recommend one).

## Hand-off

- The vision fits one session after all: `grill`, no map.
- Map confirmed: `grill` on the first milestone, which then runs `spec`, `tickets`, and the build lane.
- A milestone shipped: back to `wayfinder` to update the map, then `grill` on the next.
