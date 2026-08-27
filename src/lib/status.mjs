import { loadCatalog, managedSkillNames } from './catalog.mjs';
import { referencesStatus } from './references.mjs';
import { agentsBlockStatus } from './agents-md.mjs';
import { destRoot, diffSkills, listInstalledSkills } from './scan.mjs';

/**
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   global?: boolean,
 * }} opts
 */
export function status(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  const installed = listInstalledSkills(root);
  const expected = managedSkillNames(catalog);
  const skills = diffSkills(expected, installed);
  const refs = referencesStatus(root);
  const agentsMd = agentsBlockStatus(cwd);

  const lines = [];
  lines.push(`Operator status (${opts.global ? 'global' : 'project'})`);
  lines.push('');
  lines.push(`Skills: ${skills.present.length}/${expected.length} installed`);
  for (const name of expected) {
    const mark = installed.has(name) ? 'ok' : 'missing';
    const where = installed.get(name)?.join(', ') ?? '';
    lines.push(`  [${mark}] ${name}${where ? `  (${where})` : ''}`);
  }
  lines.push('');
  if (!refs.present) {
    lines.push('References: missing (expected ./references)');
  } else if (!refs.managed) {
    lines.push('References: present, not managed by Operator');
  } else if (refs.missing.length > 0) {
    lines.push(`References: managed, missing ${refs.missing.join(', ')}`);
  } else {
    lines.push(`References: ok (${refs.files.length} files from ${refs.source})`);
  }
  lines.push('');
  if (!agentsMd.present) {
    lines.push('AGENTS.md: missing');
  } else if (!agentsMd.managed) {
    lines.push('AGENTS.md: present, Operator block missing');
  } else {
    lines.push('AGENTS.md: Operator block present');
  }

  const ok = skills.missing.length === 0
    && refs.managed
    && refs.missing.length === 0
    && agentsMd.managed;
  console.log(lines.join('\n'));
  return { ok, skills, refs, agentsMd };
}
