import fs from 'node:fs';
import path from 'node:path';
import { pathExists, readText, writeText } from './fsutil.mjs';

/** Claude Code does not read AGENTS.md by itself; this import line in CLAUDE.md makes it. */
export const IMPORT_LINE = '@AGENTS.md';
export const CLAUDE_CODE_AGENT = 'claude-code';

/** @param {string} cwd */
export function claudeMdPath(cwd) {
  return path.join(cwd, 'CLAUDE.md');
}

/** @param {string[] | undefined} agents */
export function targetsClaudeCode(agents) {
  return Boolean(agents?.some((agent) => agent === CLAUDE_CODE_AGENT || agent === '*'));
}

/** @param {string} line */
function isImportLine(line) {
  return line.trim() === IMPORT_LINE;
}

/** @param {string} cwd */
export function hasClaudeImport(cwd) {
  const filePath = claudeMdPath(cwd);
  if (!pathExists(filePath)) return false;
  return readText(filePath).split(/\r?\n/).some(isImportLine);
}

/**
 * Make sure CLAUDE.md imports AGENTS.md. Creates CLAUDE.md when missing; never duplicates the line.
 * Returns what Operator did, so the caller can record it in state.
 * @param {string} cwd
 * @returns {{ added: boolean, created: boolean }}
 */
export function ensureClaudeImport(cwd) {
  const filePath = claudeMdPath(cwd);
  if (!pathExists(filePath)) {
    writeText(filePath, `${IMPORT_LINE}\n`);
    return { added: true, created: true };
  }
  const existing = readText(filePath);
  if (existing.split(/\r?\n/).some(isImportLine)) return { added: false, created: false };
  const sep = existing.length === 0 ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
  writeText(filePath, `${existing}${sep}${IMPORT_LINE}\n`);
  return { added: true, created: false };
}

/**
 * Remove the import line, only when Operator added it. Deletes CLAUDE.md when it becomes
 * empty and Operator created it.
 * @param {string} cwd
 * @param {{ importAdded?: boolean, fileCreated?: boolean } | undefined} record
 */
export function removeClaudeImport(cwd, record) {
  if (!record?.importAdded) return { removed: false, deleted: false };
  const filePath = claudeMdPath(cwd);
  if (!pathExists(filePath)) return { removed: false, deleted: false };
  const lines = readText(filePath).split('\n');
  const found = lines.findIndex(isImportLine);
  if (found === -1) return { removed: false, deleted: false };
  // Also drop the blank separator Operator put before the line when it appended it.
  const from = found > 0 && lines[found - 1].trim() === '' && found === lines.length - 2 ? found - 1 : found;
  lines.splice(from, found - from + 1);
  const next = lines.join('\n');
  if (next.trim() === '' && record.fileCreated) {
    fs.unlinkSync(filePath);
    return { removed: true, deleted: true };
  }
  writeText(filePath, next);
  return { removed: true, deleted: false };
}
