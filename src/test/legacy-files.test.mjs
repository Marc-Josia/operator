import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { END_MARKER, START_MARKER, cleanAgentsText, cleanupLegacyFiles, detectLegacyFiles } from '../lib/legacy-files.mjs';
import { tmpDir } from './helpers.mjs';

const BLOCK = `${START_MARKER}\nRead @OPERATOR.md.\n${END_MARKER}\n`;

test('cleanAgentsText strips the block and keeps the rest', () => {
  const result = cleanAgentsText(`${BLOCK}\n# Project\n\nHello.\n`);
  assert.equal(result.blockRemoved, true);
  assert.equal(result.trackerRemoved, false);
  assert.equal(result.empty, false);
  assert.equal(result.text, '# Project\n\nHello.\n');
});

test('cleanAgentsText is empty when only the scaffold headings remain', () => {
  const text = `${BLOCK}\n## Project context\n\nSpecs and tickets live in: Linear\n\n## Commands\n`;
  const result = cleanAgentsText(text);
  assert.equal(result.trackerRemoved, true);
  assert.equal(result.empty, true);
});

test('cleanAgentsText ignores a tracker line inside the block and a file with nothing to strip', () => {
  const inside = `${START_MARKER}\nSpecs and tickets live in: x\n${END_MARKER}\n# Mine\n`;
  assert.equal(cleanAgentsText(inside).trackerRemoved, false);
  const plain = cleanAgentsText('## Commands\n');
  assert.equal(plain.blockRemoved, false);
  assert.equal(plain.empty, false, 'an untouched scaffold-looking file is the user\'s');
});

test('cleanupLegacyFiles does nothing on a clean repo', () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Mine\n', 'utf8');
  const result = cleanupLegacyFiles({ cwd });
  assert.deepEqual(result, { notes: [], claudeMd: undefined });
  assert.equal(detectLegacyFiles(cwd, undefined).any, false);
  assert.equal(fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8'), '# Mine\n');
});

test('cleanupLegacyFiles drops the record when the import line is already gone', () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Mine\n', 'utf8');
  const result = cleanupLegacyFiles({ cwd, claudeMd: { importAdded: true, fileCreated: false } });
  assert.equal(result.claudeMd, undefined);
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '# Mine\n');
});
