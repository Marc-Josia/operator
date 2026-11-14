import { legacyOnlySkillNames, loadCatalog, managedSkillNames, operatorMdPayloadPath } from './catalog.mjs';
import { readText } from './fsutil.mjs';
import { operatorMdStatus } from './operator-md.mjs';
import { legacyReferencesStatus } from './references.mjs';
import { agentsBlockStatus } from './agents-md.mjs';
import { readTrackerLine, trackerLine } from './tracker.mjs';
import { hasClaudeImport, targetsClaudeCode } from './claude-md.mjs';
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
  const agentsMd = agentsBlockStatus(cwd);
  const operatorMd = operatorMdStatus(cwd, readText(operatorMdPayloadPath(opts.packageRoot)));
  const claudeMd = { expected: targetsClaudeCode(state.agents), imports: hasClaudeImport(cwd) };
  const tracker = { saved: state.tracker, line: readTrackerLine(cwd) };
  const legacyGlossary = legacyGlossaryFiles(cwd);
  const tokenEconomizer = tokenEconomizerStatus({ env: opts.env, homedir: opts.homedir });

  const lines = [];
  lines.push(`Operator status (${opts.global ? 'global' : 'project'})`);
  lines.push('');
  lines.push(`Agents: ${state.agents?.join(', ') ?? 'none saved'}`);
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
  lines.push('');
  if (!agentsMd.present) {
    lines.push('AGENTS.md: missing');
  } else if (!agentsMd.managed) {
    lines.push('AGENTS.md: present, Operator block missing');
  } else {
    lines.push('AGENTS.md: Operator block present');
  }
  if (!operatorMd.present) {
    lines.push('OPERATOR.md: missing, agents will not see the process (run operator update)');
  } else {
    lines.push(operatorMd.current ? 'OPERATOR.md: current' : 'OPERATOR.md: differs from this version (run operator update)');
  }
  if (claudeMd.expected) {
    lines.push(claudeMd.imports
      ? 'CLAUDE.md: imports AGENTS.md (@AGENTS.md)'
      : 'CLAUDE.md: missing the @AGENTS.md import, Claude Code will not see the process (run operator update)');
  }
  if (tracker.saved) {
    const expectedLine = trackerLine(tracker.saved);
    lines.push(tracker.line === expectedLine
      ? `Tracker: ${expectedLine}`
      : `Tracker: ${tracker.saved} saved, AGENTS.md line missing or different (run operator update)`);
  } else {
    lines.push('Tracker: not set (operator update --tracker local|github|linear|"<where>")');
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

  const ok = skills.missing.length === 0
    && legacySkills.length === 0
    && agentsMd.managed
    && operatorMd.present
    && (!claudeMd.expected || claudeMd.imports);
  log(lines.join('\n'));
  return { ok, skills, legacySkills, legacyRefs, agentsMd, operatorMd, claudeMd, tracker, legacyGlossary, tokenEconomizer };
}
