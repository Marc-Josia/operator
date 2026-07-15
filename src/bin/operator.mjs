#!/usr/bin/env node
// operator — installer CLI for the Operator toolkit.
// Zero dependencies. ESM. Node >= 18. Runs via `npx --yes github:MarcJosia/operator <cmd>`.

import fs from 'node:fs';
import path from 'node:path';
import { OperatorError, defaultPackageRoot } from '../lib/fsutil.mjs';
import { init } from '../lib/init.mjs';
import { update } from '../lib/update.mjs';
import { doctor } from '../lib/doctor.mjs';
import { status } from '../lib/status.mjs';
import { remove } from '../lib/remove.mjs';

const HELP = `operator — make AI coding agents work like a senior engineering team

Usage: operator <command> [options]

Commands:
  init      Install Operator into the current project
  update    Refresh managed files from this package's payload (never touches
            work/, memory/, or config.json)
  doctor    Health-check the install; --fix repairs mechanical issues
  status    Show work items, the active item, and the exact next action
  remove    Uninstall; keeps work/ and memory/ unless --purge

Options:
  init:    --tools a,b     adapters to apply (claude, gemini, codex, opencode,
                           cursor) or "none"; default: detect
           --test-cmd CMD  preset the project test command
           --yes, -y       skip the interview, accept defaults
           --force         reinstall over an existing install (work/, memory/,
                           and config.json are preserved)
  update:  --force         allow a version downgrade (stale npx cache override)
  doctor:  --fix           repair mechanical issues (markers, import, mirror)
           --strict        exit non-zero on warnings too (for CI)
  remove:  --purge         also delete .operator/work/ and .operator/memory/
  --version, -v            print the package version
  --help, -h               show this help

Exit codes: 0 ok, 1 failure, 2 usage error.`;

const VALUE_FLAGS = new Map([
  ['--tools', 'tools'],
  ['--test-cmd', 'testCmd'],
]);
const BOOL_FLAGS = new Map([
  ['--yes', 'yes'],
  ['-y', 'yes'],
  ['--force', 'force'],
  ['--fix', 'fix'],
  ['--strict', 'strict'],
  ['--purge', 'purge'],
  ['--help', 'help'],
  ['-h', 'help'],
  ['--version', 'version'],
  ['-v', 'version'],
]);

function parseArgs(argv) {
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
      flags[key] = value;
      continue;
    }
    if (arg.startsWith('-')) throw new OperatorError(`unknown option: ${arg}\n\n${HELP}`, 2);
    positional.push(arg);
  }
  return { flags, positional };
}

function packageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(defaultPackageRoot(), 'package.json'), 'utf8'));
  return pkg.version;
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  if (flags.version) {
    console.log(packageVersion());
    return 0;
  }
  if (flags.help || !command) {
    console.log(HELP);
    return command ? 0 : flags.help ? 0 : 2;
  }

  switch (command) {
    case 'init':
      await init(flags);
      return 0;
    case 'update':
      await update(flags);
      return 0;
    case 'doctor': {
      const result = await doctor(flags);
      return result.ok ? 0 : 1;
    }
    case 'status':
      await status(flags);
      return 0;
    case 'remove':
      await remove(flags);
      return 0;
    default:
      throw new OperatorError(`unknown command: ${command}\n\n${HELP}`, 2);
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    if (err instanceof OperatorError) {
      console.error(`operator: ${err.message}`);
      process.exitCode = err.code ?? 1;
    } else {
      console.error(err);
      process.exitCode = 1;
    }
  });
