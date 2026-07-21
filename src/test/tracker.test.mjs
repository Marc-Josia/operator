// Tracker defaults & op-init invariants (ADR-0021). The tracker is a mirror:
// the shipped config must default to fully-local `markdown`, the work-item
// template must carry the `tracker_ref:` handle field, and the op-init
// procedure must exist and offer all three tracking modes. These pin the
// feature's contract so a payload edit cannot silently make an external
// tracker the default or drop the mirror field.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAYLOAD = path.join(REPO_ROOT, 'src', 'payload');

function read(...segments) {
  return fs.readFileSync(path.join(...segments), 'utf8');
}

test('shipped config defaults the tracker to fully-local markdown', () => {
  const config = JSON.parse(read(PAYLOAD, 'operator', 'config.json'));
  assert.equal(config.tracker, 'markdown', 'default tracker must be markdown (offline, no mirror)');
  assert.deepEqual(config.trackerConfig, {}, 'trackerConfig ships empty until an external tracker is chosen');
});

test('the work-item template carries the tracker_ref mirror handle', () => {
  const tmpl = read(PAYLOAD, 'operator', 'templates', 'workitem.md');
  const frontmatter = tmpl.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  assert.match(frontmatter, /^tracker_ref:/m, 'workitem frontmatter must declare tracker_ref:');
});

test('op-init ships and offers markdown, GitHub, and Linear', () => {
  const skill = read(PAYLOAD, 'skills', 'op-init', 'SKILL.md');
  const name = skill.match(/^---\n[\s\S]*?^name:[ \t]*(\S+)[ \t]*$/m)?.[1];
  assert.equal(name, 'op-init', 'op-init SKILL.md frontmatter name must be op-init');
  for (const mode of ['markdown', 'github', 'linear', 'Linear', 'GitHub']) {
    assert.match(skill, new RegExp(mode), `op-init must mention the ${mode} tracking option`);
  }
});
