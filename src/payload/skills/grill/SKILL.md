---
name: grill
description: Use when the user describes something they want built or changed (a feature, an idea, a product, a plan) and what ships, for whom, or how we will know it works is not settled yet. Asks product questions only and ends at the understanding gate. Not for a change the user already stated in one sentence (that is `implement`).
---

## Mission

Reach a shared understanding with the user, the Product Manager (PM), of what to build, in product terms, before anything is written. The PM owns who, what problem, and what success looks like; the agent owns every technical choice. Everything downstream rests on this, so nothing in it may be a guess.

## Done when

- Every product branch is settled, none silently assumed: who it is for, what problem it solves, what success looks like (a journey the PM could try), what is out of scope, and what wins when two goals trade off.
- Technical choices are decided by the agent and listed one line each; the PM saw the list and every veto is applied.
- The agent stated, in about five lines, what ships, for whom, how we know it works, and what is out, and the PM confirmed it. This is the understanding gate.
- In a repo: every domain term that resolved is in `GLOSSARY.md` (per context when `GLOSSARY-MAP.md` exists), in product words, written as it resolved. An old `CONTEXT.md` with no `GLOSSARY.md` was renamed with `git mv` first and the PM told. No repo: the terms are in the summary instead.

## Never

- Ask a technical question (stack, schema, library, architecture, test strategy). Decide it and list it.
- Ask the PM for a fact you can find yourself (the code, the docs, the web). Look it up, in a subagent when it is slow, and keep asking the questions that do not depend on it.
- Ask more than two questions at once, ask one without a recommended answer, or use words the PM did not use first.
- Answer your own questions, or read silence as yes.
- Let a contradiction pass: the PM's words against the code, or one term used for two things. Say it plainly and ask which is right.
- Put implementation details, plans, or open questions in `GLOSSARY.md`; it holds terms and nothing else.
- Write a spec, tickets, or code before the PM confirmed the summary.

## Stop and ask

- Each product question: one or two at a time, plain words, each with a recommended answer and its reason in one clause, worded so "yes" accepts it. Ask only questions whose prerequisites are already answered.
- The final summary: the PM confirms it or corrects it. Correction reopens the affected branch only.

## Hand-off

- The vision holds several user-visible increments and cannot be understood in one session: `wayfinder`.
- The PM cannot answer without seeing it (a layout, a flow, how state behaves): `prototype`, then back here.
- Confirmed, it fits one session, and nothing is left to design: a short plan in chat, then `implement`.
- Confirmed: `spec`.
