# ADR-0008: Three lanes with measured-diff caps; quick caps 3 files / 80 lines

- Status: accepted
- Date: 2026-07-14

## Context

Senior engineers right-size process; a toolkit that demands a spec for a typo gets routed
around, which is worse than a lenient lane. But a "quick" lane is also the obvious abuse
vector. The panel judge proposed caps of 2 files / ~30 changed lines and itself flagged
over-gating backlash as a risk.

## Decision

Three lanes — **quick** (no spec document, never skips verification), **standard** (default,
spec-lite), **full** (spec + architecture + ADRs) — chosen by a yes/no triage scorecard in
the work item. Quick-lane caps are verified against the **measured diff** at the build gate:
defaults **3 files / 80 changed lines** (config-tunable), deliberately looser than the
judge's 2/30 because caps that fire on ordinary small fixes teach users to abandon the tool.
Protected paths never travel quick. Escalation is one-way with a mid-task tripwire;
de-escalation and waivers require the operator's quoted instruction in the journal.

## Consequences

- The lane is a checkable fact, not a promise.
- Escalation frequency is a health signal op-ship's retro should watch.
- Cap defaults may need tuning from real usage; they live in config.json, not in prose.
