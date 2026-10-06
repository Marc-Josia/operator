#!/usr/bin/env node
import path from 'node:path';
import { OperatorError, defaultPackageRoot, readJson } from '../lib/fsutil.mjs';
import { init } from '../lib/init.mjs';
import { update } from '../lib/update.mjs';
import { status } from '../lib/status.mjs';
import { remove } from '../lib/remove.mjs';
import { executeLoop, loopStatus } from '../lib/loop.mjs';

const HELP = `operator — compose Matt Pocock + Addy Osmani skills into one pipeline

Usage: operator <command> [options]

Commands:
  init      Install the catalog, references/, the operator skill, and the AGENTS.md block
  update    Refresh catalog skills, references/, the operator skill, and AGENTS.md
  status    Show installed skills vs catalog, references/, and the AGENTS.md block
  remove    Uninstall catalog skills and the AGENTS.md block
  loop      Execute approved spec/tickets until checks and reviews pass

Options:
  init:
    With no --agent, Operator shows a checkbox list (TTY only):
    ↑/↓ move, space check, enter confirm. -y skips it and requires --agent.
  init / update / remove:
    --agent a,b    target agents (cursor, claude-code, codex, opencode, …)
                   or "*" for every agent the skills CLI supports
    -g, --global   install to the user directory instead of the project
    --copy         copy files instead of symlinking (on by default on Windows)
    -y, --yes      non-interactive (always passed through to the skills CLI)
  update / remove:
    omit --agent to reuse the agents saved at init
  remove:
    --purge        also delete Operator-managed files in references/
  loop start --contract <file>  start the approved implementation contract
  loop resume --id <id>         resume with the remaining iteration budget
  loop status --id <id>         print state and whether its verification is current
  --version, -v    print the package version
  --help, -h       show this help

After init, run /setup-matt-pocock-skills once in your agent, then /operator.

Exit codes: 0 ok, 1 failure, 2 usage error.
`;

const VALUE_FLAGS = new Map([
  ['--agent', 'agent'],
  ['--contract', 'contract'],
  ['--id', 'id'],
]);
const BOOL_FLAGS = new Map([
  ['--yes', 'yes'],
  ['-y', 'yes'],
  ['--global', 'global'],
  ['-g', 'global'],
  ['--copy', 'copy'],
  ['--purge', 'purge'],
  ['--help', 'help'],
  ['-h', 'help'],
  ['--version', 'version'],
  ['-v', 'version'],
]);

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  /** @type {Record<string, string | boolean | string[] | undefined>} */
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (BOOL_FLAGS.has(arg)) {
      flags[BOOL_FLAGS.get(arg)] = true;
      continue;
    }
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg : arg.slice(0, eq);
    if (VALUE_FLAGS.has(name)) {
      const key = VALUE_FLAGS.get(name);
      const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
      if (value === undefined) throw new OperatorError(`${name} requires a value`, 2);
      const prev = flags[key];
      const next = String(value);
      if (prev && key !== 'agent') throw new OperatorError(`${name} cannot be repeated`, 2);
      flags[key] = prev ? `${prev},${next}` : next;
      continue;
    }
    if (arg.startsWith('-')) throw new OperatorError(`unknown option: ${arg}\n\n${HELP}`, 2);
    positional.push(arg);
  }
  return { flags, positional };
}

/** @param {unknown} value */
function agentsFromFlag(value) {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

async function main(argv) {
  const { flags, positional } = parseArgs(argv);
  if (flags.help) {
    console.log(HELP);
    return 0;
  }
  if (flags.version) {
    const pkg = readJson(path.join(defaultPackageRoot(), 'package.json'));
    console.log(pkg.version);
    return 0;
  }
  const command = positional[0];
  if (!command) throw new OperatorError(`missing command\n\n${HELP}`, 2);
  if (command === 'loop') {
    const action = positional[1];
    if (positional.length > 2) throw new OperatorError(`unexpected argument: ${positional[2]}`, 2);
    for (const key of Object.keys(flags)) {
      if (!['contract', 'id'].includes(key)) throw new OperatorError(`option ${key} does not apply to loop`, 2);
    }
    if (action === 'status') {
      if (flags.contract) throw new OperatorError('loop status accepts --id only', 2);
      const result = loopStatus({ id: flags.id });
      console.log(JSON.stringify(result, null, 2));
      return result.status === 'complete' ? 0 : 1;
    }
    if (!['start', 'resume'].includes(action)) throw new OperatorError('use loop start, resume, or status', 2);
    if (action === 'start' && (!flags.contract || flags.id)) throw new OperatorError('loop start requires --contract and obtains the id from the contract', 2);
    if (action === 'resume' && (!flags.id || flags.contract)) throw new OperatorError('loop resume requires --id and reuses the approved contract', 2);
    const result = await executeLoop({
      contractPath: flags.contract, id: flags.id, resume: action === 'resume',
      onProgress: (event) => console.log(JSON.stringify(event)),
    });
    console.log(JSON.stringify({ id: result.id, status: result.status, reason: result.reason }));
    return result.status === 'complete' ? 0 : 1;
  }
  if (flags.contract || flags.id) throw new OperatorError('--contract and --id apply to loop only', 2);
  if (positional.length > 1) throw new OperatorError(`unexpected argument: ${positional[1]}\n\n${HELP}`, 2);

  const packageRoot = defaultPackageRoot();
  const shared = {
    packageRoot,
    cwd: process.cwd(),
    agents: agentsFromFlag(flags.agent),
    global: Boolean(flags.global),
    copy: Boolean(flags.copy),
    yes: Boolean(flags.yes),
  };

  switch (command) {
    case 'init':
      await init(shared);
      return 0;
    case 'update':
      await update(shared);
      return 0;
    case 'status': {
      const result = status(shared);
      return result.ok ? 0 : 1;
    }
    case 'remove':
      await remove({ ...shared, purge: Boolean(flags.purge) });
      return 0;
    default:
      throw new OperatorError(`unknown command: ${command}\n\n${HELP}`, 2);
  }
}

const isDirect = process.argv[1] && (
  process.argv[1].endsWith('operator.mjs')
  || process.argv[1].endsWith('operator')
);

if (isDirect) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      const code = err instanceof OperatorError ? err.code : 1;
      console.error(err instanceof OperatorError ? err.message : err);
      process.exit(code);
    },
  );
}

export { HELP, main };
