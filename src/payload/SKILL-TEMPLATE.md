---
name: <folder name>
description: <Use when …, naming the request or situation that triggers it, in the words a user would say, plus the neighbour skill to use instead when one fits better. Under 400 characters. It is the only text the agent sees before picking the skill.>
---

<!-- Operator mission-skill template. Not installed. Copy to src/payload/skills/<name>/SKILL.md, keep these five sections in this order and no others, stay under 60 lines. Write intent and finish lines, never step-by-step "how": the model already knows how. -->

## Mission

One to three sentences: the outcome, who it serves, and why it matters.

## Done when

Bullets the agent can check by running something or reading an artifact. "The PM journey passes on the preview URL", not "the code is clean".

## Never

Hard rules the model would otherwise break here. No generic advice.

## Stop and ask

The only points where the user decides. Product questions in plain words, one or two at a time, each with a recommended answer. Any other choice: decide, state it in one line, continue.

## Hand-off

The next skill by backticked name, with the condition for each branch. Required: it carries the lane order.

## Example

```markdown
---
name: changelog
description: Use when a change is merged or about to merge and the people using the product need to know what changed.
---

## Mission

Tell users what changed for them, in their words, so nobody learns it from a bug report.

## Done when

- `CHANGELOG.md` has one entry per user-visible change in this release, saying what the user can now do or must do differently.
- Every breaking change is marked and says what the user must do.
- Every entry maps to a merged change: nothing invented, nothing user-visible left out.

## Never

- List refactors, dependency bumps or test changes as user news, or rewrite past releases.

## Stop and ask

- A change might break existing users and the ticket does not say: ask whether to announce it as breaking (recommend yes).

## Hand-off

- The change is not merged yet: `pr`.
- Otherwise: report the new entries to the user.
```
