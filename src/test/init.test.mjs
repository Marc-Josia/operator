import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  agentsBlockPath,
  allCatalogSkills,
  legacyOnlySkillNames,
  loadCatalog,
  managedSkillNames,
  ownSkillNames,
  payloadDir,
} from '../lib/catalog.mjs';
import { init, NEXT_STEPS } from '../lib/init.mjs';
import { update, NO_TRACKER_HINT } from '../lib/update.mjs';
import { remove } from '../lib/remove.mjs';
import { status } from '../lib/status.mjs';
import { END_MARKER, START_MARKER } from '../lib/agents-md.mjs';
import { statePath } from '../lib/state.mjs';
import { markerPath } from '../lib/references.mjs';
import { packageRoot, tmpDir, writeSkill, writeV2References, V2_REF_FILES } from './helpers.mjs';

const PSTACK_REPO = 'https://github.com/cursor/plugins/tree/main/pstack';
const SKILLS_DIR = path.join('.agents', 'skills');
const quiet = () => {};

/** `--skill` values of one skills CLI call. */
function skillArgs(args) {
  return args.filter((_, i) => args[i - 1] === '--skill');
}

/** `--agent` values of one skills CLI call. */
function agentArgs(args) {
  return args.filter((_, i) => args[i - 1] === '--agent');
}

/** A runner that records argv and mimics `skills add` / `skills remove` on `.agents/skills`. */
function fakeSkillsCli(cwd) {
  /** @type {string[][]} */
  const calls = [];
  const runner = async (args) => {
    calls.push(args);
    const command = args[2];
    if (command === 'add') {
      for (const name of skillArgs(args)) writeSkill(cwd, SKILLS_DIR, name);
    }
    if (command === 'remove') {
      const end = args.indexOf('--agent');
      for (const name of args.slice(3, end)) {
        fs.rmSync(path.join(cwd, SKILLS_DIR, name), { recursive: true, force: true });
      }
    }
  };
  return { calls, runner };
}

function installedNames(cwd) {
  const dir = path.join(cwd, SKILLS_DIR);
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

function readState(cwd) {
  return JSON.parse(fs.readFileSync(statePath(cwd), 'utf8'));
}

function readAgentsMd(cwd) {
  return fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

/** AGENTS.md without the managed block: the block's own text may mention the same headings. */
function outsideBlock(text) {
  const start = text.indexOf(START_MARKER);
  const end = text.indexOf(END_MARKER);
  return start === -1 ? text : text.slice(0, start) + text.slice(end + END_MARKER.length);
}

test('init installs pstack, then own skills from the payload, in one call each', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const catalog = loadCatalog(root);
  const { calls, runner } = fakeSkillsCli(cwd);

  await init({ cwd, packageRoot: root, agents: ['cursor'], copy: true, yes: true, runner, log: quiet });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(0, 4), ['--yes', 'skills@latest', 'add', PSTACK_REPO]);
  assert.deepEqual(skillArgs(calls[0]), allCatalogSkills(catalog));
  assert.deepEqual(calls[1].slice(0, 4), ['--yes', 'skills@latest', 'add', payloadDir(root)]);
  assert.deepEqual(skillArgs(calls[1]), ownSkillNames(catalog));
  assert.ok(!skillArgs(calls[1]).includes('operator'));
  assert.ok(!calls[1].some((arg) => arg.includes('SKILL-TEMPLATE')));
  for (const args of calls) {
    assert.ok(args.includes('-y'));
    assert.ok(args.includes('--copy'));
    assert.deepEqual(agentArgs(args), ['cursor']);
  }
  assert.equal(fs.existsSync(path.join(cwd, 'references')), false, 'v3 installs no references/');
});

test('init writes the AGENTS.md block, project sections, the tracker line, and the state file', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });

  const text = readAgentsMd(cwd);
  const block = fs.readFileSync(agentsBlockPath(root), 'utf8').trimEnd();
  assert.ok(text.startsWith(`${START_MARKER}\n${block}\n${END_MARKER}\n`));
  const project = text.slice(text.indexOf(END_MARKER));
  assert.ok(project.includes('\n## Project context\n\nSpecs and tickets live in: local markdown (`docs/changes/<id>/`)\n\n## Commands\n'));
  assert.ok(project.includes('\n## Known pitfalls\n'));
  assert.deepEqual(readState(cwd), { version: 3, agents: ['cursor'], tracker: 'local' });
  assert.equal(fs.existsSync(path.join(cwd, 'CLAUDE.md')), false, 'no CLAUDE.md without claude-code');
});

test('init next steps say to describe the idea in plain words, nothing to invoke', async () => {
  const cwd = tmpDir();
  /** @type {string[]} */
  const logs = [];
  await init({
    cwd,
    packageRoot: packageRoot(),
    agents: ['cursor'],
    yes: true,
    runner: async () => {},
    log: (message) => logs.push(message),
  });
  assert.deepEqual(logs, [NEXT_STEPS]);
  assert.ok(NEXT_STEPS.includes('plain words'));
  assert.ok(NEXT_STEPS.includes('nothing to invoke'));
  assert.ok(!NEXT_STEPS.includes('/operator'));
  assert.ok(!NEXT_STEPS.includes('setup-matt-pocock-skills'));
});

test('init asks for the tracker; init again or --tracker replaces the line, never duplicates it', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  /** @type {string[]} */
  const asked = [];
  await init({
    cwd,
    packageRoot: root,
    agents: ['cursor'],
    runner: async () => {},
    trackerPromptFn: async (current) => {
      asked.push(current);
      return 'github';
    },
    log: quiet,
  });
  assert.deepEqual(asked, ['local']);
  assert.ok(readAgentsMd(cwd).includes('\nSpecs and tickets live in: GitHub issues\n'));
  assert.equal(readState(cwd).tracker, 'github');

  await init({
    cwd,
    packageRoot: root,
    agents: ['cursor'],
    runner: async () => {},
    trackerPromptFn: async (current) => {
      asked.push(current);
      return 'linear';
    },
    log: quiet,
  });
  assert.deepEqual(asked, ['local', 'github'], 'the prompt starts from the saved choice');
  assert.equal(readState(cwd).tracker, 'linear');

  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, tracker: 'Jira project WEB', runner: async () => {}, log: quiet });
  let text = readAgentsMd(cwd);
  assert.equal(count(outsideBlock(text), 'Specs and tickets live in:'), 1);
  assert.ok(text.includes('\nSpecs and tickets live in: Jira project WEB\n'));
  assert.equal(count(outsideBlock(text), '## Project context'), 1);
  assert.equal(readState(cwd).tracker, 'Jira project WEB');

  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });
  text = readAgentsMd(cwd);
  assert.equal(readState(cwd).tracker, 'Jira project WEB', '-y keeps the saved choice');
  assert.equal(count(outsideBlock(text), 'Specs and tickets live in:'), 1);
});

test('the tracker line reuses an existing Project context heading outside the block, keeping user text', async () => {
  const cwd = tmpDir();
  fs.writeFileSync(
    path.join(cwd, 'AGENTS.md'),
    '# My app\n\n## Project context\nA shop for bikes.\n\n## Commands\n\nnpm test\n',
    'utf8',
  );
  await init({ cwd, packageRoot: packageRoot(), agents: ['cursor'], yes: true, tracker: 'LINEAR', runner: async () => {}, log: quiet });
  const text = readAgentsMd(cwd);
  assert.ok(text.indexOf('# My app') < text.indexOf(START_MARKER));
  const project = outsideBlock(text);
  assert.ok(project.includes('## Project context\n\nSpecs and tickets live in: Linear\n\nA shop for bikes.\n'));
  assert.equal(count(project, '## Project context'), 1, 'the user heading before the block is reused, not duplicated');
  assert.equal(count(outsideBlock(text), 'Specs and tickets live in:'), 1);
});

test('init -y without --agent fails', async () => {
  await assert.rejects(
    () => init({ cwd: tmpDir(), packageRoot: packageRoot(), yes: true, runner: async () => {}, log: quiet }),
    (err) => err.code === 2,
  );
});

test('init for claude-code creates CLAUDE.md with the @AGENTS.md import and records it', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const { calls, runner } = fakeSkillsCli(cwd);
  await init({ cwd, packageRoot: root, runner, promptFn: async () => ['claude-code'], yes: true, log: quiet });
  for (const args of calls) assert.deepEqual(agentArgs(args), ['claude-code']);
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
  assert.deepEqual(readState(cwd).claudeMd, { importAdded: true, fileCreated: true });

  await update({ cwd, packageRoot: root, runner, log: quiet });
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n', 'never duplicated');
  assert.deepEqual(readState(cwd).claudeMd, { importAdded: true, fileCreated: true });
});

test('an existing CLAUDE.md gets the import appended once; remove deletes only that line', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Team notes\n\nBe kind.\n', 'utf8');
  await init({ cwd, packageRoot: root, agents: ['cursor', 'claude-code'], yes: true, runner: async () => {}, log: quiet });
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '# Team notes\n\nBe kind.\n\n@AGENTS.md\n');
  assert.deepEqual(readState(cwd).claudeMd, { importAdded: true, fileCreated: false });

  await init({ cwd, packageRoot: root, agents: ['cursor', 'claude-code'], yes: true, runner: async () => {}, log: quiet });
  assert.equal(count(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '@AGENTS.md'), 1);

  await remove({ cwd, packageRoot: root, runner: async () => {}, log: quiet });
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '# Team notes\n\nBe kind.\n');
});

test('a CLAUDE.md that already imports AGENTS.md is left alone, also by remove', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const original = '@AGENTS.md\n\n# Mine\n';
  fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), original, 'utf8');
  await init({ cwd, packageRoot: root, agents: ['claude-code'], yes: true, runner: async () => {}, log: quiet });
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), original);
  assert.equal(readState(cwd).claudeMd, undefined);
  await remove({ cwd, packageRoot: root, runner: async () => {}, log: quiet });
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), original);
});

test('remove uninstalls own + pstack without --copy and cleans every file Operator wrote', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const catalog = loadCatalog(root);
  await init({ cwd, packageRoot: root, agents: ['claude-code'], yes: true, runner: async () => {}, log: quiet });
  const { calls, runner } = fakeSkillsCli(cwd);
  await remove({ cwd, packageRoot: root, copy: true, runner, log: quiet });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 3), ['--yes', 'skills@latest', 'remove']);
  assert.deepEqual(calls[0].slice(3, calls[0].indexOf('--agent')), managedSkillNames(catalog));
  assert.deepEqual(agentArgs(calls[0]), ['claude-code'], 'agents come from the state file');
  assert.ok(!calls[0].includes('--copy'));
  assert.equal(fs.existsSync(path.join(cwd, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(cwd, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(statePath(cwd)), false);
  assert.equal(fs.existsSync(path.join(cwd, '.operator')), false);
});

test('remove keeps user text in AGENTS.md and drops only the tracker line', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });
  const text = readAgentsMd(cwd).replace('## Commands\n', '## Commands\n\nnpm test\n');
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), text, 'utf8');
  await remove({ cwd, packageRoot: root, runner: async () => {}, log: quiet });
  const after = readAgentsMd(cwd);
  assert.ok(!after.includes(START_MARKER));
  assert.ok(!after.includes('Specs and tickets live in:'));
  assert.ok(after.includes('## Project context\n\n## Commands\n\nnpm test\n'));
});

test('update on a v2 install leaves only own + pstack skills and purges managed references', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const catalog = loadCatalog(root);

  // v2 layout: Matt + Addy + the v2 operator router + one pstack skill, managed references/,
  // agents saved in the old manifest, an old block in AGENTS.md.
  const v2Skills = ['tdd', 'grill-with-docs', 'implement', 'retro', 'to-spec', 'security-and-hardening', 'code-review-and-quality', 'operator', 'unslop'];
  for (const name of v2Skills) writeSkill(cwd, SKILLS_DIR, name);
  writeSkill(cwd, SKILLS_DIR, 'my-project-skill');
  writeV2References(cwd, { agents: ['claude-code'] });
  fs.writeFileSync(path.join(cwd, 'references', 'keep-me.md'), 'mine', 'utf8');
  fs.writeFileSync(
    path.join(cwd, 'AGENTS.md'),
    `# Keep me\n\n${START_MARKER}\nOLD V2 BLOCK\n${END_MARKER}\n\n## Commands\n\nnpm test\n`,
    'utf8',
  );

  const { calls, runner } = fakeSkillsCli(cwd);
  /** @type {string[]} */
  const logs = [];
  await update({ cwd, packageRoot: root, copy: true, runner, log: (m) => logs.push(m) });

  // 1. `skills update` only for pstack names.
  assert.deepEqual(calls[0], ['--yes', 'skills@latest', 'update', ...allCatalogSkills(catalog), '-p', '-y']);
  // 2. Legacy-only skills removed (own-named ones are overwritten instead), never with --copy.
  const removal = calls.find((args) => args[2] === 'remove');
  assert.ok(removal);
  const removed = removal.slice(3, removal.indexOf('--agent'));
  assert.deepEqual(removed.sort(), ['code-review-and-quality', 'grill-with-docs', 'operator', 'security-and-hardening', 'tdd', 'to-spec']);
  for (const name of removed) assert.ok(legacyOnlySkillNames(catalog).includes(name));
  assert.ok(!removal.includes('--copy'));
  // 3. Missing pstack added, 4. all own skills re-added from the payload.
  const adds = calls.filter((args) => args[2] === 'add');
  assert.equal(adds.length, 2);
  assert.equal(adds[0][3], PSTACK_REPO);
  assert.deepEqual(skillArgs(adds[0]), allCatalogSkills(catalog).filter((name) => name !== 'unslop'));
  assert.equal(adds[1][3], payloadDir(root));
  assert.deepEqual(skillArgs(adds[1]), ownSkillNames(catalog));
  for (const args of calls) {
    if (args[2] !== 'update') assert.deepEqual(agentArgs(args), ['claude-code'], 'agents read from the v2 manifest');
  }

  assert.deepEqual(installedNames(cwd), [...managedSkillNames(catalog), 'my-project-skill'].sort());

  for (const file of V2_REF_FILES) assert.equal(fs.existsSync(path.join(cwd, 'references', file)), false);
  assert.equal(fs.existsSync(markerPath(cwd)), false);
  assert.equal(fs.readFileSync(path.join(cwd, 'references', 'keep-me.md'), 'utf8'), 'mine');

  assert.deepEqual(readState(cwd), {
    version: 3,
    agents: ['claude-code'],
    claudeMd: { importAdded: true, fileCreated: true },
  });
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');

  const text = readAgentsMd(cwd);
  assert.ok(text.startsWith('# Keep me\n'));
  assert.ok(!text.includes('OLD V2 BLOCK'));
  assert.ok(text.includes(fs.readFileSync(agentsBlockPath(root), 'utf8').trimEnd()));
  assert.ok(text.includes('## Commands\n\nnpm test\n'));
  assert.ok(!outsideBlock(text).includes('Specs and tickets live in:'), 'update does not invent a tracker');
  assert.ok(logs.includes(NO_TRACKER_HINT));
  assert.ok(logs[0].includes('Removed v2 skills'));
  assert.ok(logs[0].includes('Removed v2 managed references/.'));

  const after = status({ cwd, packageRoot: root, env: {}, homedir: tmpDir(), log: quiet });
  assert.equal(after.ok, true);
  assert.deepEqual(after.legacySkills, []);
});

test('update keeps the saved tracker; --tracker on update changes it', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, tracker: 'github', runner: async () => {}, log: quiet });
  await update({ cwd, packageRoot: root, runner: async () => {}, log: quiet });
  assert.equal(readState(cwd).tracker, 'github');
  assert.equal(count(outsideBlock(readAgentsMd(cwd)), 'Specs and tickets live in: GitHub issues'), 1);

  await update({ cwd, packageRoot: root, tracker: 'linear', runner: async () => {}, log: quiet });
  assert.equal(readState(cwd).tracker, 'linear');
  const text = readAgentsMd(cwd);
  assert.equal(count(outsideBlock(text), 'Specs and tickets live in:'), 1);
  assert.ok(text.includes('Specs and tickets live in: Linear'));
});

test('update adds pstack skills that are not installed yet', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const catalog = loadCatalog(root);
  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });
  for (const name of managedSkillNames(catalog)) {
    if (name === 'unslop' || name === 'correct') continue;
    writeSkill(cwd, SKILLS_DIR, name);
  }
  const { calls, runner } = fakeSkillsCli(cwd);
  await update({ cwd, packageRoot: root, copy: true, runner, log: quiet });
  assert.equal(calls.filter((args) => args[2] === 'remove').length, 0, 'nothing legacy to remove');
  const adds = calls.filter((args) => args[2] === 'add');
  assert.equal(adds.length, 2);
  assert.equal(adds[0][3], PSTACK_REPO);
  assert.deepEqual(skillArgs(adds[0]), ['unslop', 'correct']);
  assert.equal(adds[1][3], payloadDir(root));
});

test('remove on a v2 install reads agents from the old manifest and purges its references', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  writeV2References(cwd, { agents: ['codex'] });
  const { calls, runner } = fakeSkillsCli(cwd);
  await remove({ cwd, packageRoot: root, runner, log: quiet });
  assert.deepEqual(agentArgs(calls[0]), ['codex']);
  assert.equal(fs.existsSync(path.join(cwd, 'references')), false);
  assert.equal(fs.existsSync(statePath(cwd)), false);
});

test('status reports leftover v2 skills, the CLAUDE.md import, and the tracker; references do not count', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const catalog = loadCatalog(root);
  const homedir = tmpDir();
  await init({ cwd, packageRoot: root, agents: ['claude-code'], yes: true, tracker: 'github', runner: async () => {}, log: quiet });

  /** @type {string[]} */
  let out = [];
  const log = (m) => out.push(m);
  const incomplete = status({ cwd, packageRoot: root, env: {}, homedir, log });
  assert.equal(incomplete.ok, false);
  assert.deepEqual(incomplete.skills.missing, managedSkillNames(catalog));

  for (const name of managedSkillNames(catalog)) writeSkill(cwd, SKILLS_DIR, name);
  out = [];
  const complete = status({ cwd, packageRoot: root, env: {}, homedir, log });
  assert.equal(complete.ok, true);
  assert.equal(complete.claudeMd.expected, true);
  assert.equal(complete.claudeMd.imports, true);
  assert.equal(complete.tracker.saved, 'github');
  assert.ok(out[0].includes('Skills: 28/28 installed'));
  assert.ok(out[0].includes('CLAUDE.md: imports AGENTS.md'));
  assert.ok(out[0].includes('Tracker: Specs and tickets live in: GitHub issues'));
  assert.ok(!out[0].includes('References'));

  writeSkill(cwd, SKILLS_DIR, 'operator');
  writeSkill(cwd, SKILLS_DIR, 'tdd');
  writeV2References(cwd);
  out = [];
  const leftover = status({ cwd, packageRoot: root, env: {}, homedir, log });
  assert.equal(leftover.ok, false);
  assert.deepEqual(leftover.legacySkills, ['tdd', 'operator']);
  assert.ok(out[0].includes('Leftover v2 skills: tdd, operator'));
  assert.ok(out[0].includes('References: v2 managed references/ still present'));

  fs.rmSync(path.join(cwd, SKILLS_DIR, 'operator'), { recursive: true });
  fs.rmSync(path.join(cwd, SKILLS_DIR, 'tdd'), { recursive: true });
  assert.equal(status({ cwd, packageRoot: root, env: {}, homedir, log: quiet }).ok, true, 'v2 references alone do not fail ok');

  fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# no import\n', 'utf8');
  out = [];
  const noImport = status({ cwd, packageRoot: root, env: {}, homedir, log });
  assert.equal(noImport.ok, false);
  assert.ok(out[0].includes('CLAUDE.md: missing the @AGENTS.md import'));
});

test('status skips the CLAUDE.md check when claude-code is not a saved agent', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });
  for (const name of managedSkillNames(loadCatalog(root))) writeSkill(cwd, SKILLS_DIR, name);
  /** @type {string[]} */
  const out = [];
  const result = status({ cwd, packageRoot: root, env: {}, homedir: tmpDir(), log: (m) => out.push(m) });
  assert.equal(result.ok, true);
  assert.equal(result.claudeMd.expected, false);
  assert.ok(!out[0].includes('CLAUDE.md'));
});

test('status reports TokenEconomizer when its launcher exists, without affecting ok', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });
  for (const name of managedSkillNames(loadCatalog(root))) {
    writeSkill(cwd, SKILLS_DIR, name);
  }

  const homedir = tmpDir();
  const absent = status({ cwd, packageRoot: root, env: {}, homedir, log: quiet });
  assert.equal(absent.tokenEconomizer.present, false);
  assert.equal(absent.ok, true);

  const launcher = path.join(homedir, '.tokeneconomizer', 'bin', 'te');
  fs.mkdirSync(path.dirname(launcher), { recursive: true });
  fs.writeFileSync(launcher, '#!/bin/sh\n', 'utf8');
  const present = status({ cwd, packageRoot: root, env: {}, homedir, log: quiet });
  assert.equal(present.tokenEconomizer.present, true);
  assert.equal(present.tokenEconomizer.launcher, launcher);
  assert.equal(present.ok, true);

  const custom = tmpDir();
  const overridden = status({ cwd, packageRoot: root, env: { TOKENECONOMIZER_HOME: custom }, homedir, log: quiet });
  assert.equal(overridden.tokenEconomizer.home, custom);
  assert.equal(overridden.tokenEconomizer.present, false);
});
