import test from 'node:test';
import assert from 'node:assert/strict';
import { OperatorError, writeJson } from '../lib/fsutil.mjs';
import { markerPath } from '../lib/references.mjs';
import {
  ALL_AGENTS_ID,
  MISSING_AGENT_MESSAGE,
  applyCheckboxKey,
  createCheckboxState,
  parseAgentSelection,
  renderCheckboxFrame,
  resolveAgents,
} from '../lib/target-agents.mjs';
import { tmpDir } from './helpers.mjs';

const KNOWN = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'windsurf', label: 'Windsurf' },
];

test('parseAgentSelection accepts numbers, ids, and all', () => {
  assert.deepEqual(parseAgentSelection('1,2', KNOWN), ['cursor', 'claude-code']);
  assert.deepEqual(parseAgentSelection('cursor claude-code', KNOWN), ['cursor', 'claude-code']);
  assert.deepEqual(parseAgentSelection('*', KNOWN), ['*']);
  assert.deepEqual(parseAgentSelection('all', KNOWN), ['*']);
  assert.deepEqual(parseAgentSelection('a', KNOWN), ['*']);
});

test('parseAgentSelection rejects empty or mixed all', () => {
  assert.throws(() => parseAgentSelection('', KNOWN), (err) => err instanceof OperatorError && err.code === 2);
  assert.throws(() => parseAgentSelection('1,*', KNOWN), (err) => err instanceof OperatorError && err.code === 2);
  assert.throws(() => parseAgentSelection('99', KNOWN), (err) => err instanceof OperatorError && err.code === 2);
});

test('checkbox list uses space to toggle and enter to confirm', () => {
  let state = createCheckboxState(KNOWN);
  const frame = renderCheckboxFrame(state);
  assert.ok(frame.includes('[ ] Cursor'));
  assert.ok(frame.includes('space check'));
  assert.ok(frame.includes(ALL_AGENTS_ID));

  state = applyCheckboxKey(state, 'space').state;
  assert.deepEqual(state.selected, ['cursor']);
  assert.ok(renderCheckboxFrame(state).includes('[x] Cursor'));

  state = applyCheckboxKey(state, 'down').state;
  state = applyCheckboxKey(state, 'space').state;
  assert.deepEqual(state.selected, ['cursor', 'claude-code']);

  const confirm = applyCheckboxKey(state, 'enter');
  assert.equal(confirm.action, 'confirm');
});

test('checkbox enter without a check asks again; all is exclusive', () => {
  let state = createCheckboxState(KNOWN);
  const empty = applyCheckboxKey(state, 'enter');
  assert.equal(empty.action, 'redraw');
  assert.ok(empty.state.hint.includes('space'));

  state = applyCheckboxKey(state, 'space').state;
  state = applyCheckboxKey({ ...state, cursor: state.items.length - 1 }, 'space').state;
  assert.deepEqual(state.selected, [ALL_AGENTS_ID]);

  const cancelled = applyCheckboxKey(state, 'ctrl-c');
  assert.equal(cancelled.action, 'cancel');
});

test('resolveAgents prefers --agent over a saved choice', async () => {
  const dest = tmpDir();
  writeJson(markerPath(dest), { agents: ['windsurf'], files: [] });
  const agents = await resolveAgents({
    agents: ['cursor'],
    command: 'update',
    destRoot: dest,
    knownAgents: KNOWN,
    yes: true,
  });
  assert.deepEqual(agents, ['cursor']);
});

test('resolveAgents reuses saved agents on update', async () => {
  const dest = tmpDir();
  writeJson(markerPath(dest), { agents: ['claude-code'], files: [] });
  const agents = await resolveAgents({
    command: 'update',
    destRoot: dest,
    knownAgents: KNOWN,
    yes: true,
  });
  assert.deepEqual(agents, ['claude-code']);
});

test('resolveAgents requires --agent when non-interactive and nothing is saved', async () => {
  await assert.rejects(
    () => resolveAgents({
      command: 'init',
      destRoot: tmpDir(),
      knownAgents: KNOWN,
      yes: true,
    }),
    (err) => err instanceof OperatorError && err.code === 2 && String(err.message).includes(MISSING_AGENT_MESSAGE),
  );
});

test('resolveAgents uses promptFn when --agent is omitted on init', async () => {
  const agents = await resolveAgents({
    command: 'init',
    destRoot: tmpDir(),
    knownAgents: KNOWN,
    promptFn: async () => ['cursor', 'windsurf'],
  });
  assert.deepEqual(agents, ['cursor', 'windsurf']);
});
