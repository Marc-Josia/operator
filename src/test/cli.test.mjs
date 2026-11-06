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

test('parseArgs reads --tracker as one value; the last one wins', () => {
  assert.equal(parseArgs(['init', '--tracker', 'github']).flags.tracker, 'github');
  assert.equal(parseArgs(['init', '--tracker=Jira project WEB']).flags.tracker, 'Jira project WEB');
  assert.equal(parseArgs(['update', '--tracker', 'local', '--tracker', 'linear']).flags.tracker, 'linear');
  assert.throws(() => parseArgs(['init', '--tracker']), (err) => err.code === 2);
});

test('parseArgs no longer accepts --purge', () => {
  assert.throws(() => parseArgs(['remove', '--purge']), (err) => err.code === 2);
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
  assert.ok(HELP.includes('--tracker'));
  assert.ok(HELP.includes('plain words'));
  assert.ok(!HELP.includes('/operator'));
  assert.ok(!HELP.includes('setup-matt-pocock-skills'));
  assert.ok(!/Matt|Addy/.test(HELP.replace('v2 Matt/Addy', '')));
});
