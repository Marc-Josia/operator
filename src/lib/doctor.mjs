// `operator doctor` — health checks for an Operator install.
//
// Every check reports [ok]/[warn]/[error] with a concrete fix. `--fix` repairs
// the mechanical issues only (re-insert markers/import, re-mirror skills) —
// it never overwrites user-modified files; that is `operator update`'s job.
// `--strict` turns warnings into a non-zero exit for CI.

import fs from 'node:fs';
import path from 'node:path';
import {
  OperatorError,
  defaultPackageRoot,
  findMarkerBlock,
  journalLines,
  parseFrontmatter,
  payloadDir,
  readJson,
  readPayloadVersion,
  renderMarkerBlock,
  sha256,
  sha256File,
  upsertMarkerBlock,
} from './fsutil.mjs';
import { adapters, detectTools, installedSkillNames } from './adapters/index.mjs';
import { BLOCK_INVENTORY_KEY } from './init.mjs';

const SIZE_WARN = 24 * 1024; // AGENTS.md — Codex truncates instruction chains near 32KiB
const SIZE_ERROR = 32 * 1024;

/** Phrases an expertise pack must never contain: they instruct state changes,
 *  and only op-* procedures may move work-item state. A grep heuristic, so a
 *  finding is a warning, not an error. */
const STATE_PHRASES = /append to the journal|set stage|update frontmatter/i;

export async function doctor(opts = {}) {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const log = opts.log ?? console.log;
  const packageRoot = opts.packageRoot ?? defaultPackageRoot();
  const payload = payloadDir(packageRoot);

  const operatorDir = path.join(cwd, '.operator');
  if (!fs.existsSync(operatorDir)) {
    throw new OperatorError('.operator/ not found — run `operator init` first.');
  }

  const checks = [];
  const push = (level, id, message, fix) => checks.push({ level, id, message, fix });

  // Install inventory ---------------------------------------------------------
  const installedPath = path.join(operatorDir, '.installed.json');
  let installed = null;
  if (fs.existsSync(installedPath)) {
    try {
      installed = readJson(installedPath);
    } catch {
      push('error', 'installed-json', '.operator/.installed.json is not valid JSON — re-run `operator update` to rebuild it');
    }
  } else {
    push('warn', 'installed-json', '.operator/.installed.json missing — drift checks skipped; re-run `operator update` to rebuild it');
  }

  const tools = installed?.tools ?? detectTools(cwd);
  const skillNames = installedSkillNames(installed, cwd);

  // AGENTS.md markers + size ---------------------------------------------------
  const agentsPath = path.join(cwd, 'AGENTS.md');
  const agentsContent = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf8') : null;
  const block = agentsContent === null ? null : findMarkerBlock(agentsContent);
  if (!block) {
    push(
      'error',
      'agents-markers',
      agentsContent === null
        ? 'AGENTS.md missing — agents get no Operator instructions'
        : 'operator marker block missing from AGENTS.md — agents get no Operator instructions',
      () => {
        const version = readPayloadVersion(payload);
        const body = fs.readFileSync(path.join(payload, 'agents-block.md'), 'utf8');
        fs.writeFileSync(agentsPath, upsertMarkerBlock(agentsContent ?? '', renderMarkerBlock(version, body)));
      }
    );
  } else {
    push('ok', 'agents-markers', `AGENTS.md managed block present${block.version ? ` (v${block.version})` : ''}`);
  }
  if (agentsContent !== null) {
    const bytes = Buffer.byteLength(agentsContent, 'utf8');
    if (bytes >= SIZE_ERROR) {
      push('error', 'agents-size', `AGENTS.md is ${bytes} bytes (>= 32KiB) — Codex truncates the instruction chain; trim non-Operator content`);
    } else if (bytes >= SIZE_WARN) {
      push('warn', 'agents-size', `AGENTS.md is ${bytes} bytes (>= 24KiB) — approaching the 32KiB Codex instruction-chain cap`);
    } else {
      push('ok', 'agents-size', `AGENTS.md size ok (${bytes} bytes)`);
    }
  }

  // Adapter wiring (claude import + skills mirror) ------------------------------
  if (tools.includes('claude')) {
    const issues = adapters.claude.check({ cwd, skillNames });
    if (issues.length === 0) push('ok', 'claude', 'CLAUDE.md import and .claude/skills/ mirror intact');
    for (const issue of issues) push(issue.level, issue.id, issue.message, issue.fix);
  }

  // Managed-file drift vs .installed.json ---------------------------------------
  if (installed?.files) {
    let drift = 0;
    for (const [target, hash] of Object.entries(installed.files)) {
      if (target === BLOCK_INVENTORY_KEY) {
        if (block && sha256(block.inner.trim()) !== hash) {
          push('warn', 'managed-drift', 'the AGENTS.md managed block differs from the installed version — hand-edited? `operator update` rewrites it');
          drift++;
        }
        continue;
      }
      const dest = path.join(cwd, ...target.split('/'));
      if (!fs.existsSync(dest)) {
        push('error', 'managed-missing', `${target} is missing — run \`operator update\` to restore it`);
        drift++;
      } else if (sha256File(dest) !== hash) {
        push('warn', 'managed-drift', `${target} modified since install — \`operator update\` keeps your copy and writes ${target}.operator-new`);
        drift++;
      }
    }
    if (drift === 0) {
      push('ok', 'managed-files', `${Object.keys(installed.files).length} managed file(s) match the installed inventory`);
    }
  }

  // Config sanity ----------------------------------------------------------------
  let config = null;
  const configPath = path.join(operatorDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    push('error', 'config', '.operator/config.json missing — gates cannot read caps or protected paths; run `operator init --force`');
  } else {
    try {
      config = readJson(configPath);
    } catch {
      push('error', 'config', '.operator/config.json is not valid JSON — fix it; gates cannot run without it');
    }
  }
  if (config) {
    if (config.testCommand === null || config.testCommand === undefined) {
      push('warn', 'config-test-command', 'testCommand is not set — the tests-pass gate check cannot run; set it in .operator/config.json');
    } else if (config.testCommand === false) {
      push('warn', 'config-test-command', 'testCommand is false (tests waived) — every build gate needs a journaled `WAIVER tests` line');
    } else {
      push('ok', 'config-test-command', `testCommand: ${JSON.stringify(config.testCommand)}`);
    }
    if (!Array.isArray(config.protectedPaths) || config.protectedPaths.length === 0) {
      push('warn', 'config-protected-paths', 'protectedPaths is empty — nothing forces the security review or blocks the quick lane');
    } else {
      push('ok', 'config-protected-paths', `${config.protectedPaths.length} protected path pattern(s)`);
    }
  }

  // Memory caps --------------------------------------------------------------------
  const caps = config?.memoryCaps ?? {};
  let overCap = 0;
  for (const [key, file] of [['project', 'project.md'], ['conventions', 'conventions.md'], ['lessons', 'lessons.md']]) {
    const cap = caps[key];
    if (!cap) continue;
    const p = path.join(operatorDir, 'memory', file);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).length;
    if (lines > cap) {
      push('warn', 'memory-caps', `memory/${file} is ${lines} lines (cap ${cap}) — run the op-memory consolidation`);
      overCap++;
    }
  }
  if (overCap === 0 && Object.keys(caps).length) push('ok', 'memory-caps', 'memory files within their caps');

  // Work-item state consistency ------------------------------------------------------
  let gates = null;
  try {
    gates = readJson(path.join(operatorDir, 'gates.json'));
  } catch {
    push('error', 'gates-json', '.operator/gates.json missing or invalid — run `operator update` to restore it');
  }
  const workDir = path.join(operatorDir, 'work');
  let itemProblems = 0;
  let itemCount = 0;
  if (fs.existsSync(workDir) && gates) {
    for (const entry of fs.readdirSync(workDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      itemCount++;
      const id = entry.name;
      const wiPath = path.join(workDir, id, 'workitem.md');
      if (!fs.existsSync(wiPath)) {
        push('warn', 'workitem', `work/${id}/ has no workitem.md`);
        itemProblems++;
        continue;
      }
      const content = fs.readFileSync(wiPath, 'utf8');
      const { data, error } = parseFrontmatter(content);
      if (error) {
        push('error', 'workitem-frontmatter', `work/${id}/workitem.md: ${error}`);
        itemProblems++;
        continue;
      }
      const lane = data.lane;
      const stage = data.stage;
      const laneDef = gates.lanes?.[lane];
      if (!laneDef) {
        push('error', 'workitem-lane', `work/${id}: unknown lane "${lane}" (known: ${Object.keys(gates.lanes ?? {}).join(', ')})`);
        itemProblems++;
        continue;
      }
      if (!laneDef.stages.includes(stage)) {
        push('error', 'workitem-stage', `work/${id}: stage "${stage}" is not valid for lane "${lane}" (${laneDef.stages.join(' -> ')})`);
        itemProblems++;
        continue;
      }
      // Stage should match what the journal proves: the last passed gate advanced it.
      let lastGate = null;
      for (const line of journalLines(content)) {
        const m = line.match(/GATE\s+(\S+)\s+PASSED/);
        if (m) lastGate = m[1];
      }
      const expected = lastGate ? gates.gates?.[lastGate]?.advancesTo?.[lane] : laneDef.stages[0];
      if (expected && expected !== stage) {
        push('warn', 'workitem-journal', `work/${id}: stage is "${stage}" but the journal implies "${expected}" (last passed gate: ${lastGate ?? 'none'})`);
        itemProblems++;
      }
    }
  }
  if (itemCount > 0 && itemProblems === 0) push('ok', 'work-items', `${itemCount} work item(s) consistent`);

  // Expertise-pack invariant ------------------------------------------------------------
  const skillsRoot = path.join(cwd, '.agents', 'skills');
  let packProblems = 0;
  if (fs.existsSync(skillsRoot)) {
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('operator-')) continue;
      const skillMd = path.join(skillsRoot, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const m = fs.readFileSync(skillMd, 'utf8').match(STATE_PHRASES);
      if (m) {
        push('warn', 'expertise-invariant', `.agents/skills/${entry.name}/SKILL.md says "${m[0]}" — expertise packs advise only and never move work-item state`);
        packProblems++;
      }
    }
  }
  if (packProblems === 0) push('ok', 'expertise-invariant', 'expertise packs advise only (no state-change phrasing found)');

  // Apply fixes, report, summarize --------------------------------------------------------
  const fixed = [];
  if (opts.fix) {
    for (const check of checks) {
      if (check.level !== 'ok' && typeof check.fix === 'function') {
        check.fix();
        check.fixed = true;
        fixed.push(check.id);
      }
    }
  }
  for (const check of checks) {
    log(`[${check.fixed ? 'fixed' : check.level}] ${check.message}`);
  }
  const errors = checks.filter((c) => c.level === 'error' && !c.fixed).length;
  const warnings = checks.filter((c) => c.level === 'warn' && !c.fixed).length;
  const ok = errors === 0 && (!opts.strict || warnings === 0);
  log('');
  log(`doctor: ${errors} error(s), ${warnings} warning(s)${fixed.length ? `, ${fixed.length} fixed` : ''}${opts.strict ? ' [strict]' : ''}`);
  if (!ok && !opts.fix && checks.some((c) => c.level !== 'ok' && c.fix)) {
    log('some issues are mechanically repairable — re-run with --fix');
  }
  return { checks, errors, warnings, fixed, ok };
}
