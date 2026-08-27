import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, managedSkillNames, payloadDir } from '../lib/catalog.mjs';
import { init } from '../lib/init.mjs';
import { update } from '../lib/update.mjs';
import { remove } from '../lib/remove.mjs';
import { status } from '../lib/status.mjs';
import { START_MARKER } from '../lib/agents-md.mjs';
import { packageRoot, tmpDir, writeSkill } from './helpers.mjs';

function mockFetch() {
  return async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '# checklist\n',
  });
}

test('init installs via skills CLI, writes references/, and upserts AGENTS.md', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const catalog = loadCatalog(root);
  /** @type {string[][]} */
  const calls = [];
  const runner = async (args) => {
    calls.push(args);
  };

  await init({
    cwd,
    packageRoot: root,
    agents: ['cursor'],
    copy: true,
    runner,
    fetchFn: mockFetch(),
  });

  assert.equal(calls.length, catalog.sources.length + 1);
  assert.equal(calls[0][3], 'mattpocock/skills');
  assert.ok(calls[0].includes('--skill'));
  assert.ok(calls[0].includes('grill-with-docs'));
  assert.equal(calls[1][3], 'addyosmani/agent-skills');
  assert.ok(calls[1].includes('security-and-hardening'));
  assert.equal(calls[2][3], payloadDir(root));
  assert.ok(calls[2].includes('operator'));
  for (const args of calls) {
    assert.ok(args.includes('-y'));
    assert.deepEqual(args.slice(args.indexOf('--agent'), args.indexOf('--agent') + 2), ['--agent', 'cursor']);
  }

  const agentsMd = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(agentsMd.includes(START_MARKER));
  assert.ok(agentsMd.includes('only skill router'));
  assert.ok(agentsMd.includes('YAGNI'));
  assert.ok(agentsMd.includes('docs/architecture.md'));
  assert.ok(agentsMd.includes('docs/changes/<change-id>/'));
  assert.ok(fs.existsSync(path.join(cwd, 'references', 'security-checklist.md')));
  assert.ok(fs.existsSync(path.join(cwd, 'references', '.operator-managed.json')));
});

test('status reports missing skills and an ok install when the catalog is present', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const catalog = loadCatalog(root);
  await init({
    cwd,
    packageRoot: root,
    agents: ['cursor'],
    copy: true,
    runner: async () => {},
    fetchFn: mockFetch(),
  });

  const incomplete = status({ cwd, packageRoot: root });
  assert.equal(incomplete.ok, false);
  assert.ok(incomplete.skills.missing.length > 0);

  for (const name of managedSkillNames(catalog)) {
    writeSkill(cwd, path.join('.agents', 'skills'), name);
  }
  const complete = status({ cwd, packageRoot: root });
  assert.equal(complete.ok, true);
  assert.equal(complete.skills.missing.length, 0);
  assert.equal(complete.refs.managed, true);
  assert.equal(complete.agentsMd.managed, true);
});

test('update re-adds the operator skill and refreshes AGENTS.md', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({
    cwd,
    packageRoot: root,
    copy: true,
    runner: async () => {},
    fetchFn: mockFetch(),
  });
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Keep me\n', 'utf8');
  /** @type {string[][]} */
  const calls = [];
  await update({
    cwd,
    packageRoot: root,
    copy: true,
    runner: async (args) => {
      calls.push(args);
    },
    fetchFn: mockFetch(),
  });
  assert.ok(calls[0].includes('update'));
  assert.ok(calls[1].includes('add'));
  const text = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(text.includes('# Keep me'));
  assert.ok(text.includes(START_MARKER));
});

test('remove strips the AGENTS.md block and optionally purges references', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({
    cwd,
    packageRoot: root,
    copy: true,
    runner: async () => {},
    fetchFn: mockFetch(),
  });
  /** @type {string[][]} */
  const calls = [];
  await remove({
    cwd,
    packageRoot: root,
    copy: true,
    purge: true,
    runner: async (args) => {
      calls.push(args);
    },
  });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('remove'));
  assert.ok(calls[0].includes('operator'));
  assert.equal(fs.existsSync(path.join(cwd, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(cwd, 'references', 'security-checklist.md')), false);
});
