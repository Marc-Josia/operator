// Tests for `operator update` — the three-way per-file sync from the RUNNING
// package's payload (no network). Each test builds an isolated fixture: a copy
// of the real payload as the "package" plus a project that init has already
// populated. To simulate a newer (or older) release we mutate the package copy
// and bump its VERSION, then run update against it. node:test, zero deps.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { init } from '../lib/init.mjs';
import { update } from '../lib/update.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const noop = () => {};

/** Copy of the real payload as an isolated package fixture + a project with a
 *  git marker (so init does not warn). The gate checker payload exists now, so
 *  no stub is created. */
function makeFixture(t, { version = '0.1.0' } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-update-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const pkg = path.join(base, 'pkg');
  const payload = path.join(pkg, 'src', 'payload');
  fs.cpSync(path.join(REPO_ROOT, 'src', 'payload'), payload, { recursive: true });
  fs.writeFileSync(path.join(payload, 'operator', 'VERSION'), version + '\n');
  const proj = path.join(base, 'proj');
  fs.mkdirSync(path.join(proj, '.git'), { recursive: true });
  return { base, pkg, payload, proj };
}

function read(...segments) {
  return fs.readFileSync(path.join(...segments), 'utf8');
}

/** Simulate a newer release: bump the package VERSION and append a marker line
 *  to a payload file so its hash differs from what was installed. */
function bumpPayload(payload, version, { file, append } = {}) {
  fs.writeFileSync(path.join(payload, 'operator', 'VERSION'), version + '\n');
  if (file) {
    const p = path.join(payload, ...file.split('/'));
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + append);
  }
}

test('update requires an existing install and points to init', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await assert.rejects(update({ cwd: proj, packageRoot: pkg, log: noop }), /init/);
});

test('an unmodified managed file is overwritten with the new version', async (t) => {
  const { pkg, payload, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  bumpPayload(payload, '0.2.0', { file: 'operator/constitution.md', append: '\nNEW PAYLOAD LINE\n' });

  const report = await update({ cwd: proj, packageRoot: pkg, log: noop });

  assert.equal(report.toVersion, '0.2.0');
  assert.ok(report.updated.includes('.operator/constitution.md'), 'constitution should be updated');
  assert.match(read(proj, '.operator', 'constitution.md'), /NEW PAYLOAD LINE/);
  // VERSION is a managed file too — it advances, and so does the inventory.
  assert.equal(read(proj, '.operator', 'VERSION').trim(), '0.2.0');
  assert.equal(JSON.parse(read(proj, '.operator', '.installed.json')).version, '0.2.0');
});

test('a user-modified managed file is kept and the new version is written alongside it', async (t) => {
  const { pkg, payload, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  fs.writeFileSync(path.join(proj, '.operator', 'constitution.md'), 'USER EDITED\n');
  bumpPayload(payload, '0.2.0', { file: 'operator/constitution.md', append: '\nNEW PAYLOAD LINE\n' });

  const report = await update({ cwd: proj, packageRoot: pkg, log: noop });

  assert.ok(report.kept.includes('.operator/constitution.md'), 'user-modified file must be kept');
  assert.equal(read(proj, '.operator', 'constitution.md'), 'USER EDITED\n', 'user content untouched');
  const sidecar = read(proj, '.operator', 'constitution.md.operator-new');
  assert.match(sidecar, /NEW PAYLOAD LINE/, 'the new version is offered as .operator-new');
});

test('a missing managed file is restored', async (t) => {
  const { pkg, payload, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  fs.rmSync(path.join(proj, '.operator', 'templates', 'adr.md'));

  const report = await update({ cwd: proj, packageRoot: pkg, log: noop });

  assert.ok(report.restored.includes('.operator/templates/adr.md'), 'missing file must be restored');
  assert.ok(
    fs
      .readFileSync(path.join(proj, '.operator', 'templates', 'adr.md'))
      .equals(fs.readFileSync(path.join(payload, 'operator', 'templates', 'adr.md'))),
    'restored file is byte-identical to the payload'
  );
});

test('update never touches work/, memory/, or config.json', async (t) => {
  const { pkg, payload, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  const configPath = path.join(proj, '.operator', 'config.json');
  const config = JSON.parse(read(configPath));
  config.testCommand = 'npm test';
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  fs.writeFileSync(path.join(proj, '.operator', 'memory', 'project.md'), 'MY SURVEYED MEMORY\n');
  fs.mkdirSync(path.join(proj, '.operator', 'work', '001-a'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.operator', 'work', '001-a', 'workitem.md'), 'MY WORK ITEM\n');
  bumpPayload(payload, '0.2.0', { file: 'operator/constitution.md', append: '\nNEW LINE\n' });

  await update({ cwd: proj, packageRoot: pkg, log: noop });

  assert.equal(JSON.parse(read(configPath)).testCommand, 'npm test', 'config.json preserved');
  assert.equal(read(proj, '.operator', 'memory', 'project.md'), 'MY SURVEYED MEMORY\n', 'memory preserved');
  assert.equal(read(proj, '.operator', 'work', '001-a', 'workitem.md'), 'MY WORK ITEM\n', 'work preserved');
  assert.ok(
    !fs.existsSync(path.join(proj, '.operator', 'config.json.operator-new')),
    'config.json is never even offered a .operator-new'
  );
});

test('update replaces only the marked AGENTS.md block and preserves user content', async (t) => {
  const { pkg, payload, proj } = makeFixture(t);
  fs.writeFileSync(path.join(proj, 'AGENTS.md'), '# Mine\n\nkeep me\n');
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  bumpPayload(payload, '0.2.0');
  fs.writeFileSync(
    path.join(payload, 'agents-block.md'),
    read(payload, 'agents-block.md') + '\nUPDATED-BLOCK-LINE\n'
  );

  const report = await update({ cwd: proj, packageRoot: pkg, log: noop });

  const agents = read(proj, 'AGENTS.md');
  assert.match(agents, /<!-- operator:begin v0\.2\.0 -->/, 'block version marker bumped');
  assert.match(agents, /UPDATED-BLOCK-LINE/, 'new block body applied');
  assert.ok(agents.includes('keep me'), 'user content preserved');
  assert.equal(agents.match(/operator:begin/g).length, 1, 'block is never duplicated');
  assert.match(report.agentsAction, /replaced/);
});

test('stale version (running < installed) is refused by default with the npx cache fix', async (t) => {
  const { pkg, payload, proj } = makeFixture(t, { version: '0.2.0' });
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  bumpPayload(payload, '0.1.0'); // pretend the npx cache is serving an old build

  await assert.rejects(
    update({ cwd: proj, packageRoot: pkg, log: noop }),
    (err) => err.message.includes('rm -rf "$(npm config get cache)/_npx"')
  );
});

test('stale version proceeds under --force but still prints the npx cache fix', async (t) => {
  const { pkg, payload, proj } = makeFixture(t, { version: '0.2.0' });
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  bumpPayload(payload, '0.1.0');
  const logs = [];

  const report = await update({ cwd: proj, packageRoot: pkg, force: true, log: (...a) => logs.push(a.join(' ')) });

  assert.equal(report.toVersion, '0.1.0');
  assert.ok(
    logs.some((l) => l.includes('rm -rf "$(npm config get cache)/_npx"')),
    'the npx cache fix is still surfaced under --force'
  );
});

test('update re-renders adapters idempotently, keeping the .claude mirror in sync', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'claude', log: noop });

  const report = await update({ cwd: proj, packageRoot: pkg, log: noop });

  assert.ok(report.adapters.some((a) => a.name === 'claude'), 'claude adapter re-rendered');
  assert.ok(
    fs
      .readFileSync(path.join(proj, '.claude', 'skills', 'op-new', 'SKILL.md'))
      .equals(fs.readFileSync(path.join(proj, '.agents', 'skills', 'op-new', 'SKILL.md'))),
    '.claude/skills mirror stays consistent with .agents/skills'
  );
});

test('a no-op update (same payload) reports up to date and changes nothing material', async (t) => {
  const { pkg, proj } = makeFixture(t);
  await init({ cwd: proj, packageRoot: pkg, yes: true, tools: 'none', log: noop });
  const before = read(proj, '.operator', 'constitution.md');

  const report = await update({ cwd: proj, packageRoot: pkg, log: noop });

  assert.equal(report.updated.length, 0);
  assert.equal(report.kept.length, 0);
  assert.equal(report.restored.length, 0);
  assert.equal(read(proj, '.operator', 'constitution.md'), before);
});
