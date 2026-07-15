// Tests for `operator doctor` — the install health check. Each test builds an
// isolated fixture (a copy of the real payload as the package + a project that
// init has populated), then damages one thing and asserts doctor names the
// right drift class, that --fix repairs the mechanical ones, and that --strict
// escalates warnings. node:test, zero deps.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { init } from '../lib/init.mjs';
import { doctor } from '../lib/doctor.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const noop = () => {};

function makeFixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-doctor-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const pkg = path.join(base, 'pkg');
  const payload = path.join(pkg, 'src', 'payload');
  fs.cpSync(path.join(REPO_ROOT, 'src', 'payload'), payload, { recursive: true });
  const proj = path.join(base, 'proj');
  fs.mkdirSync(path.join(proj, '.git'), { recursive: true });
  return { base, pkg, payload, proj };
}

/** A clean install with the claude adapter and a preset test command, so a
 *  healthy doctor run reports zero warnings and zero errors. */
async function install(fixture, opts = {}) {
  await init({
    cwd: fixture.proj,
    packageRoot: fixture.pkg,
    yes: true,
    tools: 'claude',
    testCmd: 'exit 0',
    log: noop,
    ...opts,
  });
}

function run(fixture, opts = {}) {
  return doctor({ cwd: fixture.proj, packageRoot: fixture.pkg, log: noop, ...opts });
}

function find(result, id) {
  return result.checks.find((c) => c.id === id);
}
function has(result, id, level) {
  return result.checks.some((c) => c.id === id && c.level === level);
}

function read(fixture, ...segments) {
  return fs.readFileSync(path.join(fixture.proj, ...segments), 'utf8');
}
function write(fixture, rel, content) {
  const p = path.join(fixture.proj, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

// --- work-item builder (minimal — doctor only parses frontmatter + journal) ---

function writeItem(fixture, id, { lane = 'quick', stage = 'intake', journal = [] } = {}) {
  const fm = ['---', `id: ${id}`, `lane: ${lane}`, `stage: ${stage}`, 'base: abc123', '---'].join('\n');
  const body = `\n# ${id}\n\n## Journal\n\n${journal.join('\n')}\n`;
  write(fixture, `.operator/work/${id}/workitem.md`, fm + body);
}

// =============================================================================
// clean install
// =============================================================================

test('a clean install reports no errors and no warnings', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  const result = await run(fx);
  assert.equal(result.errors, 0, JSON.stringify(result.checks.filter((c) => c.level === 'error')));
  assert.equal(result.warnings, 0, JSON.stringify(result.checks.filter((c) => c.level === 'warn')));
  assert.equal(result.ok, true);
  assert.ok(has(result, 'agents-markers', 'ok'));
});

test('doctor refuses to run without an install', async (t) => {
  const fx = makeFixture(t);
  await assert.rejects(run(fx), /init/);
});

// =============================================================================
// AGENTS.md markers + size
// =============================================================================

test('a missing marker block is an error that --fix re-inserts', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  write(fx, 'AGENTS.md', '# just my content, no operator block\n');

  const before = await run(fx);
  assert.ok(has(before, 'agents-markers', 'error'));
  assert.equal(before.ok, false);

  await run(fx, { fix: true });
  assert.match(read(fx, 'AGENTS.md'), /<!-- operator:begin/, 'block re-inserted');
  assert.ok(read(fx, 'AGENTS.md').includes('# just my content'), 'user content preserved by the fix');
  const after = await run(fx);
  assert.ok(has(after, 'agents-markers', 'ok'));
});

test('an AGENTS.md over 32KiB is a size error', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  fs.appendFileSync(path.join(fx.proj, 'AGENTS.md'), '\n' + 'x'.repeat(33 * 1024) + '\n');
  const result = await run(fx);
  assert.ok(has(result, 'agents-size', 'error'));
  assert.equal(result.ok, false);
});

test('an AGENTS.md between 24 and 32KiB is a size warning', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  fs.appendFileSync(path.join(fx.proj, 'AGENTS.md'), '\n' + 'x'.repeat(26 * 1024) + '\n');
  const result = await run(fx);
  assert.ok(has(result, 'agents-size', 'warn'));
});

// =============================================================================
// claude adapter wiring (CLAUDE.md import + .claude/skills mirror)
// =============================================================================

test('a CLAUDE.md that lost its import is an error --fix restores', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  write(fx, 'CLAUDE.md', '# my notes without the import\n');

  const before = await run(fx);
  assert.ok(has(before, 'claude-import', 'error'));

  await run(fx, { fix: true });
  assert.ok(
    read(fx, 'CLAUDE.md').split(/\r?\n/).some((l) => l.trim() === '@AGENTS.md'),
    'the @AGENTS.md import is restored'
  );
  assert.ok(read(fx, 'CLAUDE.md').includes('# my notes'), 'user content kept');
});

test('a drifted .claude/skills mirror is a warning that --fix re-mirrors', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  write(fx, '.claude/skills/op-new/SKILL.md', 'tampered mirror\n');

  const before = await run(fx);
  assert.ok(has(before, 'claude-mirror', 'warn'));

  await run(fx, { fix: true });
  assert.ok(
    fs
      .readFileSync(path.join(fx.proj, '.claude', 'skills', 'op-new', 'SKILL.md'))
      .equals(fs.readFileSync(path.join(fx.proj, '.agents', 'skills', 'op-new', 'SKILL.md'))),
    'the mirror is re-synced from .agents/skills'
  );
});

// =============================================================================
// managed-file drift vs .installed.json
// =============================================================================

test('a modified managed file is flagged as drift', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  fs.appendFileSync(path.join(fx.proj, '.operator', 'constitution.md'), '\nhand edit\n');
  const result = await run(fx);
  assert.ok(has(result, 'managed-drift', 'warn'));
});

test('a hand-edited AGENTS.md block is flagged as drift', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  const agents = read(fx, 'AGENTS.md').replace('## Iron rules', '## Iron rules\n\nhand edit');
  write(fx, 'AGENTS.md', agents);
  const result = await run(fx);
  assert.ok(has(result, 'managed-drift', 'warn'));
});

test('a deleted managed file is a hard error', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  fs.rmSync(path.join(fx.proj, '.operator', 'templates', 'adr.md'));
  const result = await run(fx);
  assert.ok(has(result, 'managed-missing', 'error'));
  assert.equal(result.ok, false);
});

// =============================================================================
// memory caps
// =============================================================================

test('a memory file over its cap is a warning', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  write(fx, '.operator/memory/lessons.md', Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n') + '\n');
  const result = await run(fx);
  assert.ok(has(result, 'memory-caps', 'warn'));
});

// =============================================================================
// config sanity
// =============================================================================

test('an unset testCommand and empty protectedPaths are warnings', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  const cfg = JSON.parse(read(fx, '.operator', 'config.json'));
  cfg.testCommand = null;
  cfg.protectedPaths = [];
  write(fx, '.operator/config.json', JSON.stringify(cfg, null, 2) + '\n');
  const result = await run(fx);
  assert.ok(has(result, 'config-test-command', 'warn'));
  assert.ok(has(result, 'config-protected-paths', 'warn'));
});

// =============================================================================
// work-item state consistency
// =============================================================================

test('malformed work-item frontmatter is an error', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  write(fx, '.operator/work/001-bad/workitem.md', '---\nid: 001-bad\nno colon here\n---\n\n# x\n');
  const result = await run(fx);
  assert.ok(has(result, 'workitem-frontmatter', 'error'));
});

test('an unknown lane is an error', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  writeItem(fx, '001-x', { lane: 'turbo', stage: 'intake' });
  const result = await run(fx);
  assert.ok(has(result, 'workitem-lane', 'error'));
});

test('a stage invalid for the lane is an error', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  writeItem(fx, '001-x', { lane: 'quick', stage: 'spec' }); // quick lane has no spec stage
  const result = await run(fx);
  assert.ok(has(result, 'workitem-stage', 'error'));
});

test('a stage that disagrees with the journal is a warning', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  // Journal proves only the intake gate passed (-> build), but the stage claims ship.
  writeItem(fx, '001-x', {
    lane: 'quick',
    stage: 'ship',
    journal: ['- 2026-07-15 CREATED lane=quick', '- 2026-07-15 GATE intake PASSED — evidence: ok'],
  });
  const result = await run(fx);
  assert.ok(has(result, 'workitem-journal', 'warn'));
});

test('a consistent work item raises no work-item finding', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  writeItem(fx, '001-x', {
    lane: 'quick',
    stage: 'build',
    journal: ['- 2026-07-15 CREATED lane=quick', '- 2026-07-15 GATE intake PASSED — evidence: ok'],
  });
  const result = await run(fx);
  assert.ok(has(result, 'work-items', 'ok'));
  assert.ok(!result.checks.some((c) => c.id.startsWith('workitem') && c.level !== 'ok'));
});

// =============================================================================
// expertise-pack invariant + --strict
// =============================================================================

test('an expertise pack that instructs a state change is flagged', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  write(fx, '.agents/skills/operator-rogue/SKILL.md', '---\nname: operator-rogue\n---\n\nAlways append to the journal.\n');
  const result = await run(fx);
  assert.ok(has(result, 'expertise-invariant', 'warn'));
});

test('--strict turns a warning into a non-ok result', async (t) => {
  const fx = makeFixture(t);
  await install(fx);
  fs.appendFileSync(path.join(fx.proj, '.operator', 'constitution.md'), '\nhand edit\n');

  const lenient = await run(fx);
  assert.equal(lenient.errors, 0);
  assert.ok(lenient.warnings > 0);
  assert.equal(lenient.ok, true, 'warnings alone do not fail a lenient run');

  const strict = await run(fx, { strict: true });
  assert.equal(strict.ok, false, 'the same warning fails under --strict');
});
