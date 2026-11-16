import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import {
  normalizeTracker,
  parseTrackerAnswer,
  promptTracker,
  resolveTracker,
} from '../lib/tracker.mjs';

test('normalizeTracker maps presets in any case and keeps free text', () => {
  assert.equal(normalizeTracker('GitHub'), 'github');
  assert.equal(normalizeTracker(' local '), 'local');
  assert.equal(normalizeTracker('Notion  board'), 'Notion board');
  assert.equal(normalizeTracker('   '), undefined);
  assert.equal(normalizeTracker(undefined), undefined);
});

test('parseTrackerAnswer reads numbers, names, and the other choice', () => {
  assert.deepEqual(parseTrackerAnswer('1'), { tracker: 'local' });
  assert.deepEqual(parseTrackerAnswer('2'), { tracker: 'github' });
  assert.deepEqual(parseTrackerAnswer('3'), { tracker: 'linear' });
  assert.deepEqual(parseTrackerAnswer('4'), { needsText: true });
  assert.deepEqual(parseTrackerAnswer('linear'), { tracker: 'linear' });
  assert.throws(() => parseTrackerAnswer('9'), (err) => err.code === 2);
});

/** Answer each prompt as it appears, like a person at a terminal. */
function scriptedTerminal(answers) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  let transcript = '';
  stdout.on('data', (chunk) => {
    transcript += String(chunk);
    if (/(Choice \[.*\]:|Where\?) $/.test(transcript) && answers.length > 0) {
      transcript = '';
      stdin.write(`${answers.shift()}\n`);
    }
  });
  return { stdin, stdout };
}

test('promptTracker asks once, with other as free text', async () => {
  assert.equal(await promptTracker({ ...scriptedTerminal(['2']) }), 'github');
  assert.equal(await promptTracker({ ...scriptedTerminal(['4', 'Jira project WEB']) }), 'Jira project WEB');
  assert.equal(await promptTracker({ ...scriptedTerminal(['']), current: 'linear' }), 'linear', 'enter keeps the current choice');
  assert.equal(await promptTracker({ ...scriptedTerminal(['9', '1']), current: 'github' }), 'local');
});

test('resolveTracker: flag, then prompt, then saved or local when non-interactive', async () => {
  const notTty = new PassThrough();
  assert.equal(await resolveTracker({ tracker: 'Linear', trackerPromptFn: async () => 'github' }), 'linear');
  assert.equal(await resolveTracker({ trackerPromptFn: async () => 'github' }), 'github');
  assert.equal(await resolveTracker({ yes: true }), 'local');
  assert.equal(await resolveTracker({ yes: true, saved: 'github' }), 'github');
  assert.equal(await resolveTracker({ stdin: notTty }), 'local');
});

