import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, HELP, main } from '../bin/operator.mjs';
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

test('help text names the four commands and the agent prompt', () => {
  for (const command of ['init', 'update', 'status', 'remove']) {
    assert.ok(HELP.includes(command));
  }
  assert.ok(HELP.includes('checkbox list'));
  assert.ok(HELP.includes('space check'));
});

test('loop arguments preserve paths and reject invalid action/flag combinations', async () => {
  assert.deepEqual(parseArgs(['loop', 'start', '--contract', 'docs/my feature.json']), {
    positional: ['loop', 'start'], flags: { contract: 'docs/my feature.json' },
  });
  assert.throws(() => parseArgs(['loop', 'start', '--contract', 'a', '--contract', 'b']), /cannot be repeated/);
  for (const args of [
    ['loop'], ['loop', 'start'], ['loop', 'resume'],
    ['loop', 'start', '--contract', 'a', '--id', 'b'],
    ['loop', 'resume', '--id', 'a', '--contract', 'b'],
    ['loop', 'status', '--id', 'a', '--contract', 'b'],
    ['loop', 'start', '--contract', 'a', '--yes'],
    ['status', '--contract', 'a'],
  ]) await assert.rejects(main(args), (error) => error instanceof OperatorError && error.code === 2);
});
