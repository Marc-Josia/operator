import { loadCatalog, managedSkillNames } from './catalog.mjs';
import { removeSkills } from './skills.mjs';
import { removeReferences } from './references.mjs';
import { stripAgentsBlock } from './agents-md.mjs';
import { destRoot } from './scan.mjs';
import { resolveAgents } from './target-agents.mjs';

/**
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   agents?: string[],
 *   yes?: boolean,
 *   global?: boolean,
 *   copy?: boolean,
 *   purge?: boolean,
 *   runner?: (args: string[], opts: { cwd?: string }) => Promise<void>,
 *   promptFn?: (knownAgents: { id: string, label: string }[]) => Promise<string[]>,
 *   stdin?: NodeJS.ReadableStream,
 *   stdout?: NodeJS.WritableStream,
 * }} opts
 */
export async function remove(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  const agents = await resolveAgents({
    agents: opts.agents,
    yes: opts.yes,
    command: 'remove',
    destRoot: root,
    knownAgents: catalog.agents,
    promptFn: opts.promptFn,
    stdin: opts.stdin,
    stdout: opts.stdout,
  });
  await removeSkills({
    skills: managedSkillNames(catalog),
    agents,
    global: opts.global,
    copy: opts.copy,
    cwd,
    runner: opts.runner,
  });
  stripAgentsBlock(cwd);
  const refs = removeReferences(root, { purge: opts.purge });
  const extra = refs.removed ? ' Removed managed references/.' : '';
  console.log(`Operator skills and AGENTS.md block removed.${extra}`);
}
