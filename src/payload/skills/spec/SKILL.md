---
name: spec
description: Use when the PM confirmed a shared understanding of a feature and no spec exists yet, or the user asks for a spec, a PRD, or written requirements. Not for a change that fits one session with a short plan.
---

## Mission

Turn the confirmed understanding into one spec an agent can build from without asking, and a PM can read without a dictionary. The product part is the PM's, in their words; the technical part is the agent's, decided and stated so the PM can veto. This is synthesis, not a second interview.

## Done when

- The spec is where the tracker field of `.operator/state.json` says (in the repo, else `~/.operator/state.json`): missing or local, `docs/changes/<change-id>/spec.md` with `<change-id>` a short kebab-case name; github, GitHub issues; linear, Linear; any other text names the place.
- When the tracker names a platform whose tool is missing here (no `gh`, no Linear MCP), the spec is in local markdown and the PM was told why in one line.
- Product part, in the PM's words and the glossary's terms: the problem, who has it, what they can do once it ships (user stories), the journey the PM will try to know it works, what is out of scope.
- Technical part, decided by the agent: one line per decision (what changes, data shape, interfaces, the seams where tests prove the journey, risks). Each line can be vetoed on its own.
- Every claim traces to the conversation, the glossary, or the code. No file paths or code, except a state shape or schema a prototype settled, trimmed to the decision.
- A decision that is hard to reverse, surprising later, and a real trade-off has a short record in `docs/adr/`; nothing else does.

## Never

- Re-interview the PM on what the grill already settled, or ask them a technical question.
- Invent product behavior the conversation did not settle. A gap is a question, not an assumption.
- Write horizontal plans (a backend phase, then a frontend phase) into the spec; slicing belongs to `tickets`.
- Publish to a platform you cannot reach, or silently pick another location than the tracker.

## Stop and ask

- A product gap the grill left open: one or two questions, each with a recommended answer. More than two gaps: go back to `grill`.
- A veto on a technical line that changes what the PM gets: say what it costs in product terms, recommend, let them pick.

## Hand-off

- Product gaps remain after the questions: `grill`.
- Otherwise: `tickets`, in the same pass.
