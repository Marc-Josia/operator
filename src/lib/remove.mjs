import { loadCatalog, managedSkillNames } from './catalog.mjs';
import { removeSkills } from './skills.mjs';
import { purgeLegacyReferences } from './references.mjs';
import { cleanupLegacyFiles } from './legacy-files.mjs';
import { readState, removeState } from './state.mjs';
import { destRoot } from './scan.mjs';
import { resolveAgents } from './target-agents.mjs';

/**
 * Uninstall own + pstack skills (never `--copy`), clean what older Operator versions wrote
 * (OPERATOR.md, the AGENTS.md block and tracker line, the CLAUDE.md import), purge the v2
 * `references/`, and delete `.operator/state.json`.
 *
 * @param {{
 *   cwd?: string,
 *   packageRoot: string,
 *   agents?: string[],
 *   yes?: boolean,
 *   global?: boolean,
 *   copy?: boolean,
 *   runner?: (args: string[], opts: { cwd?: string }) => Promise<void>,
 *   promptFn?: (knownAgents: { id: string, label: string }[]) => Promise<string[]>,
 *   stdin?: NodeJS.ReadableStream,
 *   stdout?: NodeJS.WritableStream,
 *   log?: (message: string) => void,
 * }} opts
 */
export async function remove(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const log = opts.log ?? console.log;
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  const { state } = readState(root);
  const agents = await resolveAgents({
    agents: opts.agents ?? state.agents,
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
  const { notes } = cleanupLegacyFiles({ cwd, claudeMd: state.claudeMd, force: true });
  const refs = purgeLegacyReferences(root);
  removeState(root);

  if (refs.removed) notes.push('Removed v2 managed references/.');
  log(['Operator skills removed.', ...notes].join('\n'));
}
