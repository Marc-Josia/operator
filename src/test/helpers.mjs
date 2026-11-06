import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultPackageRoot, writeJson } from '../lib/fsutil.mjs';
import { markerPath } from '../lib/references.mjs';

export function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'operator-'));
}

export function packageRoot() {
  return defaultPackageRoot();
}

export function writeSkill(root, relDir, name) {
  const dir = path.join(root, relDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n---\n`, 'utf8');
}

export const V2_REF_FILES = [
  'accessibility-checklist.md',
  'definition-of-done.md',
  'security-checklist.md',
];

/** Lay out a v2 managed references/ folder with its manifest (saved agents included). */
export function writeV2References(destRoot, { agents = ['cursor'], files = V2_REF_FILES } = {}) {
  fs.mkdirSync(path.join(destRoot, 'references'), { recursive: true });
  for (const file of files) {
    fs.writeFileSync(path.join(destRoot, 'references', file), '# checklist\n', 'utf8');
  }
  writeJson(markerPath(destRoot), {
    source: 'addyosmani/agent-skills/references',
    branch: 'main',
    files,
    agents,
  });
}
