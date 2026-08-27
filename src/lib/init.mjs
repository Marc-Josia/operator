import { readText } from './fsutil.mjs';
import { agentsBlockPath, loadCatalog, payloadDir } from './catalog.mjs';
import { addSkills } from './skills.mjs';
import { installReferences } from './references.mjs';
import { upsertAgentsBlock } from './agents-md.mjs';
import { destRoot } from './scan.mjs';

const NEXT_STEPS = `
Operator is installed.

Next, in your coding agent, run:
  /setup-matt-pocock-skills
once per repo (issue tracker, triage labels, doc layout).

Then start with:
  /operator
to pick the right skill for what you're doing.
`.trim();

/**
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   agents?: string[],
 *   global?: boolean,
 *   copy?: boolean,
 *   runner?: (args: string[], opts: { cwd?: string }) => Promise<void>,
 *   fetchFn?: typeof fetch,
 * }} opts
 */
export async function init(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const catalog = loadCatalog(opts.packageRoot);
  const flags = {
    agents: opts.agents,
    global: opts.global,
    copy: opts.copy,
    cwd,
    runner: opts.runner,
  };

  for (const source of catalog.sources) {
    await addSkills({
      repo: source.repo,
      skills: source.skills,
      ...flags,
    });
  }

  await addSkills({
    repo: payloadDir(opts.packageRoot),
    skills: [catalog.operatorSkill],
    ...flags,
  });

  await installReferences({
    catalog,
    destRoot: destRoot(cwd, opts.global),
    fetchFn: opts.fetchFn,
  });

  upsertAgentsBlock({
    cwd,
    block: readText(agentsBlockPath(opts.packageRoot)),
  });

  console.log(NEXT_STEPS);
}
