import { readText } from './fsutil.mjs';
import { agentsBlockPath, loadCatalog, ownSkillNames, payloadDir } from './catalog.mjs';
import { addSkills } from './skills.mjs';
import { scaffoldProjectSections, upsertAgentsBlock } from './agents-md.mjs';
import { destRoot } from './scan.mjs';
import { resolveAgents } from './target-agents.mjs';
import { resolveTracker, upsertTrackerLine } from './tracker.mjs';
import { ensureClaudeImport, targetsClaudeCode } from './claude-md.mjs';
import { readState, writeState } from './state.mjs';
import { legacyGlossaryFiles, legacyGlossaryWarning } from './glossary.mjs';

export const NEXT_STEPS = `
Operator is installed.

Next, open your coding agent in this repo and describe your idea in plain words:
what you want, for whom, and why. There is nothing to invoke and no setup command.
The agent asks a few product questions, decides the technical side, and stops
only when you need to decide.
`.trim();

/**
 * Write everything Operator owns in the project, after the skills are installed:
 * the AGENTS.md block, the tracker line, the CLAUDE.md import (Claude Code), and the state file.
 * Shared by `init` and `update`.
 *
 * @param {{
 *   cwd: string,
 *   root: string,
 *   packageRoot: string,
 *   agents: string[],
 *   tracker?: string,
 *   state: import('./state.mjs').OperatorState,
 *   scaffold?: boolean,
 * }} opts
 */
export function writeProjectFiles(opts) {
  upsertAgentsBlock({
    cwd: opts.cwd,
    block: readText(agentsBlockPath(opts.packageRoot)),
  });
  if (opts.scaffold) scaffoldProjectSections(opts.cwd);
  if (opts.tracker) upsertTrackerLine(opts.cwd, opts.tracker);

  let claudeMd = opts.state.claudeMd;
  if (targetsClaudeCode(opts.agents)) {
    const result = ensureClaudeImport(opts.cwd);
    if (result.added) {
      claudeMd = {
        importAdded: true,
        // Re-adding a line the user deleted must not claim Operator created their file.
        fileCreated: result.created || Boolean(claudeMd?.fileCreated && claudeMd.importAdded),
      };
    }
  }

  const next = {
    ...opts.state,
    agents: opts.agents,
    ...(opts.tracker ? { tracker: opts.tracker } : {}),
    ...(claudeMd ? { claudeMd } : {}),
  };
  writeState(opts.root, next);
  return next;
}

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

  writeProjectFiles({
    cwd,
    root,
    packageRoot: opts.packageRoot,
    agents,
    tracker,
    state,
    scaffold: true,
  });

  log(NEXT_STEPS);

  const legacy = legacyGlossaryFiles(cwd);
  if (legacy.length > 0) console.warn(`\n${legacyGlossaryWarning(legacy)}`);
}
