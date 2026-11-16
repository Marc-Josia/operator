---
name: ci
description: Use when no CI runs the project's checks on every change, when the user asks to set up CI, or when a change edits the pipeline (workflows, required checks, deploy steps).
---

## Mission

Every change runs the project's checks automatically and a red check blocks the merge, so the quality bar holds without anyone remembering it. Trigger: no CI runs the checks on every change (repo setup, done once), or the change edits the pipeline. Setup leaves the pipeline as the check every later change goes through.

## Done when

- The pipeline runs on every pull request and every push to the main branch, and runs the commands in `CONSTRAINTS.md` (otherwise lint, typecheck, tests, build), plus the dependency audit and a secret scan.
- Installs are frozen to the committed lockfile; third-party actions are pinned to a version or commit.
- Secrets live only in the CI secret store; no workflow file or log prints one.
- A deliberately failing check on a throwaway branch turned the pipeline red and the merge was blocked (required checks verified); the throwaway branch is deleted.
- The pipeline is green on the current branch; the run link is in the report.
- The test suite stage finishes in under ten minutes, or the report says why not and what would cut it.
- If the host supports it, each pull request gets a preview deployment, so `ship` has a URL to hand the PM.
- If CI deploys, a rollback (redeploy the previous version or turn a flag off) exists and was run once on a non-production target.

## Never

- Skip, disable, mark allowed-to-fail, or rerun-until-green a failing or flaky check. Fix it; lowering the bar to get green goes to `constraints`.
- Push to the main branch to try the pipeline.
- Put secrets in workflow files, or echo them in a step.
- Let CI deploy to production with no human approval unless the PM chose that.

## Stop and ask

- Merge blocking needs repo admin rights: "Should nobody, you included, be able to merge while checks are red?" Recommend yes; give the PM the exact settings path if only they can switch it on.
- Release cadence: "Should every merge go live to users automatically, or do you press the button?" Recommend pressing the button until error alerts exist.
- CI minutes or a hosting plan cost money: state the monthly estimate and recommend the cheapest plan that fits.
- Any other choice (CI provider, job layout, caching, matrix): decide, list one line each, continue.

## Hand-off

- First whose trigger holds: `review` in high-risk mode (`security` fired, data or schema migrates, a public interface changes, or the release reaches users), `migration` (old code leaving or a production schema change), `ship` (the change reaches users).
- None holds: the merge gate, then `retro`.
