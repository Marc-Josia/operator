import os from 'node:os';
import path from 'node:path';
import { pathExists } from './fsutil.mjs';

/**
 * TokenEconomizer (microsoft/TokenEconomizer) is a per-machine agent plugin, not a skill pack.
 * Operator never installs it; it only reports whether it is present so the router can compose with it.
 * Its state root is `$TOKENECONOMIZER_HOME`, else `~/.tokeneconomizer`, and the plugin writes
 * `bin/te` there at its first session start.
 *
 * @param {{ env?: NodeJS.ProcessEnv, homedir?: string }} [opts]
 * @returns {{ home: string, launcher: string, present: boolean }}
 */
export function tokenEconomizerStatus(opts = {}) {
  const env = opts.env ?? process.env;
  const home = env.TOKENECONOMIZER_HOME || path.join(opts.homedir ?? os.homedir(), '.tokeneconomizer');
  const launcher = path.join(home, 'bin', 'te');
  return { home, launcher, present: pathExists(launcher) };
}
