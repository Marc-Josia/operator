import fs from 'node:fs';
import path from 'node:path';
import { pathExists, readText, writeText } from './fsutil.mjs';

/**
 * Operator v3.x wrote files into the consumer repo: OPERATOR.md, a managed block and a tracker
 * line in AGENTS.md, and an `@AGENTS.md` import in CLAUDE.md. v4 writes none of them. This module
 * only detects and removes what those versions left behind (used by `update`, `remove`, `status`).
 */

export const START_MARKER = '<!-- operator:start -->';
export const END_MARKER = '<!-- operator:end -->';
export const TRACKER_PREFIX = 'Specs and tickets live in:';
export const IMPORT_LINE = '@AGENTS.md';

/** Empty headings v3 `init` scaffolded after the block. */
const SCAFFOLD_SECTIONS = [
  'Project context',
  'Commands',
  'Conventions',
  'Interface design',
  'Known pitfalls',
  'Project skills',
];

/** @param {string} cwd */
export const operatorMdPath = (cwd) => path.join(cwd, 'OPERATOR.md');
/** @param {string} cwd */
export const agentsMdPath = (cwd) => path.join(cwd, 'AGENTS.md');
/** @param {string} cwd */
export const claudeMdPath = (cwd) => path.join(cwd, 'CLAUDE.md');

/** @param {string} line */
const isImportLine = (line) => line.trim() === IMPORT_LINE;
/** @param {string} line */
const isTrackerLine = (line) => line.trim().startsWith(TRACKER_PREFIX);

/** @param {string[]} lines */
function blockRange(lines) {
  const start = lines.findIndex((l) => l.trim() === START_MARKER);
  if (start === -1) return { start: -1, end: -1 };
  const rel = lines.slice(start).findIndex((l) => l.trim() === END_MARKER);
  return rel === -1 ? { start: -1, end: -1 } : { start, end: start + rel };
}

/**
 * Pure: AGENTS.md text without the tracker line (outside the block) and the managed block.
 * `empty` is true when something was stripped and only the empty scaffold headings remain.
 * @param {string} text
 */
export function cleanAgentsText(text) {
  const lines = text.split('\n');
  const { start, end } = blockRange(lines);
  const tracker = lines.findIndex((l, i) => (start === -1 || i < start || i > end) && isTrackerLine(l));
  const trackerRemoved = tracker !== -1;
  if (trackerRemoved) {
    // Also drop the blank line Operator put before it.
    const from = tracker > 0 && lines[tracker - 1].trim() === '' ? tracker - 1 : tracker;
    lines.splice(from, tracker - from + 1);
  }
  let next = lines.join('\n');
  const s = next.indexOf(START_MARKER);
  const e = s === -1 ? -1 : next.indexOf(END_MARKER, s);
  const blockRemoved = e !== -1;
  if (blockRemoved) {
    next = `${next.slice(0, s)}${next.slice(e + END_MARKER.length).replace(/^\n/, '')}`.trimStart();
  }
  const headings = new Set(SCAFFOLD_SECTIONS.map((title) => `## ${title}`));
  const empty = (trackerRemoved || blockRemoved)
    && next.split(/\r?\n/).every((l) => l.trim() === '' || headings.has(l.trim()));
  return { text: next, trackerRemoved, blockRemoved, empty };
}

/** @param {string} cwd */
export function hasClaudeImport(cwd) {
  const filePath = claudeMdPath(cwd);
  return pathExists(filePath) && readText(filePath).split(/\r?\n/).some(isImportLine);
}

/**
 * What an older version left in the repo. `claudeImport` is true only when `update` would
 * remove it: Operator added it and AGENTS.md is gone or would be deleted.
 * @param {string} cwd
 * @param {{ importAdded?: boolean } | undefined} claudeMd  the state record
 */
export function detectLegacyFiles(cwd, claudeMd) {
  const agentsPath = agentsMdPath(cwd);
  const clean = pathExists(agentsPath) ? cleanAgentsText(readText(agentsPath)) : undefined;
  const agentsGone = !clean || clean.empty;
  const operatorMd = pathExists(operatorMdPath(cwd));
  const agentsBlock = Boolean(clean?.blockRemoved);
  const trackerLine = Boolean(clean?.trackerRemoved);
  const claudeImport = Boolean(claudeMd?.importAdded) && hasClaudeImport(cwd) && agentsGone;
  return { operatorMd, agentsBlock, trackerLine, claudeImport, any: operatorMd || agentsBlock || trackerLine || claudeImport };
}

/**
 * Remove the `@AGENTS.md` line. Deletes CLAUDE.md when it becomes empty and Operator created it.
 * @param {string} cwd
 * @param {{ fileCreated?: boolean }} record
 */
function removeClaudeImport(cwd, record) {
  const filePath = claudeMdPath(cwd);
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

/**
 * Clean what v3.x wrote. Never touches anything else. The `@AGENTS.md` line goes only when
 * Operator added it and, unless `force` (remove), AGENTS.md no longer exists: otherwise the
 * user's own AGENTS.md would vanish from Claude Code.
 *
 * @param {{
 *   cwd: string,
 *   claudeMd?: { importAdded: boolean, fileCreated: boolean },
 *   force?: boolean,
 * }} opts
 * @returns {{ notes: string[], claudeMd?: { importAdded: boolean, fileCreated: boolean } }}
 *   `claudeMd` is the state record to keep (undefined once handled).
 */
export function cleanupLegacyFiles(opts) {
  const { cwd } = opts;
  const notes = [];

  if (pathExists(operatorMdPath(cwd))) {
    fs.unlinkSync(operatorMdPath(cwd));
    notes.push('Removed OPERATOR.md (written by an older Operator).');
  }

  const agentsPath = agentsMdPath(cwd);
  if (pathExists(agentsPath)) {
    const clean = cleanAgentsText(readText(agentsPath));
    if (clean.empty) {
      fs.unlinkSync(agentsPath);
      notes.push('Deleted AGENTS.md (only the Operator block and its empty sections were in it).');
    } else if (clean.trackerRemoved || clean.blockRemoved) {
      writeText(agentsPath, clean.text.endsWith('\n') || clean.text === '' ? clean.text : `${clean.text}\n`);
      if (clean.trackerRemoved) notes.push('Removed the tracker line from AGENTS.md (the tracker now lives in .operator/state.json).');
      if (clean.blockRemoved) notes.push('Removed the Operator block from AGENTS.md.');
    }
  }

  let claudeMd = opts.claudeMd;
  if (claudeMd?.importAdded && (opts.force || !pathExists(agentsPath))) {
    if (pathExists(claudeMdPath(cwd))) {
      const result = removeClaudeImport(cwd, claudeMd);
      if (result.removed) {
        notes.push(result.deleted
          ? 'Deleted CLAUDE.md (Operator created it, only the @AGENTS.md line was in it).'
          : 'Removed the @AGENTS.md line from CLAUDE.md.');
      }
    }
    claudeMd = undefined;
  }
  return { notes, claudeMd };
}
