import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  END_MARKER,
  PROJECT_SECTIONS,
  START_MARKER,
  agentsBlockStatus,
  scaffoldProjectSections,
  stripAgentsBlock,
  upsertAgentsBlock,
} from '../lib/agents-md.mjs';
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

test('scaffoldProjectSections appends empty sections after the block, once', () => {
  const cwd = tmpDir();
  upsertAgentsBlock({ cwd, block: BLOCK });
  scaffoldProjectSections(cwd);
  const text = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  for (const title of PROJECT_SECTIONS) {
    assert.ok(text.indexOf(`## ${title}`) > text.indexOf(END_MARKER), `missing ${title}`);
  }
  assert.deepEqual(scaffoldProjectSections(cwd).added, []);
  assert.equal(fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8'), text);
});

test('scaffoldProjectSections keeps existing sections and their content', () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '## Commands\n\nnpm test\n', 'utf8');
  const { added } = scaffoldProjectSections(cwd);
  assert.ok(!added.includes('Commands'));
  const text = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.equal(text.split('## Commands').length - 1, 1);
  assert.ok(text.includes('npm test'));
});

test('upsertAgentsBlock leaves project sections after the block untouched', () => {
  const cwd = tmpDir();
  upsertAgentsBlock({ cwd, block: BLOCK });
  scaffoldProjectSections(cwd);
  const file = path.join(cwd, 'AGENTS.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('## Commands\n', '## Commands\n\nnpm test\n'), 'utf8');
  upsertAgentsBlock({ cwd, block: '# Operator\n\nNew block.' });
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(text.includes('New block.'));
  assert.ok(text.includes('## Commands\n\nnpm test'));
});

test('stripAgentsBlock deletes AGENTS.md when only the empty scaffold remains', () => {
  const cwd = tmpDir();
  upsertAgentsBlock({ cwd, block: BLOCK });
  scaffoldProjectSections(cwd);
  stripAgentsBlock(cwd);
  assert.equal(fs.existsSync(path.join(cwd, 'AGENTS.md')), false);
});

test('stripAgentsBlock keeps project sections that hold content', () => {
  const cwd = tmpDir();
  upsertAgentsBlock({ cwd, block: BLOCK });
  scaffoldProjectSections(cwd);
  const file = path.join(cwd, 'AGENTS.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('## Commands\n', '## Commands\n\nnpm test\n'), 'utf8');
  stripAgentsBlock(cwd);
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(!text.includes(START_MARKER));
  assert.ok(text.includes('npm test'));
});
