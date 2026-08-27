import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFlags, buildAddArgs, buildRemoveArgs, buildUpdateArgs, normalizeAgents, shouldCopy } from '../lib/skills.mjs';

test('normalizeAgents defaults to all agents', () => {
  assert.deepEqual(normalizeAgents(undefined), ['*']);
  assert.deepEqual(normalizeAgents([]), ['*']);
  assert.deepEqual(normalizeAgents(['cursor,claude-code', 'codex']), ['cursor', 'claude-code', 'codex']);
});

test('buildAddArgs is non-interactive and selects named skills', () => {
  const args = buildAddArgs({
    repo: 'mattpocock/skills',
    skills: ['tdd', 'implement'],
    agents: ['cursor'],
    copy: true,
  });
  assert.deepEqual(args, [
    '--yes', 'skills@latest', 'add', 'mattpocock/skills',
    '--skill', 'tdd',
    '--skill', 'implement',
    '--agent', 'cursor',
    '-y',
    '--copy',
  ]);
});

test('buildAddArgs supports all-agents and global', () => {
  const args = buildAddArgs({
    repo: 'addyosmani/agent-skills',
    skills: ['security-and-hardening'],
    global: true,
    copy: true,
  });
  assert.ok(args.includes('-g'));
  assert.deepEqual(args.slice(args.indexOf('--agent'), args.indexOf('--agent') + 2), ['--agent', '*']);
});

test('buildUpdateArgs pins project scope by default', () => {
  const args = buildUpdateArgs({ skills: ['tdd', 'operator'] });
  assert.deepEqual(args, ['--yes', 'skills@latest', 'update', 'tdd', 'operator', '-p', '-y']);
});

test('buildRemoveArgs passes catalog names through without --copy', () => {
  const args = buildRemoveArgs({
    skills: ['tdd', 'operator'],
    agents: ['*'],
    copy: true,
  });
  assert.deepEqual(args.slice(0, 5), ['--yes', 'skills@latest', 'remove', 'tdd', 'operator']);
  assert.ok(args.includes('tdd'));
  assert.ok(args.includes('operator'));
  assert.ok(args.includes('-y'));
  assert.ok(!args.includes('--copy'));
});

test('shouldCopy is true when requested', () => {
  assert.equal(shouldCopy(true), true);
});

test('applyFlags always passes -y', () => {
  const args = applyFlags(['cmd'], { copy: true });
  assert.ok(args.includes('-y'));
  assert.ok(args.includes('--copy'));
});
