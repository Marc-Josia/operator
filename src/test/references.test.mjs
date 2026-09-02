import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../lib/catalog.mjs';
import { installReferences, markerPath, rawUrl, referencesStatus, removeReferences } from '../lib/references.mjs';
import { packageRoot, tmpDir } from './helpers.mjs';

function mockFetch(body = 'checklist') {
  /** @type {string[]} */
  const urls = [];
  const fetchFn = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => body,
    };
  };
  return { fetchFn, urls };
}

test('rawUrl points at GitHub raw for Addy references', () => {
  assert.equal(
    rawUrl('addyosmani/agent-skills', 'main', 'references', 'security-checklist.md'),
    'https://raw.githubusercontent.com/addyosmani/agent-skills/main/references/security-checklist.md',
  );
});

test('installReferences writes files and a managed marker', async () => {
  const destRoot = tmpDir();
  const catalog = loadCatalog(packageRoot());
  const { fetchFn, urls } = mockFetch('# security');
  await installReferences({ catalog, destRoot, fetchFn, agents: ['cursor'] });
  assert.equal(urls.length, catalog.references.files.length);
  for (const file of catalog.references.files) {
    const text = fs.readFileSync(path.join(destRoot, 'references', file), 'utf8');
    assert.equal(text, '# security');
  }
  const status = referencesStatus(destRoot);
  assert.equal(status.managed, true);
  assert.equal(status.missing.length, 0);
  assert.equal(status.files.length, catalog.references.files.length);
  assert.ok(fs.existsSync(markerPath(destRoot)));
  const marker = JSON.parse(fs.readFileSync(markerPath(destRoot), 'utf8'));
  assert.deepEqual(marker.agents, ['cursor']);
});

test('removeReferences --purge deletes only Operator-managed files', async () => {
  const destRoot = tmpDir();
  const catalog = loadCatalog(packageRoot());
  const { fetchFn } = mockFetch('x');
  await installReferences({ catalog, destRoot, fetchFn });
  fs.writeFileSync(path.join(destRoot, 'references', 'keep-me.md'), 'mine', 'utf8');
  const result = removeReferences(destRoot, { purge: true });
  assert.equal(result.removed, true);
  assert.equal(fs.existsSync(path.join(destRoot, 'references', 'keep-me.md')), true);
  assert.equal(fs.existsSync(markerPath(destRoot)), false);
  assert.equal(fs.existsSync(path.join(destRoot, 'references', 'security-checklist.md')), false);
});

test('removeReferences without purge leaves references in place', async () => {
  const destRoot = tmpDir();
  const catalog = loadCatalog(packageRoot());
  await installReferences({ catalog, destRoot, fetchFn: mockFetch('x').fetchFn });
  const result = removeReferences(destRoot, { purge: false });
  assert.equal(result.removed, false);
  assert.equal(fs.existsSync(markerPath(destRoot)), true);
});
