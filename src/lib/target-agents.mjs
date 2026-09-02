import readline from 'node:readline';
import { OperatorError } from './fsutil.mjs';
import { normalizeAgents } from './skills.mjs';
import { readSavedAgents } from './references.mjs';

export const MISSING_AGENT_MESSAGE = 'missing --agent. Pass --agent cursor (or --agent "*" for every agent), or run without -y to pick interactively.';
export const ALL_AGENTS_ID = '*';
export const ALL_AGENTS_LABEL = 'Every agent the skills CLI supports';

const HIDE_CURSOR = '\x1B[?25l';
const SHOW_CURSOR = '\x1B[?25h';

/**
 * @param {string} raw
 * @param {{ id: string, label: string }[]} knownAgents
 */
export function parseAgentSelection(raw, knownAgents) {
  const trimmed = String(raw).trim();
  if (!trimmed) throw new OperatorError('pick at least one agent', 2);
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  const wantsAll = parts.every((part) => part === 'a' || part === 'all' || part === '*');
  if (parts.some((part) => part === 'a' || part === 'all' || part === '*')) {
    if (!wantsAll) throw new OperatorError('use "*" or "all" alone to install for every agent', 2);
    return [ALL_AGENTS_ID];
  }
  /** @type {string[]} */
  const ids = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const index = Number(part) - 1;
      if (index < 0 || index >= knownAgents.length) {
        throw new OperatorError(`unknown choice: ${part}`, 2);
      }
      ids.push(knownAgents[index].id);
      continue;
    }
    ids.push(part);
  }
  return [...new Set(ids)];
}

/**
 * @param {{ id: string, label: string }[]} knownAgents
 * @param {string[]} [initialSelected]
 */
export function createCheckboxState(knownAgents, initialSelected = []) {
  return {
    items: [
      ...knownAgents,
      { id: ALL_AGENTS_ID, label: ALL_AGENTS_LABEL },
    ],
    cursor: 0,
    selected: [...initialSelected],
    hint: '',
  };
}

/**
 * @param {{ items: { id: string, label: string }[], cursor: number, selected: string[], hint?: string }} state
 */
export function renderCheckboxFrame(state) {
  const lines = [
    'Which coding agents should Operator install skills for?',
    '↑/↓ move   space check   enter confirm   ctrl+c cancel',
    '',
  ];
  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    const pointer = i === state.cursor ? '>' : ' ';
    const box = state.selected.includes(item.id) ? '[x]' : '[ ]';
    lines.push(`${pointer} ${box} ${item.label}  (${item.id})`);
  }
  if (state.hint) {
    lines.push('', state.hint);
  }
  return `${lines.join('\n')}\n`;
}

/** @param {string} frame */
export function frameLineCount(frame) {
  const body = frame.endsWith('\n') ? frame.slice(0, -1) : frame;
  return body.split('\n').length;
}

/**
 * @param {{ name?: string, ctrl?: boolean } | undefined} key
 * @param {string} [str]
 */
export function keypressName(key, str = '') {
  if (key?.ctrl && key.name === 'c') return 'ctrl-c';
  if (key?.name === 'return' || key?.name === 'enter') return 'enter';
  if (key?.name === 'space' || str === ' ') return 'space';
  if (key?.name === 'up' || str === 'k') return 'up';
  if (key?.name === 'down' || str === 'j') return 'down';
  if (str === 'a' || key?.name === 'a') return 'a';
  if (key?.name === 'escape') return 'escape';
  return '';
}

/**
 * @param {{ items: { id: string, label: string }[], cursor: number, selected: string[], hint?: string }} state
 * @param {string} key
 * @returns {{ state: typeof state, action: 'redraw' | 'confirm' | 'cancel' }}
 */
export function applyCheckboxKey(state, key) {
  const n = state.items.length;
  if (key === 'up') {
    return { state: { ...state, cursor: (state.cursor - 1 + n) % n, hint: '' }, action: 'redraw' };
  }
  if (key === 'down') {
    return { state: { ...state, cursor: (state.cursor + 1) % n, hint: '' }, action: 'redraw' };
  }
  if (key === 'space') {
    const id = state.items[state.cursor].id;
    const set = new Set(state.selected);
    if (set.has(id)) {
      set.delete(id);
    } else if (id === ALL_AGENTS_ID) {
      return { state: { ...state, selected: [ALL_AGENTS_ID], hint: '' }, action: 'redraw' };
    } else {
      set.delete(ALL_AGENTS_ID);
      set.add(id);
    }
    return { state: { ...state, selected: [...set], hint: '' }, action: 'redraw' };
  }
  if (key === 'a') {
    const ids = state.items.filter((item) => item.id !== ALL_AGENTS_ID).map((item) => item.id);
    const allOn = ids.every((id) => state.selected.includes(id)) && !state.selected.includes(ALL_AGENTS_ID);
    return { state: { ...state, selected: allOn ? [] : ids, hint: '' }, action: 'redraw' };
  }
  if (key === 'enter') {
    if (state.selected.length === 0) {
      return {
        state: { ...state, hint: 'Check at least one agent with space, then press enter.' },
        action: 'redraw',
      };
    }
    return { state, action: 'confirm' };
  }
  if (key === 'ctrl-c' || key === 'escape') {
    return { state, action: 'cancel' };
  }
  return { state, action: 'redraw' };
}

/**
 * @param {{ id: string, label: string }[]} knownAgents
 * @param {{ stdin?: NodeJS.ReadStream, stdout?: NodeJS.WritableStream }} [opts]
 */
export async function promptAgents(knownAgents, opts = {}) {
  const input = opts.stdin ?? process.stdin;
  const output = opts.stdout ?? process.stdout;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new OperatorError(MISSING_AGENT_MESSAGE, 2);
  }

  let state = createCheckboxState(knownAgents);
  let frame = renderCheckboxFrame(state);
  let lineCount = frameLineCount(frame);
  output.write(HIDE_CURSOR);
  output.write(frame);

  return new Promise((resolve, reject) => {
    readline.emitKeypressEvents(input);
    const previousRaw = Boolean(input.isRaw);
    input.setRawMode(true);
    input.resume();

    const clearFrame = () => {
      output.write(`\x1B[${lineCount}A\x1B[1G\x1B[J`);
    };

    const finish = (next) => {
      input.off('keypress', onKeypress);
      if (typeof input.setRawMode === 'function') input.setRawMode(previousRaw);
      output.write(SHOW_CURSOR);
      next();
    };

    const onKeypress = (str, key) => {
      const name = keypressName(key, str);
      if (!name) return;
      const result = applyCheckboxKey(state, name);
      state = result.state;
      if (result.action === 'cancel') {
        finish(() => {
          clearFrame();
          reject(new OperatorError('cancelled', 2));
        });
        return;
      }
      if (result.action === 'confirm') {
        finish(() => {
          clearFrame();
          output.write(`Selected agents: ${state.selected.join(', ')}\n`);
          resolve(state.selected);
        });
        return;
      }
      clearFrame();
      frame = renderCheckboxFrame(state);
      lineCount = frameLineCount(frame);
      output.write(frame);
    };

    input.on('keypress', onKeypress);
  });
}

/**
 * @param {{ yes?: boolean, stdin?: NodeJS.ReadableStream }} [opts]
 */
export function isInteractive(opts = {}) {
  if (opts.yes) return false;
  const stdin = opts.stdin ?? process.stdin;
  return Boolean(stdin.isTTY);
}

/**
 * @param {{
 *   agents?: string[],
 *   yes?: boolean,
 *   command: 'init' | 'update' | 'remove',
 *   destRoot: string,
 *   knownAgents: { id: string, label: string }[],
 *   stdin?: NodeJS.ReadableStream,
 *   stdout?: NodeJS.WritableStream,
 *   promptFn?: (knownAgents: { id: string, label: string }[]) => Promise<string[]>,
 * }} opts
 */
export async function resolveAgents(opts) {
  const fromFlag = normalizeAgents(opts.agents);
  if (fromFlag.length > 0) return fromFlag;

  if (opts.command !== 'init') {
    const saved = readSavedAgents(opts.destRoot);
    if (saved && saved.length > 0) return saved;
  }

  if (opts.promptFn) {
    return normalizeAgents(await opts.promptFn(opts.knownAgents));
  }

  if (!isInteractive(opts)) {
    throw new OperatorError(MISSING_AGENT_MESSAGE, 2);
  }

  return normalizeAgents(await promptAgents(opts.knownAgents, opts));
}
