import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultPackageRoot } from '../lib/fsutil.mjs';

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
