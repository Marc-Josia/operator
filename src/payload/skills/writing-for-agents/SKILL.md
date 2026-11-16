---
name: writing-for-agents
description: Use when writing or editing any document an agent reads (a skill, `CLAUDE.md`, `AGENTS.md`, a doc behind a pointer), or when creating a project skill.
---

## Mission

Make every document an agent reads steer it the same way on every run, at the lowest context cost. The model already knows how to do the work: the document carries only what it cannot infer.

## Done when

- Every sentence changes behaviour against the model's default. Sentences that do not are deleted whole, not trimmed.
- What stays is what the model cannot find by looking: intent, finish lines, hard rules, where the human decides, unwritten conventions, the reason behind a choice, gotchas no config shows.
- Facts the repo already holds (scripts, config, folder layout, `--help`) are pointed to, not copied.
- Each meaning lives in one place across the document, the instruction files and the skills.
- Every finish line can be checked by running something or reading an artifact.
- Always-loaded text is the shortest: an instruction-file line or a skill description leads with its trigger, in the words a user would say, and names each distinct case once. A skill description starts with "Use when", says when not to use it if a neighbour skill fits better, and stays under 400 characters: the agent picks skills from descriptions alone.
- A project skill lives in the agent's skills folder (`.claude/skills/<name>/SKILL.md` for Claude Code) and is a procedure, never a router: exact commands, its scripts beside it, how to verify the result and what to do on failure. It ran once after it was written, and what broke was fixed.
- Material only some cases need sits in a separate file, behind a pointer whose wording says when to read it.
- A new skill has exactly these sections, in order: Mission, Done when, Never, Stop and ask, Hand-off. It stays under 60 lines and carries no step-by-step how.
- Rules are stated as the behaviour wanted. A prohibition stays only as a hard rule, paired with what to do instead.
- The prose passed through `unslop`.

## Never

- Edit an installed Operator or pstack skill: `operator update` overwrites it. Project rules go in the project's instruction file or a project skill.
- Add filler: intros, summaries of the next section, "make sure to", "be careful".
- Raise the volume to push a rule (capitals, "CRITICAL", "IMPORTANT", a rule repeated): current models follow plain wording and over-apply shouted rules. State it once, with its reason.
- Write procedure the model already knows.

## Stop and ask

- The edit changes how the agent works with the PM (what it asks, where it stops, what ships without them): show the old and new rule in one plain line each and ask (recommend the smaller change).

## Hand-off

- `unslop` on the result, then back to the skill that called this one (`retro`, or the work in progress).
