// `operator init` — install Operator into the current project.
//
// Order matters and mirrors the behavior contract:
//   1. refuse on an existing install (point to update); warn outside git
//   2. copy payload/operator/ -> .operator/ and payload/skills/ -> .agents/skills/
//   3. create AGENTS.md or inject the managed block at the top, preserving user content
//   4. apply adapters (detected, or --tools)
//   5. interview (skipped by --yes and on non-TTY stdin; --test-cmd presets)
//   6. write .operator/.installed.json (the hash inventory updates diff against)
//   7. print what happened and the quickstart (first step: run op-init in the agent)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  OperatorError,
  copyDir,
  defaultPackageRoot,
  findMarkerBlock,
  isUnmanagedOperatorPath,
  payloadDir,
  readJson,
  readPayloadVersion,
  renderMarkerBlock,
  sha256,
  sha256File,
  upsertMarkerBlock,
  walkFiles,
  writeJson,
} from './fsutil.mjs';
import { adapters, resolveTools } from './adapters/index.mjs';

export const BLOCK_INVENTORY_KEY = 'AGENTS.md#operator-block';

/** Rebuild the managed-file hash inventory from what is on disk right now.
 *  Covers `.operator/**` minus user-owned paths, plus `.agents/skills/**`,
 *  plus the AGENTS.md managed-block content. Shared with update. */
export function buildInventory(cwd) {
  const files = {};
  const operatorDir = path.join(cwd, '.operator');
  for (const rel of walkFiles(operatorDir)) {
    if (isUnmanagedOperatorPath(rel)) continue;
    files[`.operator/${rel}`] = sha256File(path.join(operatorDir, ...rel.split('/')));
  }
  const skillsDir = path.join(cwd, '.agents', 'skills');
  for (const rel of walkFiles(skillsDir)) {
    files[`.agents/skills/${rel}`] = sha256File(path.join(skillsDir, ...rel.split('/')));
  }
  const agentsPath = path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const found = findMarkerBlock(fs.readFileSync(agentsPath, 'utf8'));
    if (found) files[BLOCK_INVENTORY_KEY] = sha256(found.inner.trim());
  }
  return files;
}

/** Skill directory names shipped in a payload. */
export function payloadSkillNames(payload) {
  const dir = path.join(payload, 'skills');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export async function init(opts = {}) {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const log = opts.log ?? console.log;
  const packageRoot = opts.packageRoot ?? defaultPackageRoot();
  const payload = payloadDir(packageRoot);
  const version = readPayloadVersion(payload);

  const report = { version, tools: [], adapters: [], warnings: [], counts: {} };

  // 1. Preconditions ---------------------------------------------------------
  const operatorDir = path.join(cwd, '.operator');
  const reinstall = fs.existsSync(operatorDir);
  if (reinstall && !opts.force) {
    throw new OperatorError(
      '.operator/ already exists — run `operator update` to refresh managed files.\n' +
        '(Or re-run init with --force to reinstall; work/, memory/, and config.json are preserved.)'
    );
  }
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    const warning =
      'this directory is not a git repository. Operator gates measure git diffs, ' +
      'so run `git init` before starting work items.';
    report.warnings.push(warning);
    log(`warning: ${warning}`);
  }

  // 2. Copy the payload ------------------------------------------------------
  // On --force reinstall, user-owned files that already exist are kept.
  const copiedOperator = copyDir(path.join(payload, 'operator'), operatorDir, {
    filter: (rel) => {
      if (!reinstall) return true;
      const userOwned = rel === 'config.json' || rel.startsWith('memory/') || rel.startsWith('work/');
      return !(userOwned && fs.existsSync(path.join(operatorDir, ...rel.split('/'))));
    },
  });
  const skillNames = payloadSkillNames(payload);
  const copiedSkills = copyDir(path.join(payload, 'skills'), path.join(cwd, '.agents', 'skills'));
  report.counts = { operatorFiles: copiedOperator.length, skillFiles: copiedSkills.length, skills: skillNames.length };

  // 3. AGENTS.md managed block ----------------------------------------------
  const blockBody = fs.readFileSync(path.join(payload, 'agents-block.md'), 'utf8');
  const block = renderMarkerBlock(version, blockBody);
  const agentsPath = path.join(cwd, 'AGENTS.md');
  let agentsAction;
  if (fs.existsSync(agentsPath)) {
    const existing = fs.readFileSync(agentsPath, 'utf8');
    const had = findMarkerBlock(existing) !== null;
    fs.writeFileSync(agentsPath, upsertMarkerBlock(existing, block));
    agentsAction = had
      ? 'replaced the existing managed block (your content untouched)'
      : 'injected the managed block at the top (your content untouched)';
  } else {
    fs.writeFileSync(agentsPath, block + '\n');
    agentsAction = 'created with the managed block';
  }
  report.agentsAction = agentsAction;

  // 4. Adapters ---------------------------------------------------------------
  const { tools, reason } = resolveTools(cwd, opts.tools);
  report.tools = tools;
  log(`adapters: ${reason}`);
  const ctx = { cwd, skillNames };
  for (const name of tools) {
    const actions = adapters[name].apply(ctx);
    report.adapters.push({ name, actions });
    for (const action of actions) log(`  [${name}] ${action}`);
  }

  // 5. Interview --------------------------------------------------------------
  const configPath = path.join(operatorDir, 'config.json');
  const interactive = !opts.yes && (opts.interactive ?? process.stdin.isTTY === true);
  if (interactive) {
    await interview({ cwd, configPath, presetTestCmd: opts.testCmd, log });
  } else {
    if (opts.testCmd != null) {
      const config = readJson(configPath);
      config.testCommand = opts.testCmd;
      writeJson(configPath, config);
      log(`config: testCommand set to "${opts.testCmd}"`);
    } else if (readJson(configPath).testCommand == null) {
      log('config: testCommand not set — set it in .operator/config.json (the tests-pass gate check needs it)');
    }
  }
  report.testCommand = readJson(configPath).testCommand ?? null;

  // 6. Install inventory -------------------------------------------------------
  writeJson(path.join(operatorDir, '.installed.json'), {
    version,
    installedAt: new Date().toISOString(),
    tools,
    files: buildInventory(cwd),
  });

  // 7. Report + quickstart ------------------------------------------------------
  log('');
  log(`Operator v${version} installed.`);
  log('');
  log('Written:');
  log(`  AGENTS.md            ${agentsAction}`);
  log(`  .operator/           constitution, gates, gate checker, templates, memory seeds (${copiedOperator.length} files)`);
  log(`  .agents/skills/      ${skillNames.length} skill(s)`);
  if (tools.length) log(`  adapters             ${tools.join(', ')}`);
  log('');
  log('Quickstart:');
  log('  1. Open your agent tool in this project.');
  log('  2. Say "set up Operator" — it runs op-init: surveys the codebase, confirms your test');
  log('     command, and asks where to track work (markdown, GitHub Issues, or Linear).');
  log('  3. Then say what you want built — the AGENTS.md routing engages op-new.');
  log('  4. Check progress any time: node .operator/bin/op.mjs status');
  return report;
}

/** Interactive interview over node:readline. Never reached in tests or CI:
 *  --yes skips it, and non-TTY stdin falls back to flag values only. */
async function interview({ cwd, configPath, presetTestCmd, log }) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const config = readJson(configPath);

    let testCommand = presetTestCmd ?? null;
    if (testCommand == null) {
      const answer = (await rl.question('Test command for this project (empty to configure later): ')).trim();
      testCommand = answer || null;
    }
    if (testCommand) {
      const run = (await rl.question(`Smoke-run \`${testCommand}\` now? [y/N] `)).trim().toLowerCase();
      if (run === 'y' || run === 'yes') {
        const result = spawnSync(testCommand, { shell: true, cwd, stdio: 'inherit' });
        if (result.status === 0) log('test command exited 0 — good.');
        else log(`warning: test command exited ${result.status ?? 'with an error'} — kept anyway; fix it before the first build gate.`);
      }
    }
    config.testCommand = testCommand;

    log('Protected paths (never travel the quick lane, force a security review):');
    for (const p of config.protectedPaths ?? []) log(`  - ${p}`);
    const keep = (await rl.question('Keep this list? [Y/n] ')).trim().toLowerCase();
    if (keep === 'n' || keep === 'no') {
      const custom = (await rl.question('Comma-separated globs (`**`, `*`, `?` supported): ')).trim();
      if (custom) config.protectedPaths = custom.split(',').map((s) => s.trim()).filter(Boolean);
    }

    writeJson(configPath, config);
  } finally {
    rl.close();
  }
}
