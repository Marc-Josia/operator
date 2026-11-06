---
name: writing-for-agents
description: Use when writing or editing any document an agent reads - a skill, `AGENTS.md`, `CLAUDE.md`, a project skill, or a doc behind a pointer.
---

## Mission

Make every document an agent reads steer it the same way on every run, at the lowest context cost. The model already knows how to do the work: the document carries only what it cannot infer.

## Done when

- Every sentence changes behaviour against the model's default. Sentences that do not are deleted whole, not trimmed.
- What stays is what the model cannot find by looking: intent, finish lines, hard rules, where the human decides, unwritten conventions, the reason behind a choice, gotchas no config shows.
- Facts the repo already holds (scripts, config, folder layout, `--help`) are pointed to, not copied.
- Each meaning lives in one place across the document, `AGENTS.md` and the skills.
- Every finish line can be checked by running something or reading an artifact.
- Always-loaded text is the shortest: an `AGENTS.md` line or a skill description leads with its trigger and names each distinct case once.
- Material only some cases need sits in a separate file, behind a pointer whose wording says when to read it.
- A new skill has exactly these sections, in order: Mission, Done when, Never, Stop and ask, Hand-off. It stays under 60 lines and carries no step-by-step how.
- Rules are stated as the behaviour wanted. A prohibition stays only as a hard rule, paired with what to do instead.
- The prose passed through `unslop`.

## Never

- Edit between `operator:start` and `operator:end` in `AGENTS.md`, or an installed pstack skill: updates overwrite both. Project rules go after `operator:end` or in a project skill.
- Add filler: intros, summaries of the next section, "make sure to", "be careful".
- Write procedure the model already knows.

## Stop and ask

- The edit changes how the agent works with the PM (what it asks, where it stops, what ships without them): show the old and new rule in one plain line each and ask (recommend the smaller change).

## Hand-off

- `unslop` on the result, then back to the skill that called this one (`retro`, or the work in progress).
