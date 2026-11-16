import { legacyOnlySkillNames, loadCatalog, managedSkillNames } from './catalog.mjs';
import { legacyReferencesStatus } from './references.mjs';
import { detectLegacyFiles } from './legacy-files.mjs';
import { readState } from './state.mjs';
import { destRoot, diffSkills, listInstalledSkills } from './scan.mjs';
import { legacyGlossaryFiles } from './glossary.mjs';
import { tokenEconomizerStatus } from './token-economizer.mjs';

/**
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   global?: boolean,
 *   env?: NodeJS.ProcessEnv,
 *   homedir?: string,
 *   log?: (message: string) => void,
 * }} opts
 */
export function status(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const log = opts.log ?? console.log;
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  const { state } = readState(root);
  const installed = listInstalledSkills(root);
  const expected = managedSkillNames(catalog);
  const skills = diffSkills(expected, installed);
  const legacySkills = legacyOnlySkillNames(catalog).filter((name) => installed.has(name));
  const legacyRefs = legacyReferencesStatus(root);
  const legacyFiles = detectLegacyFiles(cwd, state.claudeMd);
  const tracker = state.tracker;
  const legacyGlossary = legacyGlossaryFiles(cwd);
  const tokenEconomizer = tokenEconomizerStatus({ env: opts.env, homedir: opts.homedir });

  const lines = [];
  lines.push(`Operator status (${opts.global ? 'global' : 'project'})`);
  lines.push('');
  lines.push(`Agents: ${state.agents?.join(', ') ?? 'none saved'}`);
  lines.push(tracker
    ? `Tracker: ${tracker}`
    : 'Tracker: not set, skills use local markdown (operator update --tracker local|github|linear|"<where>")');
  lines.push('');
  lines.push(`Skills: ${skills.present.length}/${expected.length} installed`);
  for (const name of expected) {
    const mark = installed.has(name) ? 'ok' : 'missing';
    const where = installed.get(name)?.join(', ') ?? '';
    lines.push(`  [${mark}] ${name}${where ? `  (${where})` : ''}`);
  }
  if (legacySkills.length > 0) {
    lines.push('');
    lines.push(`Leftover v2 skills: ${legacySkills.join(', ')} (run operator update to remove them)`);
  }
  if (legacyFiles.any) {
    lines.push('');
    lines.push('Left by an older Operator (run operator update to clean them):');
    if (legacyFiles.operatorMd) lines.push('  OPERATOR.md');
    if (legacyFiles.agentsBlock) lines.push('  AGENTS.md: Operator block');
    if (legacyFiles.trackerLine) lines.push('  AGENTS.md: tracker line');
    if (legacyFiles.claudeImport) lines.push('  CLAUDE.md: @AGENTS.md import added by Operator');
  }
  if (legacyRefs.managed) {
    lines.push('');
    lines.push('References: v2 managed references/ still present (run operator update to purge it)');
  }
  lines.push('');
  lines.push(tokenEconomizer.present
    ? `TokenEconomizer: detected (${tokenEconomizer.launcher} status)`
    : 'TokenEconomizer: not detected (optional, installed per machine, see README)');
  if (legacyGlossary.length > 0) {
    lines.push('');
    lines.push(`Glossary: rename ${legacyGlossary.map(({ from, to }) => `${from} → ${to}`).join(', ')}`);
  }

  const ok = skills.missing.length === 0 && legacySkills.length === 0 && !legacyFiles.any;
  log(lines.join('\n'));
  return { ok, skills, legacySkills, legacyRefs, legacyFiles, tracker, legacyGlossary, tokenEconomizer };
}
