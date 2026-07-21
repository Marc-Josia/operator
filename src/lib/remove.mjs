// `operator remove` — uninstall Operator from a project, conservatively.
//
// Removed: the managed AGENTS.md block and the op-init communication-profile
// region, the installed skill directories (and
// their .claude/skills mirrors), and `.operator/` EXCEPT `work/`, `memory/`, and `projects/`
// — those hold the project's history and knowledge and are kept unless
// `--purge`. CLAUDE.md is deleted only when it is exactly our generated
// content; the gemini settings key is reversed entry-by-entry.

import fs from 'node:fs';
import path from 'node:path';
import {
  OperatorError,
  findMarkerBlock,
  findProfileRegion,
  readJson,
  removeMarkerBlock,
  removeProfileRegion,
} from './fsutil.mjs';
import { adapters, installedSkillNames } from './adapters/index.mjs';

function rmdirIfEmpty(p) {
  try {
    if (fs.existsSync(p) && fs.readdirSync(p).length === 0) fs.rmdirSync(p);
  } catch {
    // best-effort cleanup only
  }
}

export async function remove(opts = {}) {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const log = opts.log ?? console.log;

  const operatorDir = path.join(cwd, '.operator');
  if (!fs.existsSync(operatorDir)) {
    throw new OperatorError('.operator/ not found — nothing to remove.');
  }

  const report = { removed: [], kept: [] };
  const installedPath = path.join(operatorDir, '.installed.json');
  let installed = null;
  try {
    installed = fs.existsSync(installedPath) ? readJson(installedPath) : null;
  } catch {
    installed = null;
  }
  const skillNames = installedSkillNames(installed, cwd);

  // AGENTS.md: strip the managed block and the profile region, keep the rest ------
  const agentsPath = path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const content = fs.readFileSync(agentsPath, 'utf8');
    const hadBlock = findMarkerBlock(content) !== null;
    const hadProfile = findProfileRegion(content) !== null;
    if (hadBlock || hadProfile) {
      const stripped = removeProfileRegion(removeMarkerBlock(content));
      const what = [hadBlock && 'managed block', hadProfile && 'communication profile'].filter(Boolean).join(' and ');
      if (stripped.trim()) {
        fs.writeFileSync(agentsPath, stripped);
        report.removed.push(`the ${what} from AGENTS.md`);
        report.kept.push('AGENTS.md — it contains your own content');
      } else {
        fs.rmSync(agentsPath);
        report.removed.push(`AGENTS.md (it contained only the ${what})`);
      }
    }
  }

  // Skills: ours only, then clean up empty parents --------------------------------
  for (const name of skillNames) {
    const dir = path.join(cwd, '.agents', 'skills', name);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      report.removed.push(`.agents/skills/${name}/`);
    }
  }

  // Adapters: conservative reversal ------------------------------------------------
  for (const adapter of Object.values(adapters)) {
    const { removed, kept } = adapter.remove({ cwd, skillNames });
    report.removed.push(...removed);
    report.kept.push(...kept);
  }
  rmdirIfEmpty(path.join(cwd, '.agents', 'skills'));
  rmdirIfEmpty(path.join(cwd, '.agents'));
  rmdirIfEmpty(path.join(cwd, '.claude', 'skills'));
  rmdirIfEmpty(path.join(cwd, '.claude'));

  // .operator/: keep work/ and memory/ unless --purge --------------------------------
  if (opts.purge) {
    fs.rmSync(operatorDir, { recursive: true, force: true });
    report.removed.push('.operator/ entirely, including work/, memory/, and projects/ (--purge)');
  } else {
    for (const entry of fs.readdirSync(operatorDir)) {
      if (entry === 'work' || entry === 'memory' || entry === 'projects') continue;
      fs.rmSync(path.join(operatorDir, entry), { recursive: true, force: true });
      report.removed.push(`.operator/${entry}`);
    }
    if (fs.existsSync(path.join(operatorDir, 'work'))) {
      report.kept.push('.operator/work/ — your work-item history; delete it with `operator remove --purge`');
    }
    if (fs.existsSync(path.join(operatorDir, 'memory'))) {
      report.kept.push('.operator/memory/ — your project knowledge; delete it with `operator remove --purge`');
    }
    if (fs.existsSync(path.join(operatorDir, 'projects'))) {
      report.kept.push('.operator/projects/ — your project roadmaps; delete them with `operator remove --purge`');
    }
    rmdirIfEmpty(operatorDir);
  }

  // Report ----------------------------------------------------------------------------
  log('Operator removed.');
  if (report.removed.length) {
    log('Removed:');
    for (const r of report.removed) log(`  - ${r}`);
  }
  if (report.kept.length) {
    log('Kept (and why):');
    for (const k of report.kept) log(`  - ${k}`);
  }
  return report;
}
