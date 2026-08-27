import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, HELP } from '../bin/operator.mjs';
import { OperatorError } from '../lib/fsutil.mjs';

test('parseArgs reads commands and flags', () => {
  const { flags, positional } = parseArgs(['init', '-y', '--agent', 'cursor,claude-code', '--copy']);
  assert.deepEqual(positional, ['init']);
  assert.equal(flags.yes, true);
  assert.equal(flags.copy, true);
  assert.equal(flags.agent, 'cursor,claude-code');
});

test('parseArgs repeats --agent by joining', () => {
  const { flags } = parseArgs(['init', '--agent', 'cursor', '--agent', 'codex']);
  assert.equal(flags.agent, 'cursor,codex');
});

test('parseArgs rejects unknown options', () => {
  assert.throws(() => parseArgs(['init', '--nope']), (err) => {
    assert.ok(err instanceof OperatorError);
    assert.equal(err.code, 2);
    assert.ok(String(err.message).includes('--nope'));
    return true;
  });
});

test('help text names the four commands', () => {
  for (const command of ['init', 'update', 'status', 'remove']) {
    assert.ok(HELP.includes(command));
  }
});
