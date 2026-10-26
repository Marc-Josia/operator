import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { legacyGlossaryFiles, legacyGlossaryWarning } from '../lib/glossary.mjs';
import { tmpDir } from './helpers.mjs';

test('legacyGlossaryFiles reports old domain docs with no new-name file beside them', () => {
  const cwd = tmpDir();
  assert.deepEqual(legacyGlossaryFiles(cwd), []);

  fs.writeFileSync(path.join(cwd, 'CONTEXT.md'), '# Glossary\n', 'utf8');
  fs.writeFileSync(path.join(cwd, 'CONTEXT-MAP.md'), '# Map\n', 'utf8');
  const legacy = legacyGlossaryFiles(cwd);
  assert.deepEqual(legacy, [
    { from: 'CONTEXT.md', to: 'GLOSSARY.md' },
    { from: 'CONTEXT-MAP.md', to: 'GLOSSARY-MAP.md' },
  ]);
  assert.ok(legacyGlossaryWarning(legacy).includes('git mv CONTEXT.md GLOSSARY.md'));

  fs.writeFileSync(path.join(cwd, 'GLOSSARY.md'), '# Glossary\n', 'utf8');
  assert.deepEqual(legacyGlossaryFiles(cwd), [{ from: 'CONTEXT-MAP.md', to: 'GLOSSARY-MAP.md' }]);
  assert.ok(fs.existsSync(path.join(cwd, 'CONTEXT.md')));
});
