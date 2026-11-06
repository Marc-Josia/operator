#!/usr/bin/env node
import path from 'node:path';
import { OperatorError, defaultPackageRoot, readJson } from '../lib/fsutil.mjs';
import { init } from '../lib/init.mjs';
import { update } from '../lib/update.mjs';
import { status } from '../lib/status.mjs';
import { remove } from '../lib/remove.mjs';

const HELP = `operator — a PM-first process for any coding agent: own mission skills + pstack overlays

Usage: operator <command> [options]

Commands:
  init      Install pstack and Operator's own skills, write the AGENTS.md block,
            the tracker line, and (Claude Code) the @AGENTS.md import in CLAUDE.md
  update    Refresh pstack, re-add own skills, remove v2 Matt/Addy skills and the
            v2 operator skill, purge v2 managed references/, replace the AGENTS.md block
  status    Show installed skills, leftover v2 skills, the AGENTS.md block, the
            CLAUDE.md import, the tracker, and whether TokenEconomizer is present
  remove    Uninstall Operator's skills and what it wrote in AGENTS.md / CLAUDE.md

Options:
  init:
    With no --agent, Operator shows a checkbox list (TTY only):
    ↑/↓ move, space check, enter confirm. -y skips it and requires --agent.
    With no --tracker, Operator asks where specs and tickets live (TTY only);
    -y keeps the saved choice, or local.
  init / update:
    --tracker x    where specs and tickets live: local (docs/changes/<id>/),
                   github, linear, or any text ("Jira project WEB")
  init / update / remove:
    --agent a,b    target agents (cursor, claude-code, codex, opencode, …)
                   or "*" for every agent the skills CLI supports
    -g, --global   install to the user directory instead of the project
    --copy         copy files instead of symlinking (on by default on Windows)
    -y, --yes      non-interactive (always passed through to the skills CLI)
  update / remove:
    omit --agent / --tracker to reuse the choices saved in .operator/state.json
  --version, -v    print the package version
  --help, -h       show this help

After init, describe your idea to your agent in plain words. Nothing to invoke.

Exit codes: 0 ok, 1 failure, 2 usage error.
`;

const VALUE_FLAGS = new Map([
  ['--agent', 'agent'],
  ['--tracker', 'tracker'],
]);
const BOOL_FLAGS = new Map([
  ['--yes', 'yes'],
  ['-y', 'yes'],
  ['--global', 'global'],
  ['-g', 'global'],
  ['--copy', 'copy'],
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
      // --agent repeats by joining; --tracker is one value, the last one wins.
      flags[key] = prev && key === 'agent' ? `${prev},${next}` : next;
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

/** @param {unknown} value */
function trackerFromFlag(value) {
  if (typeof value !== 'string') return undefined;
  if (!value.trim()) throw new OperatorError('--tracker requires a value', 2);
  return value;
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
      await init({ ...shared, tracker: trackerFromFlag(flags.tracker) });
      return 0;
    case 'update':
      await update({ ...shared, tracker: trackerFromFlag(flags.tracker) });
      return 0;
    case 'status': {
      const result = status(shared);
      return result.ok ? 0 : 1;
    }
    case 'remove':
      await remove(shared);
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
