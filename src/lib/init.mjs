import { readText } from './fsutil.mjs';
import { agentsBlockPath, loadCatalog, payloadDir } from './catalog.mjs';
import { addSkills } from './skills.mjs';
import { installReferences } from './references.mjs';
import { upsertAgentsBlock } from './agents-md.mjs';
import { destRoot } from './scan.mjs';
import { resolveAgents } from './target-agents.mjs';

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
export async function init(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  const agents = await resolveAgents({
    agents: opts.agents,
    yes: opts.yes,
    command: 'init',
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
    destRoot: root,
    agents,
    fetchFn: opts.fetchFn,
  });

  upsertAgentsBlock({
    cwd,
    block: readText(agentsBlockPath(opts.packageRoot)),
  });

  console.log(NEXT_STEPS);
}
