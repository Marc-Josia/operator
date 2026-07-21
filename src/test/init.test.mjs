// Tests for `operator init` (and the conservative `remove` semantics).
// Each test builds an isolated fixture: a copy of the real payload as the
// "package" plus an empty tmp project. node:test, zero dependencies.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { init } from '../lib/init.mjs';
import { remove } from '../lib/remove.mjs';
import { sha256File, walkFiles } from '../lib/fsutil.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const noop = () => {};

/** Copy of the real payload as an isolated package fixture + an empty project.
 *  The runtime gate checker is authored by a sibling build agent, so a stub is
 *  created only when the real file is absent. */
function makeFixture(t, { version = '0.1.0' } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-init-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const pkg = path.join(base, 'pkg');
  const payload = path.join(pkg, 'src', 'payload');
  fs.cpSync(path.join(REPO_ROOT, 'src', 'payload'), payload, { recursive: true });
  const op = path.join(payload, 'operator', 'bin', 'op.mjs');
  if (!fs.existsSync(op)) {
    fs.mkdirSync(path.dirname(op), { recursive: true });
    fs.writeFileSync(op, '#!/usr/bin/env node\n// test stub for the gate checker\n');
  }
  ensureSkill(payload, 'op-new');
  ensureSkill(payload, 'op-build');
  fs.writeFileSync(path.join(payload, 'operator', 'VERSION'), version + '\n');
  const proj = path.join(base, 'proj');
  fs.mkdirSync(path.join(proj, '.git'), { recursive: true }); // enough for the git presence check
  return { base, pkg, payload, proj };
}

function ensureSkill(payload, name) {
  const skillMd = path.join(payload, 'skills', name, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    fs.mkdirSync(path.dirname(skillMd), { recursive: true });
    fs.writeFileSync(skillMd, `---\nname: ${name}\ndescription: test fixture skill\n---\n\n# ${name}\n`);
  }
}

function read(...segments) {
  return fs.readFileSync(path.join(...segments), 'utf8');
}

test('fresh init copies the payload tree exactly and writes the hash inventory', async (t) => {
  const { pkg, payload, proj } = makeFixture(t);
  const report = await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'claude', log: noop });
  assert.equal(report.version, '0.1.0');

  // Every payload file lands at its target, byte-identical.
  for (const rel of walkFiles(path.join(payload, 'operator'))) {
    const src = fs.readFileSync(path.join(payload, 'operator', ...rel.split('/')));
    const dest = fs.readFileSync(path.join(proj, '.operator', ...rel.split('/')));
    assert.ok(src.equals(dest), `.operator/${rel} differs from the payload`);
  }
  for (const rel of walkFiles(path.join(payload, 'skills'))) {
    const src = fs.readFileSync(path.join(payload, 'skills', ...rel.split('/')));
    const dest = fs.readFileSync(path.join(proj, '.agents', 'skills', ...rel.split('/')));
    assert.ok(src.equals(dest), `.agents/skills/${rel} differs from the payload`);
  }

  // AGENTS.md carries the versioned managed block with the payload body.
  const agents = read(proj, 'AGENTS.md');
  assert.match(agents, /<!-- operator:begin v0\.1\.0 -->/);
  assert.match(agents, /<!-- operator:end -->/);
  assert.ok(agents.includes(read(payload, 'agents-block.md').trim()));

  // Inventory: version + installedAt + tools + per-file hashes; user-owned
  // paths (config, memory) are excluded; hashes match disk.
  const installed = JSON.parse(read(proj, '.operator', '.installed.json'));
  assert.equal(installed.version, '0.1.0');
  assert.ok(installed.installedAt);
  assert.deepEqual(installed.tools, ['claude']);
  assert.ok(installed.files['.operator/VERSION']);
  assert.ok(installed.files['.agents/skills/op-new/SKILL.md']);
  assert.ok(installed.files['AGENTS.md#operator-block']);
  assert.ok(!('.operator/config.json' in installed.files));
  assert.ok(!('.operator/.installed.json' in installed.files));
  assert.ok(!Object.keys(installed.files).some((k) => k.startsWith('.operator/memory/')));
  for (const [target, hash] of Object.entries(installed.files)) {
    if (target.includes('#')) continue;
    assert.equal(sha256File(path.join(proj, ...target.split('/'))), hash, `${target} hash mismatch`);
  }
});

test('init on an existing AGENTS.md injects the block at the top and preserves user content', async (t) => {
  const { pkg, proj } = makeFixture(t);
  fs.writeFileSync(path.join(proj, 'AGENTS.md'), '# My project\n\nMy own rules stay.\n');
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  const agents = read(proj, 'AGENTS.md');
  assert.ok(agents.includes('# My project'));
  assert.ok(agents.includes('My own rules stay.'));
  assert.ok(agents.indexOf('<!-- operator:begin') < agents.indexOf('# My project'), 'block must be at the top');
  assert.equal(agents.match(/operator:begin/g).length, 1, 'block must never be duplicated');
});

test('a second init is refused and points to update', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  await assert.rejects(init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop }), /update/);
});

test('init --force reinstalls managed files but keeps config, memory, and work', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  const configPath = path.join(proj, '.operator', 'config.json');
  const config = JSON.parse(read(configPath));
  config.testCommand = 'npm test';
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  fs.writeFileSync(path.join(proj, '.operator', 'memory', 'project.md'), 'my surveyed memory\n');
  fs.mkdirSync(path.join(proj, '.operator', 'work', '001-a'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.operator', 'work', '001-a', 'workitem.md'), 'item\n');
  fs.rmSync(path.join(proj, '.operator', 'constitution.md'));

  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', force: true, log: noop });
  assert.equal(JSON.parse(read(configPath)).testCommand, 'npm test', 'config.json must be preserved');
  assert.equal(read(proj, '.operator', 'memory', 'project.md'), 'my surveyed memory\n');
  assert.equal(read(proj, '.operator', 'work', '001-a', 'workitem.md'), 'item\n');
  assert.ok(fs.existsSync(path.join(proj, '.operator', 'constitution.md')), 'managed files are restored');
});

test('init seeds the out-of-scope memory and --force keeps existing rejection files', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });

  // A fresh install carries the format contract, including the poison-pill rule.
  const readme = read(proj, '.operator', 'memory', 'out-of-scope', 'README.md');
  assert.match(readme, /one file per \*\*rejected concept\*\*/i);
  assert.match(readme, /already implemented/i);

  // Rejection files are user-owned like the rest of memory/: --force keeps them.
  const rejection = path.join(proj, '.operator', 'memory', 'out-of-scope', 'dark-mode.md');
  fs.writeFileSync(rejection, 'MY REJECTION\n');
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', force: true, log: noop });
  assert.equal(read(rejection), 'MY REJECTION\n', 'rejection files must be preserved');
});

test('--test-cmd presets the test command in config.json', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', testCmd: 'npm test', log: noop });
  assert.equal(JSON.parse(read(proj, '.operator', 'config.json')).testCommand, 'npm test');
});

test('--tools none applies no adapter', async (t) => {
  const { pkg, proj } = makeFixture(t);
  const report = await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  assert.deepEqual(report.tools, []);
  assert.ok(!fs.existsSync(path.join(proj, 'CLAUDE.md')));
  assert.ok(!fs.existsSync(path.join(proj, '.claude')));
});

test('an unknown --tools value is a usage error', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await assert.rejects(init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'vscode', log: noop }), /unknown tool/);
});

test('with nothing detected, the claude adapter is applied anyway', async (t) => {
  const { pkg, proj } = makeFixture(t);
  const report = await init({ cwd: proj, packageRoot: pkg, yes: true, log: noop });
  assert.deepEqual(report.tools, ['claude']);
  assert.equal(read(proj, 'CLAUDE.md'), '@AGENTS.md\n');
  assert.ok(
    fs
      .readFileSync(path.join(proj, '.claude', 'skills', 'op-new', 'SKILL.md'))
      .equals(fs.readFileSync(path.join(proj, '.agents', 'skills', 'op-new', 'SKILL.md'))),
    '.claude/skills must mirror .agents/skills'
  );
});

test('an existing CLAUDE.md gains the import without losing content', async (t) => {
  const { pkg, proj } = makeFixture(t);
  fs.writeFileSync(path.join(proj, 'CLAUDE.md'), '# my claude notes\n');
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'claude', log: noop });
  const content = read(proj, 'CLAUDE.md');
  assert.ok(content.split(/\r?\n/).some((l) => l.trim() === '@AGENTS.md'));
  assert.ok(content.includes('# my claude notes'));
});

test('the gemini adapter adds AGENTS.md to contextFileName and preserves other settings', async (t) => {
  const { pkg, proj } = makeFixture(t);
  fs.mkdirSync(path.join(proj, '.gemini'), { recursive: true });
  fs.writeFileSync(
    path.join(proj, '.gemini', 'settings.json'),
    JSON.stringify({ theme: 'dark', contextFileName: 'GEMINI.md' }, null, 2)
  );
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'gemini', log: noop });
  const settings = JSON.parse(read(proj, '.gemini', 'settings.json'));
  assert.equal(settings.theme, 'dark');
  assert.deepEqual(settings.contextFileName, ['GEMINI.md', 'AGENTS.md']);
});

test('init warns (does not fail) outside a git repository', async (t) => {
  const { pkg, base } = makeFixture(t);
  const bare = path.join(base, 'bare');
  fs.mkdirSync(bare);
  const report = await init({ cwd: bare, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  assert.ok(report.warnings.some((w) => /git/.test(w)));
});

test('remove keeps work/, memory/, and projects/ by default and strips only our block', async (t) => {
  const { pkg, proj } = makeFixture(t);
  fs.writeFileSync(path.join(proj, 'AGENTS.md'), '# Mine\n\nkeep me\n');
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'claude', log: noop });
  fs.mkdirSync(path.join(proj, '.operator', 'work', '001-a'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.operator', 'work', '001-a', 'workitem.md'), 'item\n');
  fs.mkdirSync(path.join(proj, '.operator', 'projects', '001-app'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.operator', 'projects', '001-app', 'roadmap.md'), 'roadmap\n');

  const report = await remove({ cwd: proj, log: noop });

  assert.ok(fs.existsSync(path.join(proj, '.operator', 'work', '001-a', 'workitem.md')), 'work/ is kept');
  assert.ok(fs.existsSync(path.join(proj, '.operator', 'memory', 'project.md')), 'memory/ is kept');
  assert.ok(fs.existsSync(path.join(proj, '.operator', 'projects', '001-app', 'roadmap.md')), 'projects/ is kept');
  assert.ok(!fs.existsSync(path.join(proj, '.operator', 'constitution.md')));
  assert.ok(!fs.existsSync(path.join(proj, '.operator', 'gates.json')));
  assert.ok(!fs.existsSync(path.join(proj, '.agents', 'skills', 'op-new')));
  assert.ok(!fs.existsSync(path.join(proj, '.claude', 'skills', 'op-new')));
  assert.ok(!fs.existsSync(path.join(proj, 'CLAUDE.md')), 'our generated CLAUDE.md is removed');
  const agents = read(proj, 'AGENTS.md');
  assert.ok(!/operator:begin/.test(agents), 'managed block removed');
  assert.ok(agents.includes('keep me'), 'user AGENTS.md content kept');
  assert.ok(
    report.kept.some((k) => /work/.test(k)) &&
      report.kept.some((k) => /memory/.test(k)) &&
      report.kept.some((k) => /projects/.test(k))
  );
});

test('remove --purge deletes .operator entirely; user CLAUDE.md survives', async (t) => {
  const { pkg, proj } = makeFixture(t);
  fs.writeFileSync(path.join(proj, 'CLAUDE.md'), '# my notes\n');
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'claude', log: noop });
  fs.mkdirSync(path.join(proj, '.operator', 'projects', '001-app'), { recursive: true });
  await remove({ cwd: proj, purge: true, log: noop });
  assert.ok(!fs.existsSync(path.join(proj, '.operator')), 'projects/ and all else gone under --purge');
  assert.ok(fs.existsSync(path.join(proj, 'CLAUDE.md')), 'a CLAUDE.md with user content is never deleted');
});

test('remove reverses only the gemini settings entry we added', async (t) => {
  const { pkg, proj } = makeFixture(t);
  fs.mkdirSync(path.join(proj, '.gemini'), { recursive: true });
  fs.writeFileSync(
    path.join(proj, '.gemini', 'settings.json'),
    JSON.stringify({ theme: 'dark', contextFileName: 'GEMINI.md' }, null, 2)
  );
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'gemini', log: noop });
  await remove({ cwd: proj, log: noop });
  const settings = JSON.parse(read(proj, '.gemini', 'settings.json'));
  assert.equal(settings.theme, 'dark');
  assert.deepEqual(settings.contextFileName, ['GEMINI.md']);
});
