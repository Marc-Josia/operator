import { readText } from './fsutil.mjs';
import { agentsBlockPath, loadCatalog, managedSkillNames, payloadDir } from './catalog.mjs';
import { addSkills, updateSkills } from './skills.mjs';
import { installReferences } from './references.mjs';
import { upsertAgentsBlock } from './agents-md.mjs';
import { destRoot } from './scan.mjs';
import { resolveAgents } from './target-agents.mjs';

/**
 * Refresh catalog skills, Operator's own skill, references/, and the AGENTS.md block.
 * Never touches the rest of the repo.
 *
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   agents?: string[],
 *   yes?: boolean,
 *   global?: boolean,
 *   copy?: boolean,
 *   runner?: (args: string[], opts: { cwd?: string }) => Promise<void>,
 *   fetchFn?: typeof fetch,
 *   promptFn?: (knownAgents: { id: string, label: string }[]) => Promise<string[]>,
 *   stdin?: NodeJS.ReadableStream,
 *   stdout?: NodeJS.WritableStream,
 * }} opts
 */
export async function update(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  const agents = await resolveAgents({
    agents: opts.agents,
    yes: opts.yes,
    command: 'update',
    destRoot: root,
    knownAgents: catalog.agents,
    promptFn: opts.promptFn,
    stdin: opts.stdin,
    stdout: opts.stdout,
  });
  const flags = {
    agents,
    global: opts.global,
    copy: opts.copy,
    cwd,
    runner: opts.runner,
  };

  await updateSkills({
    skills: managedSkillNames(catalog),
    ...flags,
  });

  // Re-add Operator's skill from this package so AGENTS.md routing stays in sync
  // with the installed SKILL.md even if `skills update` cannot see the local payload.
  await addSkills({
    repo: payloadDir(opts.packageRoot),
    skills: [catalog.operatorSkill],
    ...flags,
  });

  await installReferences({
    catalog,
    destRoot: root,
    agents,
    fetchFn: opts.fetchFn,
  });

  upsertAgentsBlock({
    cwd,
    block: readText(agentsBlockPath(opts.packageRoot)),
  });

  console.log('Operator updated. Catalog skills, references/, and AGENTS.md are current.');
}
