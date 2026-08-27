import fs from 'node:fs';
import path from 'node:path';
import { pathExists, readText, writeText } from './fsutil.mjs';

export const START_MARKER = '<!-- operator:start -->';
export const END_MARKER = '<!-- operator:end -->';

/** @param {string} cwd */
export function agentsMdPath(cwd) {
  return path.join(cwd, 'AGENTS.md');
}

/** @param {string} block */
export function wrapBlock(block) {
  const trimmed = block.replace(/^\uFEFF/, '').trimEnd();
  return `${START_MARKER}\n${trimmed}\n${END_MARKER}\n`;
}

/** @param {string} contents */
export function hasManagedBlock(contents) {
  return contents.includes(START_MARKER) && contents.includes(END_MARKER);
}

/**
 * Replace or append the managed Operator block in AGENTS.md.
 * @param {{ cwd: string, block: string }} opts
 */
export function upsertAgentsBlock(opts) {
  const filePath = agentsMdPath(opts.cwd);
  const wrapped = wrapBlock(opts.block);
  if (!pathExists(filePath)) {
    writeText(filePath, `${wrapped}`);
    return { created: true, updated: true };
  }
  const existing = readText(filePath);
  if (!hasManagedBlock(existing)) {
    const sep = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
    writeText(filePath, `${existing}${sep}\n${wrapped}`);
    return { created: false, updated: true };
  }
  const start = existing.indexOf(START_MARKER);
  const end = existing.indexOf(END_MARKER, start);
  if (end === -1) {
    writeText(filePath, `${existing}\n${wrapped}`);
    return { created: false, updated: true };
  }
  const before = existing.slice(0, start);
  const after = existing.slice(end + END_MARKER.length).replace(/^\n/, '');
  writeText(filePath, `${before}${wrapped}${after}`);
  return { created: false, updated: true };
}

/** @param {string} cwd */
export function agentsBlockStatus(cwd) {
  const filePath = agentsMdPath(cwd);
  if (!pathExists(filePath)) return { present: false, managed: false };
  const contents = readText(filePath);
  return { present: true, managed: hasManagedBlock(contents) };
}

/**
 * Remove the managed block. Leaves the rest of AGENTS.md intact.
 * Deletes the file only if it becomes empty.
 * @param {string} cwd
 */
export function stripAgentsBlock(cwd) {
  const filePath = agentsMdPath(cwd);
  if (!pathExists(filePath)) return { removed: false };
  const existing = readText(filePath);
  if (!hasManagedBlock(existing)) return { removed: false };
  const start = existing.indexOf(START_MARKER);
  const end = existing.indexOf(END_MARKER, start);
  if (end === -1) return { removed: false };
  const before = existing.slice(0, start);
  const after = existing.slice(end + END_MARKER.length).replace(/^\n/, '');
  const next = `${before}${after}`.trimStart();
  if (next.trim().length === 0) {
    fs.unlinkSync(filePath);
  } else {
    writeText(filePath, next.endsWith('\n') ? next : `${next}\n`);
  }
  return { removed: true };
}
