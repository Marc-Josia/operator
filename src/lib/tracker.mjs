import readline from 'node:readline';
import { OperatorError } from './fsutil.mjs';

export const DEFAULT_TRACKER = 'local';

/** Preset trackers: the value saved in `.operator/state.json`, and how the prompt shows it. */
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
