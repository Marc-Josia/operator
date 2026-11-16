import { loadCatalog, ownSkillNames, payloadDir } from './catalog.mjs';
import { addSkills } from './skills.mjs';
import { destRoot } from './scan.mjs';
import { resolveAgents } from './target-agents.mjs';
import { resolveTracker } from './tracker.mjs';
import { readState, writeState } from './state.mjs';
import { legacyGlossaryFiles, legacyGlossaryWarning } from './glossary.mjs';

export const NEXT_STEPS = `
Operator is installed.

Next, open your coding agent in this repo and describe your idea in plain words:
what you want, for whom, and why. There is nothing to invoke and no setup command.
The skills trigger on their own from what you say. The agent asks a few product
questions, decides the technical side, and stops only when you need to decide.
`.trim();

/**
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   agents?: string[],
 *   tracker?: string,
 *   yes?: boolean,
 *   global?: boolean,
 *   copy?: boolean,
 *   runner?: (args: string[], opts: { cwd?: string }) => Promise<void>,
 *   promptFn?: (knownAgents: { id: string, label: string }[]) => Promise<string[]>,
 *   trackerPromptFn?: (current: string) => Promise<string>,
 *   stdin?: NodeJS.ReadableStream,
 *   stdout?: NodeJS.WritableStream,
 *   log?: (message: string) => void,
 * }} opts
 */
export async function init(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const log = opts.log ?? console.log;
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  const { state } = readState(root);
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
  const tracker = await resolveTracker({
    tracker: opts.tracker,
    saved: state.tracker,
    yes: opts.yes,
    stdin: opts.stdin,
    stdout: opts.stdout,
    trackerPromptFn: opts.trackerPromptFn,
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
    skills: ownSkillNames(catalog),
    ...flags,
  });

  // The only file Operator writes. A v3 `claudeMd` record is kept so `update` / `remove` can still clean it.
  writeState(root, { ...state, agents, tracker });

  log(NEXT_STEPS);

  const legacy = legacyGlossaryFiles(cwd);
  if (legacy.length > 0) console.warn(`\n${legacyGlossaryWarning(legacy)}`);
}
