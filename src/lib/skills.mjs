import { spawn } from 'node:child_process';
import { OperatorError } from './fsutil.mjs';

/**
 * @typedef {{
 *   agents?: string[],
 *   global?: boolean,
 *   copy?: boolean,
 * }} SkillsFlags
 */

/** @param {string[] | undefined} agents */
export function normalizeAgents(agents) {
  if (!agents || agents.length === 0) return [];
  const expanded = agents.flatMap((value) => String(value).split(',')).map((value) => value.trim()).filter(Boolean);
  return [...new Set(expanded)];
}

/** @param {boolean | undefined} copy */
export function shouldCopy(copy) {
  return Boolean(copy) || process.platform === 'win32';
}

/**
 * @param {string[]} args
 * @param {SkillsFlags} flags
 * @param {{ includeCopy?: boolean }} [opts]
 */
export function applyFlags(args, flags, opts = {}) {
  const includeCopy = opts.includeCopy !== false;
  const agents = normalizeAgents(flags.agents);
  if (agents.length === 0) {
    throw new OperatorError('missing --agent', 2);
  }
  for (const agent of agents) {
    args.push('--agent', agent);
  }
  args.push('-y');
  if (flags.global) args.push('-g');
  if (includeCopy && shouldCopy(flags.copy)) args.push('--copy');
  return args;
}

/**
 * @param {{ repo: string, skills: string[] } & SkillsFlags} opts
 */
export function buildAddArgs(opts) {
  const args = ['--yes', 'skills@latest', 'add', opts.repo];
  for (const skill of opts.skills) {
    args.push('--skill', skill);
  }
  return applyFlags(args, opts);
}

/**
 * @param {{ skills: string[] } & SkillsFlags} opts
 */
export function buildUpdateArgs(opts) {
  const args = ['--yes', 'skills@latest', 'update', ...opts.skills];
  if (opts.global) args.push('-g');
  else args.push('-p');
  args.push('-y');
  return args;
}

/**
 * @param {{ skills: string[] } & SkillsFlags} opts
 */
export function buildRemoveArgs(opts) {
  const args = ['--yes', 'skills@latest', 'remove', ...opts.skills];
  return applyFlags(args, opts, { includeCopy: false });
}

/**
 * @param {string[]} args
 * @param {{ cwd?: string, runner?: (args: string[], opts: { cwd?: string }) => Promise<void> }} [opts]
 */
export async function runNpx(args, opts = {}) {
  if (opts.runner) {
    await opts.runner(args, { cwd: opts.cwd });
    return;
  }
  await new Promise((resolve, reject) => {
    const child = spawn('npx', args, {
      cwd: opts.cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', (err) => {
      reject(new OperatorError(`failed to spawn npx: ${err.message}`, 1));
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new OperatorError(`npx ${args.join(' ')} exited with code ${code}`, 1));
    });
  });
}

/**
 * @param {{ repo: string, skills: string[] } & SkillsFlags & { cwd?: string, runner?: (args: string[], opts: { cwd?: string }) => Promise<void> }} opts
 */
export async function addSkills(opts) {
  await runNpx(buildAddArgs(opts), opts);
}

/**
 * @param {{ skills: string[] } & SkillsFlags & { cwd?: string, runner?: (args: string[], opts: { cwd?: string }) => Promise<void> }} opts
 */
export async function updateSkills(opts) {
  await runNpx(buildUpdateArgs(opts), opts);
}

/**
 * @param {{ skills: string[] } & SkillsFlags & { cwd?: string, runner?: (args: string[], opts: { cwd?: string }) => Promise<void> }} opts
 */
export async function removeSkills(opts) {
  await runNpx(buildRemoveArgs(opts), opts);
}
