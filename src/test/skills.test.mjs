import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFlags, buildAddArgs, buildRemoveArgs, buildUpdateArgs, normalizeAgents, shouldCopy } from '../lib/skills.mjs';

test('normalizeAgents does not default to all agents', () => {
  assert.deepEqual(normalizeAgents(undefined), []);
  assert.deepEqual(normalizeAgents([]), []);
  assert.deepEqual(normalizeAgents(['cursor,claude-code', 'codex']), ['cursor', 'claude-code', 'codex']);
});

test('buildAddArgs is non-interactive and selects named skills', () => {
  const args = buildAddArgs({
    repo: 'cursor/plugins',
    skills: ['unslop', 'correct'],
    agents: ['cursor'],
    copy: true,
  });
  assert.deepEqual(args, [
    '--yes', 'skills@latest', 'add', 'cursor/plugins',
    '--skill', 'unslop',
    '--skill', 'correct',
    '--agent', 'cursor',
    '-y',
    '--copy',
  ]);
});

test('buildAddArgs supports all-agents and global', () => {
  const args = buildAddArgs({
    repo: 'cursor/plugins',
    skills: ['blast-radius'],
    agents: ['*'],
    global: true,
    copy: true,
  });
  assert.ok(args.includes('-g'));
  assert.deepEqual(args.slice(args.indexOf('--agent'), args.indexOf('--agent') + 2), ['--agent', '*']);
});

test('buildUpdateArgs pins project scope by default', () => {
  const args = buildUpdateArgs({ skills: ['unslop', 'correct'] });
  assert.deepEqual(args, ['--yes', 'skills@latest', 'update', 'unslop', 'correct', '-p', '-y']);
});

test('buildRemoveArgs passes catalog names through without --copy', () => {
  const args = buildRemoveArgs({
    skills: ['grill', 'unslop'],
    agents: ['*'],
    copy: true,
  });
  assert.deepEqual(args.slice(0, 5), ['--yes', 'skills@latest', 'remove', 'grill', 'unslop']);
  assert.ok(args.includes('grill'));
  assert.ok(args.includes('unslop'));
  assert.ok(args.includes('-y'));
  assert.ok(!args.includes('--copy'));
});

test('shouldCopy is true when requested', () => {
  assert.equal(shouldCopy(true), true);
});

test('applyFlags always passes -y and requires agents', () => {
  const args = applyFlags(['cmd'], { agents: ['cursor'], copy: true });
  assert.ok(args.includes('-y'));
  assert.ok(args.includes('--copy'));
  assert.throws(() => applyFlags(['cmd'], { copy: true }), (err) => {
    assert.equal(err.code, 2);
    return true;
  });
});
