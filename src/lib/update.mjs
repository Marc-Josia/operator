import { allCatalogSkills, legacyOnlySkillNames, loadCatalog, ownSkillNames, payloadDir } from './catalog.mjs';
import { addSkills, removeSkills, updateSkills } from './skills.mjs';
import { purgeLegacyReferences } from './references.mjs';
import { destRoot, listInstalledSkills } from './scan.mjs';
import { resolveAgents } from './target-agents.mjs';
import { normalizeTracker } from './tracker.mjs';
import { readState, writeState } from './state.mjs';
import { cleanupLegacyFiles } from './legacy-files.mjs';
import { legacyGlossaryFiles, legacyGlossaryWarning } from './glossary.mjs';

export const NO_TRACKER_HINT = 'No tracker saved yet. Run: operator update --tracker local|github|linear|"<where>"';

/**
 * Bring an install to the current catalog: refresh pstack, drop v2 Matt/Addy skills and the v2
 * `operator` router, re-add own skills from the payload, purge v2 managed `references/`, and clean
 * what v3.x wrote (OPERATOR.md, AGENTS.md block and tracker line, CLAUDE.md import). Nothing else.
 *
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
 *   stdin?: NodeJS.ReadableStream,
 *   stdout?: NodeJS.WritableStream,
 *   log?: (message: string) => void,
 * }} opts
 */
export async function update(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const log = opts.log ?? console.log;
  const catalog = loadCatalog(opts.packageRoot);
  const root = destRoot(cwd, opts.global);
  // Read before anything is purged: on a v2 install the saved agents live in references/.
  const { state } = readState(root);
  const agents = await resolveAgents({
    agents: opts.agents ?? state.agents,
    yes: opts.yes,
    command: 'update',
    destRoot: root,
    knownAgents: catalog.agents,
    promptFn: opts.promptFn,
    stdin: opts.stdin,
    stdout: opts.stdout,
  });
  const tracker = normalizeTracker(opts.tracker) ?? state.tracker;
  const flags = {
    agents,
    global: opts.global,
    copy: opts.copy,
    cwd,
    runner: opts.runner,
  };

  // Only pstack: own skills come from the payload, and `skills update` would re-pull a
  // same-named Matt skill (implement, retro, …) from its locked source.
  await updateSkills({
    skills: allCatalogSkills(catalog),
    ...flags,
  });

  const installed = listInstalledSkills(root);

  const leftovers = legacyOnlySkillNames(catalog).filter((name) => installed.has(name));
  if (leftovers.length > 0) {
    await removeSkills({
      skills: leftovers,
      ...flags,
    });
  }

  // `skills update` only touches installed skills, so names added to the catalog
  // since the last init would never arrive without this.
  for (const source of catalog.sources) {
    const missing = source.skills.filter((name) => !installed.has(name));
    if (missing.length === 0) continue;
    await addSkills({
      repo: source.repo,
      skills: missing,
      ...flags,
    });
  }

  // Always from this package: overwrites same-named v2 Matt copies.
  await addSkills({
    repo: payloadDir(opts.packageRoot),
    skills: ownSkillNames(catalog),
    ...flags,
  });

  const refs = purgeLegacyReferences(root);

  // One-time cleanup of what v3.x wrote into the repo.
  const legacyFiles = cleanupLegacyFiles({ cwd, claudeMd: state.claudeMd });
  const { claudeMd: _handled, ...rest } = state;
  writeState(root, {
    ...rest,
    agents,
    ...(tracker ? { tracker } : {}),
    ...(legacyFiles.claudeMd ? { claudeMd: legacyFiles.claudeMd } : {}),
  });

  log('Operator updated. Skills are current.');
  if (leftovers.length > 0) log(`Removed v2 skills: ${leftovers.join(', ')}.`);
  if (refs.removed) log('Removed v2 managed references/.');
  for (const note of legacyFiles.notes) log(note);
  if (!tracker) log(NO_TRACKER_HINT);

  const legacy = legacyGlossaryFiles(cwd);
  if (legacy.length > 0) console.warn(legacyGlossaryWarning(legacy));
}
