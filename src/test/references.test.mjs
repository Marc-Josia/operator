import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { legacyReferencesStatus, markerPath, purgeLegacyReferences } from '../lib/references.mjs';
import { V2_REF_FILES, tmpDir, writeV2References } from './helpers.mjs';

test('legacyReferencesStatus reads the v2 manifest', () => {
  const destRoot = tmpDir();
  assert.deepEqual(legacyReferencesStatus(destRoot), { managed: false, files: [] });
  writeV2References(destRoot);
  assert.deepEqual(legacyReferencesStatus(destRoot), { managed: true, files: V2_REF_FILES });
});

test('purgeLegacyReferences deletes only manifest files and keeps user files', () => {
  const destRoot = tmpDir();
  writeV2References(destRoot);
  fs.writeFileSync(path.join(destRoot, 'references', 'keep-me.md'), 'mine', 'utf8');
  const result = purgeLegacyReferences(destRoot);
  assert.equal(result.removed, true);
  assert.equal(fs.existsSync(path.join(destRoot, 'references', 'keep-me.md')), true);
  assert.equal(fs.existsSync(markerPath(destRoot)), false);
  for (const file of V2_REF_FILES) {
    assert.equal(fs.existsSync(path.join(destRoot, 'references', file)), false);
  }
});

test('purgeLegacyReferences removes the folder when nothing else is left', () => {
  const destRoot = tmpDir();
  writeV2References(destRoot);
  purgeLegacyReferences(destRoot);
  assert.equal(fs.existsSync(path.join(destRoot, 'references')), false);
});

test('purgeLegacyReferences leaves an unmanaged references/ alone', () => {
  const destRoot = tmpDir();
  fs.mkdirSync(path.join(destRoot, 'references'));
  fs.writeFileSync(path.join(destRoot, 'references', 'security-checklist.md'), 'mine', 'utf8');
  assert.equal(purgeLegacyReferences(destRoot).removed, false);
  assert.equal(fs.existsSync(path.join(destRoot, 'references', 'security-checklist.md')), true);
});

test('purgeLegacyReferences never follows a manifest path out of references/', () => {
  const destRoot = tmpDir();
  fs.writeFileSync(path.join(destRoot, 'outside.md'), 'mine', 'utf8');
  writeV2References(destRoot, { files: ['../outside.md'] });
  purgeLegacyReferences(destRoot);
  assert.equal(fs.existsSync(path.join(destRoot, 'outside.md')), true);
});
