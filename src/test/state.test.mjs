import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeJson } from '../lib/fsutil.mjs';
import { readSavedAgents, readState, removeState, statePath, writeState } from '../lib/state.mjs';
import { destRoot } from '../lib/scan.mjs';
import { resolveAgents } from '../lib/target-agents.mjs';
import { tmpDir, writeV2References } from './helpers.mjs';

test('state lives in .operator/state.json at the project root, or in the home dir with -g', () => {
  const cwd = tmpDir();
  assert.equal(statePath(destRoot(cwd, false)), path.join(cwd, '.operator', 'state.json'));
  assert.equal(statePath(destRoot(cwd, true)), path.join(os.homedir(), '.operator', 'state.json'));
});

test('writeState / readState round-trip the agents, tracker, and CLAUDE.md record', () => {
  const root = tmpDir();
  writeState(root, {
    version: 3,
    agents: ['claude-code'],
    tracker: 'github',
    claudeMd: { importAdded: true, fileCreated: false },
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(statePath(root), 'utf8')), {
    version: 3,
    agents: ['claude-code'],
    tracker: 'github',
    claudeMd: { importAdded: true, fileCreated: false },
  });
  assert.deepEqual(readState(root), {
    state: { version: 3, agents: ['claude-code'], tracker: 'github', claudeMd: { importAdded: true, fileCreated: false } },
    exists: true,
    migrated: false,
  });
});

test('readState falls back to the v2 manifest only when the state file is missing', () => {
  const root = tmpDir();
  assert.deepEqual(readState(root), { state: { version: 3 }, exists: false, migrated: false });
  writeV2References(root, { agents: ['windsurf'] });
  assert.deepEqual(readState(root), { state: { version: 3, agents: ['windsurf'] }, exists: false, migrated: true });
  writeState(root, { version: 3, agents: ['cursor'] });
  assert.deepEqual(readSavedAgents(root), ['cursor']);
});

test('resolveAgents on update prefers the state file over the old manifest', async () => {
  const root = tmpDir();
  writeV2References(root, { agents: ['windsurf'] });
  writeJson(statePath(root), { version: 3, agents: ['codex'] });
  const agents = await resolveAgents({ command: 'update', destRoot: root, knownAgents: [], yes: true });
  assert.deepEqual(agents, ['codex']);
});

test('removeState deletes the file and the empty .operator folder', () => {
  const root = tmpDir();
  writeState(root, { version: 3, agents: ['cursor'] });
  assert.deepEqual(removeState(root), { removed: true });
  assert.equal(fs.existsSync(path.join(root, '.operator')), false);
  assert.deepEqual(removeState(root), { removed: false });
});
