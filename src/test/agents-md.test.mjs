import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { END_MARKER, START_MARKER, agentsBlockStatus, stripAgentsBlock, upsertAgentsBlock } from '../lib/agents-md.mjs';
import { tmpDir } from './helpers.mjs';

const BLOCK = '# Operator\n\nOnly router.';

test('upsertAgentsBlock creates AGENTS.md when missing', () => {
  const cwd = tmpDir();
  const result = upsertAgentsBlock({ cwd, block: BLOCK });
  assert.equal(result.created, true);
  const text = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(text.startsWith(START_MARKER));
  assert.ok(text.includes(BLOCK));
  assert.ok(text.includes(END_MARKER));
  assert.deepEqual(agentsBlockStatus(cwd), { present: true, managed: true });
});

test('upsertAgentsBlock appends to existing AGENTS.md without a block', () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Project\n\nHello.\n', 'utf8');
  upsertAgentsBlock({ cwd, block: BLOCK });
  const text = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(text.startsWith('# Project'));
  assert.ok(text.includes(START_MARKER));
  assert.ok(text.includes('Hello.'));
});

test('upsertAgentsBlock replaces an existing managed block', () => {
  const cwd = tmpDir();
  fs.writeFileSync(
    path.join(cwd, 'AGENTS.md'),
    `# Keep\n${START_MARKER}\nold\n${END_MARKER}\n# After\n`,
    'utf8',
  );
  upsertAgentsBlock({ cwd, block: BLOCK });
  const text = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(text.includes('# Keep'));
  assert.ok(text.includes('# After'));
  assert.ok(text.includes(BLOCK));
  assert.ok(!text.includes('\nold\n'));
  assert.equal(text.split(START_MARKER).length - 1, 1);
});

test('stripAgentsBlock removes only the managed section', () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Keep\n\n', 'utf8');
  upsertAgentsBlock({ cwd, block: BLOCK });
  const stripped = stripAgentsBlock(cwd);
  assert.equal(stripped.removed, true);
  const text = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(text.includes('# Keep'));
  assert.ok(!text.includes(START_MARKER));
  assert.deepEqual(agentsBlockStatus(cwd), { present: true, managed: false });
});

test('stripAgentsBlock deletes AGENTS.md when the file would be empty', () => {
  const cwd = tmpDir();
  upsertAgentsBlock({ cwd, block: BLOCK });
  stripAgentsBlock(cwd);
  assert.equal(fs.existsSync(path.join(cwd, 'AGENTS.md')), false);
});
