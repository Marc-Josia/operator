# Operator

This project has **Operator** installed — an engineering method (work items, gates, durable
memory) the operator engages deliberately. By default, work as a normal coding agent: answer
and make changes directly, and do **not** invoke `op-*`/`operator-*` skills, create work items,
or route requests.

## Engaging Operator

The method engages only when the operator's message starts with **`/operator`** (or explicitly
asks for Operator by name). What follows `/operator` is the request, in plain language: classify
it and run the matching procedure yourself — never ask "which command?". Bare `/operator` with no
request → run `op-status` and report where things stand.

When engaged you are the **router**. Read the constitution's `## Routing` section and dispatch to
the one procedure that fits: new work, a bug, a spec, a build, a ship, a status check, a memory
correction — plus the discovery, exploration, and roadmap procedures for work too fuzzy or too big
for a single item. Expertise packs (`operator-*`) advise; they never move work-item state. Resuming
an item already in flight? Its `stage:` names the procedure — check `op-status` first if unsure.

If your tool supports skills or slash commands, invoke them. Otherwise read
`.agents/skills/<name>/SKILL.md` and follow it literally.

## Iron rules (once engaged)

1. **Understand before you build.** Development work happens inside a work item
   (`.operator/work/<id>/workitem.md`). Standard- and full-lane items need an approved spec
   (approval journaled) before any implementation code is written.
2. **Gates are checked, not asserted.** Run `node .operator/bin/op.mjs gate <id>` to pass a
   stage. Never claim a gate passed without the checker's output (no Node? apply the checklist
   in `.operator/gates.json` manually and journal the evidence).
3. **Only `op-*` procedures move work-item state.** Expertise packs (`operator-*`) advise;
   they never change stage, lane, or journal. The journal is append-only.
4. **Load memory before you touch code.** Read `.operator/memory/project.md` at task start,
   plus every rule in `.operator/memory/conventions.md` whose `paths:` matches files you will
   touch. If `project.md` is still an empty seed, survey the codebase and fill it first.
5. **Protected paths never travel the quick lane** (list: `.operator/config.json`).

## System documents

- `.operator/constitution.md` — values, laws, orchestration policy, and the full routing tree.
  Read it when engaging Operator or resuming a work item.
- `.operator/work/<id>/workitem.md` — the single source of truth for each work item.
- `.operator/memory/` — durable project knowledge. Never duplicate what is already there.
