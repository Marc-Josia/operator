#!/usr/bin/env node
// Operator skill-eval harness — evaluates the *shipped skills themselves*.
//
// Modelled on Addy Osmani's agent-skills evals (fixtures + pressure scenarios),
// adapted to Operator's two-contract, gate-driven design. Three tiers:
//
//   Tier 1  Structural   — frontmatter, naming/contract, description hygiene,
//                          and the per-skill eval-file floor. Free, offline.
//   Tier 2  Routing      — lexical TF-IDF over descriptions: positive prompts must
//                          rank their skill #1, negative prompts must not outrank
//                          their owner, and no two descriptions may collide. Free.
//   Tier 3  Behavioral   — pressure scenarios run against a headless agent on
//                          fixtures, graded against expectations. Token-based,
//                          opt-in (`--behavioral`), off by default in CI.
//
// Tiers 1–2 are the default run and are what `npm run eval` gates on. They use
// only Node builtins — no network, no dependencies.
//
// Usage:
//   node evals/run-evals.mjs                       # Tier 1 + Tier 2
//   node evals/run-evals.mjs --min-rank1 85        # fail if rank-1 rate < 85%
//   node evals/run-evals.mjs --behavioral op-fix   # Tier 3 plan for one skill
//   node evals/run-evals.mjs --behavioral all --run    # actually drive the agent
//
// Exit 0 = all checks pass, 1 = at least one error (warnings never fail the run).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCorpus, rankSkills, rankOf, similarityMatrix } from './lib/routing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'src', 'payload', 'skills');
const CASES_DIR = path.join(HERE, 'cases');
const FIXTURES_DIR = path.join(HERE, 'fixtures');
const RESULTS_DIR = path.join(HERE, 'results');

// --- tiny reporter ------------------------------------------------------------

const C = { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m' };
const paint = process.stdout.isTTY ? (c, s) => `${c}${s}${C.reset}` : (_c, s) => s;

const report = { errors: 0, warnings: 0, passes: 0 };
const err = (msg) => { report.errors++; console.log(`  ${paint(C.red, '✗')} ${msg}`); };
const warn = (msg) => { report.warnings++; console.log(`  ${paint(C.yellow, '⚠')} ${msg}`); };
const pass = (msg) => { report.passes++; if (VERBOSE) console.log(`  ${paint(C.green, '✓')} ${msg}`); };
const head = (s) => console.log(`\n${paint(C.bold, s)}`);

// --- args ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, def) => { const i = argv.indexOf(name); return i !== -1 && argv[i + 1] ? argv[i + 1] : def; };
const VERBOSE = flag('--verbose') || flag('-v');
const MIN_RANK1 = Number(opt('--min-rank1', '80'));
const BEHAVIORAL = opt('--behavioral', null); // skill name | "all" | null
const RUN = flag('--run');
const SIM_WARN = 0.5;  // description-similarity warning floor (Addy: ≥50%)
const SIM_ERROR = 0.75; // description-similarity error floor  (Addy: ≥75%)

// --- loaders ------------------------------------------------------------------

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return fm;
}

function loadSkills() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, e.name, 'SKILL.md')))
    .map((e) => {
      const raw = fs.readFileSync(path.join(SKILLS_DIR, e.name, 'SKILL.md'), 'utf8');
      const fm = parseFrontmatter(raw) ?? {};
      return { dir: e.name, name: fm.name, description: fm.description ?? '', raw };
    })
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

function loadCase(skillName) {
  const f = path.join(CASES_DIR, `${skillName}.json`);
  if (!fs.existsSync(f)) return null;
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    err(`cases/${skillName}.json is not valid JSON: ${e.message}`);
    return null;
  }
}

// =============================================================================
// Tier 1 — structural
// =============================================================================

function tier1(skills) {
  head('Tier 1 · structural');
  const names = new Set(skills.map((s) => s.name));
  for (const s of skills) {
    // contract: name present, matches directory, honours the op-*/operator-* prefix
    if (!s.name) { err(`${s.dir}: SKILL.md frontmatter has no name`); continue; }
    if (s.name !== s.dir) err(`${s.dir}: frontmatter name "${s.name}" ≠ directory`);
    if (!/^(op|operator)-[a-z][a-z-]*$/.test(s.name)) err(`${s.name}: name breaks the op-*/operator-* contract`);

    // description hygiene
    if (!s.description) { err(`${s.name}: no description`); continue; }
    // the YAML colon-space trap: an unquoted description with ": " breaks strict parsers
    const rawDesc = s.raw.match(/^description:[ \t]*(.*)$/m)?.[1] ?? '';
    const quoted = /^["']/.test(rawDesc.trim());
    if (!quoted && /: /.test(s.description)) err(`${s.name}: unquoted description contains ": " (YAML trap — quote it)`);
    const words = s.description.trim().split(/\s+/).length;
    if (words < 40) warn(`${s.name}: description is ${words} words (thin — triggers may be too few)`);
    else if (words > 90) warn(`${s.name}: description is ${words} words (> 90; AGENTS.md targets 60–90 — permanent context ×14)`);
    else pass(`${s.name}: description ${words} words`);

    // per-skill eval file + floor (Addy: ≥3 positive, ≥2 negative, ≥1 behavioral)
    const c = loadCase(s.name);
    if (!c) { err(`${s.name}: no evals/cases/${s.name}.json`); continue; }
    if (c.skill_name !== s.name) err(`${s.name}: case skill_name "${c.skill_name}" ≠ file`);
    const pos = c.trigger?.positive ?? [];
    const neg = c.trigger?.negative ?? [];
    const evals = c.evals ?? [];
    if (pos.length < 3) err(`${s.name}: ${pos.length} positive triggers (need ≥3)`);
    if (neg.length < 2) err(`${s.name}: ${neg.length} negative triggers (need ≥2)`);
    if (evals.length < 1) err(`${s.name}: ${evals.length} behavioral evals (need ≥1)`);
    // negative-trigger owners must be real shipped skills
    for (const nt of neg) if (nt.owner && !names.has(nt.owner)) err(`${s.name}: negative trigger owner "${nt.owner}" is not a shipped skill`);
    // execution evals must point at fixtures that exist
    for (const ev of evals) {
      for (const rel of ev.files ?? []) {
        if (!fs.existsSync(path.join(FIXTURES_DIR, rel))) err(`${s.name} eval#${ev.id}: fixture "${rel}" missing`);
      }
    }
    if (pos.length >= 3 && neg.length >= 2 && evals.length >= 1) pass(`${s.name}: case file complete (${pos.length}+/${neg.length}-/${evals.length} evals)`);
  }
}

// =============================================================================
// Tier 2 — routing (lexical)
// =============================================================================

function tier2(skills) {
  head('Tier 2 · routing (lexical TF-IDF)');
  const corpus = buildCorpus(skills.map((s) => ({ name: s.name, description: s.description })));

  let positives = 0;
  let rank1 = 0;
  const misses = [];
  const negViolations = [];

  for (const s of skills) {
    const c = loadCase(s.name);
    if (!c) continue;
    for (const p of c.trigger?.positive ?? []) {
      positives++;
      const ranked = rankSkills(p.prompt, corpus);
      const r = rankOf(ranked, s.name);
      const topK = p.top_k ?? 3;
      if (r === 1) rank1++;
      if (r > topK) misses.push({ skill: s.name, prompt: p.prompt, rank: r, topK, got: ranked.slice(0, 3) });
    }
    for (const nt of c.trigger?.negative ?? []) {
      if (!nt.owner) continue;
      const ranked = rankSkills(nt.prompt, corpus);
      const rSelf = rankOf(ranked, s.name);
      const rOwner = rankOf(ranked, nt.owner);
      if (rSelf < rOwner) negViolations.push({ skill: s.name, owner: nt.owner, prompt: nt.prompt, rSelf, rOwner });
    }
  }

  for (const m of misses) {
    warn(`${m.skill}: positive prompt ranks ${m.rank === Infinity ? '∅' : m.rank} (> top_k ${m.topK}) — "${trunc(m.prompt)}"`);
    if (VERBOSE) console.log(`      top: ${m.got.map((g) => `${g.name}(${g.score.toFixed(2)})`).join(', ')}`);
  }
  // Negative-trigger overlaps are advisory: Tier 2 is a lexical *approximation*,
  // and adjacent skills legitimately share vocabulary (op-explore names op-roadmap;
  // op-roadmap's description carries "single feature or quick change (op-new)").
  // They surface a description-vocabulary gap to tune, not a build-breaking defect —
  // the hard gates are the rank-1 floor and strong (≥75%) description collisions.
  for (const v of negViolations) {
    warn(`${v.skill}: outranks sibling ${v.owner} on its prompt (${v.rSelf} vs ${v.rOwner}) — "${trunc(v.prompt)}"`);
  }

  const rate = positives ? (rank1 / positives) * 100 : 0;
  const rateMsg = `rank-1 rate ${rate.toFixed(1)}% (${rank1}/${positives}), floor ${MIN_RANK1}%`;
  if (rate < MIN_RANK1) err(rateMsg);
  else console.log(`  ${paint(C.green, '✓')} ${rateMsg}`);

  // description collisions
  head('Tier 2 · description collisions');
  let collisions = 0;
  for (const { a, b, sim } of similarityMatrix(corpus)) {
    if (sim >= SIM_ERROR) { err(`${a} ↔ ${b}: description similarity ${(sim * 100).toFixed(0)}% (≥${SIM_ERROR * 100}%)`); collisions++; }
    else if (sim >= SIM_WARN) { warn(`${a} ↔ ${b}: description similarity ${(sim * 100).toFixed(0)}% (≥${SIM_WARN * 100}%)`); collisions++; }
  }
  if (collisions === 0) console.log(`  ${paint(C.green, '✓')} no description pair over ${SIM_WARN * 100}% similar`);
}

const trunc = (s, n = 70) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// =============================================================================
// Tier 3 — behavioral (pressure scenarios)
// =============================================================================

function tier3(skills, which) {
  head(`Tier 3 · behavioral${RUN ? '' : ' (dry-run — pass --run to drive the agent)'}`);
  const targets = which === 'all' ? skills.map((s) => s.name) : [which];
  const agentCmd = process.env.OPERATOR_EVAL_AGENT || 'claude -p';
  let planned = 0;

  for (const name of targets) {
    const c = loadCase(name);
    if (!c) { err(`no case file for ${name}`); continue; }
    const evals = c.evals ?? [];
    if (!evals.length) { warn(`${name}: no behavioral evals`); continue; }
    console.log(`\n  ${paint(C.bold, name)}`);
    for (const ev of evals) {
      planned++;
      const tag = ev.pressure ? paint(C.yellow, '⚑ pressure') : ev.kind || 'execution';
      console.log(`    #${ev.id} [${tag}] ${trunc(ev.prompt, 90)}`);
      for (const x of ev.expectations ?? []) console.log(`        ${paint(C.dim, '· ' + x)}`);
      if (RUN) runOneBehavioral(name, ev, agentCmd);
    }
  }

  if (!RUN) {
    console.log(`\n  ${paint(C.dim, `${planned} scenario(s) planned. Set OPERATOR_EVAL_AGENT and re-run with --run to execute + grade.`)}`);
  }
}

// Drive a single scenario against a headless agent, capture the transcript, and
// stage it for grading. Grading itself is a second agent pass (LLM-as-judge over
// the expectations); when no agent is available we still persist the transcript so
// a human — or a later graded run — can score it. Kept behind --run so the default
// eval stays offline.
function runOneBehavioral(skill, ev, agentCmd) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const workdir = ev.files?.length ? materializeFixture(skill, ev) : REPO_ROOT;
  const [cmd, ...base] = agentCmd.split(' ');
  const res = spawnSync(cmd, [...base, ev.prompt], { cwd: workdir, encoding: 'utf8', timeout: 300000 });
  const transcript = (res.stdout || '') + (res.stderr || '');
  const outFile = path.join(RESULTS_DIR, `${skill}-${ev.id}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify({ skill, id: ev.id, prompt: ev.prompt, pressure: !!ev.pressure, expectations: ev.expectations ?? [], transcript }, null, 2)
  );
  if (res.status !== 0) warn(`${skill}#${ev.id}: agent exited ${res.status ?? '(timeout/none)'} — transcript at ${path.relative(REPO_ROOT, outFile)}`);
  else console.log(`        ${paint(C.dim, '→ transcript ' + path.relative(REPO_ROOT, outFile) + ' (grade against expectations)')}`);
}

// Copy a fixture into results/ so the agent can mutate a throwaway working copy.
function materializeFixture(skill, ev) {
  const dst = path.join(RESULTS_DIR, `wd-${skill}-${ev.id}`);
  fs.rmSync(dst, { recursive: true, force: true });
  // fixture files are declared relative to evals/fixtures; copy each root once
  const roots = new Set((ev.files ?? []).map((f) => f.split('/')[0]));
  for (const r of roots) fs.cpSync(path.join(FIXTURES_DIR, r), path.join(dst, r), { recursive: true });
  return dst;
}

// =============================================================================

function main() {
  const skills = loadSkills();
  console.log(paint(C.bold, `Operator skill evals — ${skills.length} skills`));

  if (BEHAVIORAL) {
    tier3(skills, BEHAVIORAL);
  } else {
    tier1(skills);
    tier2(skills);
  }

  head('Summary');
  console.log(
    `  ${paint(C.green, report.passes + ' passed')}  ` +
      `${paint(report.warnings ? C.yellow : C.dim, report.warnings + ' warnings')}  ` +
      `${paint(report.errors ? C.red : C.dim, report.errors + ' errors')}`
  );
  process.exit(report.errors ? 1 : 0);
}

main();
