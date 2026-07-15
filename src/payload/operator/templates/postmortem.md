# Postmortem — {{title}}

- Item: {{id}}
- Date: {{date}}
- Attempts: {{n}}

<!-- Written when repeated attempts on the same task stall (the build gate's
     `postmortem-if-thrashing` check fires at config.postmortemThreshold ATTEMPTs).
     This is a postmortem of the *method*, not the bug: the goal is to name why the
     approach kept failing so the next agent does not pay for the same discovery.
     Copy this file to `.operator/work/<id>/postmortem-NNN.md`, fill every section,
     then journal `- <date> POSTMORTEM postmortem-NNN.md: <one line>`. -->

## Symptom

<!-- What kept happening — the observable failure that survived each attempt.
     One or two sentences: expected vs actual, and how it manifested each time. -->

## Attempts summary

<!-- Each attempt and the concrete reason it failed. Draw from the ATTEMPT journal
     lines. The pattern across them is the real subject — name it. -->

1. …

## Root cause of the blockage

<!-- Not the bug's root cause — the *method's*. Missing context, a wrong mental model,
     an unstated assumption, a gap in the spec, a tool that lied. Why did the approach
     keep missing? -->

## Method fix

<!-- The rule, step, or check that would have avoided this. If durable, this becomes a
     lesson (L-NNN) or a convention (C-NNN) at ship. Three postmortems pointing at the
     same defect are promoted to a convention (or an ADR) via op-memory. -->

## Follow-up

<!-- The next action (escalate, re-plan, ask the operator) and any debt consciously
     accepted for later, so it is not silently lost. -->
