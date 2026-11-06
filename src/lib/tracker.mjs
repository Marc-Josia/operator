import readline from 'node:readline';
import { OperatorError, pathExists, readText, writeText } from './fsutil.mjs';
import { END_MARKER, START_MARKER, agentsMdPath } from './agents-md.mjs';

export const TRACKER_PREFIX = 'Specs and tickets live in:';
export const PROJECT_CONTEXT_HEADING = '## Project context';
export const DEFAULT_TRACKER = 'local';

/** Preset trackers: the value saved in state, and the text written after the prefix. */
export const TRACKER_CHOICES = [
  { id: 'local', label: 'Local markdown (docs/changes/<id>/)', text: 'local markdown (`docs/changes/<id>/`)' },
  { id: 'github', label: 'GitHub issues', text: 'GitHub issues' },
  { id: 'linear', label: 'Linear', text: 'Linear' },
];

/**
 * `local`, `github`, `linear` (any case) map to the presets; anything else is kept as free text.
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function normalizeTracker(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return undefined;
  const preset = TRACKER_CHOICES.find((choice) => choice.id === trimmed.toLowerCase());
  return preset ? preset.id : trimmed;
}

/** @param {string} tracker */
export function trackerText(tracker) {
  return TRACKER_CHOICES.find((choice) => choice.id === tracker)?.text ?? tracker;
}

/** @param {string} tracker */
export function trackerLine(tracker) {
  return `${TRACKER_PREFIX} ${trackerText(tracker)}`;
}

/**
 * @param {string} raw  answer to the numbered question
 * @returns {{ tracker?: string, needsText?: boolean }}
 */
export function parseTrackerAnswer(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { tracker: DEFAULT_TRACKER };
  if (/^\d+$/.test(trimmed)) {
    const index = Number(trimmed) - 1;
    if (index >= 0 && index < TRACKER_CHOICES.length) return { tracker: TRACKER_CHOICES[index].id };
    if (index === TRACKER_CHOICES.length) return { needsText: true };
    throw new OperatorError(`unknown choice: ${trimmed}`, 2);
  }
  return { tracker: normalizeTracker(trimmed) };
}

/**
 * Ask where specs and tickets live (TTY only). Enter keeps the default.
 * @param {{ stdin?: NodeJS.ReadableStream, stdout?: NodeJS.WritableStream, current?: string }} [opts]
 * @returns {Promise<string>}
 */
export async function promptTracker(opts = {}) {
  const input = opts.stdin ?? process.stdin;
  const output = opts.stdout ?? process.stdout;
  const current = opts.current ?? DEFAULT_TRACKER;
  const rl = readline.createInterface({ input, output });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  try {
    const lines = ['Where do specs and tickets live?'];
    TRACKER_CHOICES.forEach((choice, i) => lines.push(`  ${i + 1}. ${choice.label}`));
    lines.push(`  ${TRACKER_CHOICES.length + 1}. Other (type it)`);
    output.write(`${lines.join('\n')}\n`);
    for (;;) {
      const answer = String(await ask(`Choice [${trackerText(current)}]: `));
      // Plain enter keeps the current (saved) choice.
      if (!answer.trim()) return current;
      let parsed;
      try {
        parsed = parseTrackerAnswer(answer);
      } catch (err) {
        output.write(`${err.message}\n`);
        continue;
      }
      if (parsed.needsText) {
        const text = normalizeTracker(await ask('Where? '));
        if (text) return text;
        continue;
      }
      if (parsed.tracker) return parsed.tracker;
    }
  } finally {
    rl.close();
  }
}

/**
 * Resolve the tracker for `init`: flag, then injected prompt, then the TTY prompt;
 * non-interactive keeps the saved choice or defaults to `local`.
 * @param {{
 *   tracker?: string,
 *   saved?: string,
 *   yes?: boolean,
 *   stdin?: NodeJS.ReadableStream,
 *   stdout?: NodeJS.WritableStream,
 *   trackerPromptFn?: (current: string) => Promise<string>,
 * }} opts
 */
export async function resolveTracker(opts) {
  const fromFlag = normalizeTracker(opts.tracker);
  if (fromFlag) return fromFlag;
  const current = opts.saved ?? DEFAULT_TRACKER;
  if (opts.trackerPromptFn) return normalizeTracker(await opts.trackerPromptFn(current)) ?? current;
  const stdin = opts.stdin ?? process.stdin;
  if (opts.yes || !stdin.isTTY) return current;
  return promptTracker({ stdin, stdout: opts.stdout, current });
}

/**
 * Line indexes of the managed block (START..END markers), so the tracker line only ever
 * lives in the project part of AGENTS.md: outside the markers.
 * @param {string[]} lines
 */
function blockRange(lines) {
  const start = lines.findIndex((l) => l.trim() === START_MARKER);
  if (start === -1) return { start: -1, end: -1 };
  const rel = lines.slice(start).findIndex((l) => l.trim() === END_MARKER);
  return rel === -1 ? { start: -1, end: -1 } : { start, end: start + rel };
}

/**
 * First matching line outside the managed block; lines after the block win over lines before it.
 * @param {string[]} lines
 * @param {(line: string) => boolean} match
 */
function findProjectLine(lines, match) {
  const { start, end } = blockRange(lines);
  const after = lines.findIndex((l, i) => i > end && match(l));
  if (after !== -1) return after;
  return lines.findIndex((l, i) => (start === -1 || i < start) && match(l));
}

/** @param {string} line */
function isTrackerLine(line) {
  return line.trim().startsWith(TRACKER_PREFIX);
}

/** @param {string} line */
function isContextHeading(line) {
  return line.trim() === PROJECT_CONTEXT_HEADING;
}

/**
 * Write the one tracker line under `## Project context`, in the project part of AGENTS.md
 * (never inside the managed block). Replaces an existing line; never duplicates.
 * @param {string} cwd
 * @param {string} tracker
 */
export function upsertTrackerLine(cwd, tracker) {
  const filePath = agentsMdPath(cwd);
  const existing = pathExists(filePath) ? readText(filePath) : '';
  const line = trackerLine(tracker);
  let lines = existing.split('\n');
  const found = findProjectLine(lines, isTrackerLine);
  if (found !== -1) {
    const { start, end } = blockRange(lines);
    lines[found] = line;
    // Drop any stray duplicate outside the block.
    lines = lines.filter((l, i) => i === found || (i >= start && i <= end) || !isTrackerLine(l));
    const next = lines.join('\n');
    writeText(filePath, next);
    return { changed: next !== existing };
  }
  const heading = findProjectLine(lines, isContextHeading);
  if (heading !== -1) {
    const insert = ['', line];
    const after = lines[heading + 1];
    if (after !== undefined && after.trim() !== '') insert.push('');
    lines.splice(heading + 1, 0, ...insert);
    writeText(filePath, lines.join('\n'));
    return { changed: true };
  }
  const sep = existing.length === 0 ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
  writeText(filePath, `${existing}${sep}${PROJECT_CONTEXT_HEADING}\n\n${line}\n`);
  return { changed: true };
}

/**
 * The tracker line currently written in the project part of AGENTS.md, if any.
 * @param {string} cwd
 */
export function readTrackerLine(cwd) {
  const filePath = agentsMdPath(cwd);
  if (!pathExists(filePath)) return undefined;
  const lines = readText(filePath).split('\n');
  const found = findProjectLine(lines, isTrackerLine);
  return found === -1 ? undefined : lines[found].trim();
}

/**
 * Remove the tracker line Operator wrote (and the blank line before it). Used by `remove`.
 * @param {string} cwd
 */
export function stripTrackerLine(cwd) {
  const filePath = agentsMdPath(cwd);
  if (!pathExists(filePath)) return { removed: false };
  const lines = readText(filePath).split('\n');
  const found = findProjectLine(lines, isTrackerLine);
  if (found === -1) return { removed: false };
  const from = found > 0 && lines[found - 1].trim() === '' ? found - 1 : found;
  lines.splice(from, found - from + 1);
  writeText(filePath, lines.join('\n'));
  return { removed: true };
}
