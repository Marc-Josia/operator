import { loadCatalog, managedSkillNames } from './catalog.mjs';
import { removeSkills } from './skills.mjs';
import { removeReferences } from './references.mjs';
import { stripAgentsBlock } from './agents-md.mjs';
import { destRoot } from './scan.mjs';

/**
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   agents?: string[],
 *   global?: boolean,
 *   copy?: boolean,
 *   purge?: boolean,
 *   runner?: (args: string[], opts: { cwd?: string }) => Promise<void>,
 * }} opts
 */
export async function remove(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const catalog = loadCatalog(opts.packageRoot);
  await removeSkills({
    skills: managedSkillNames(catalog),
    agents: opts.agents,
    global: opts.global,
    copy: opts.copy,
    cwd,
    runner: opts.runner,
  });
  stripAgentsBlock(cwd);
  const refs = removeReferences(destRoot(cwd, opts.global), { purge: opts.purge });
  const extra = refs.removed ? ' Removed managed references/.' : '';
  console.log(`Operator skills and AGENTS.md block removed.${extra}`);
}
