import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
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
import { END_MARKER, START_MARKER } from '../lib/legacy-files.mjs';
import { statePath, writeState } from '../lib/state.mjs';
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

function read(cwd, file) {
  return fs.readFileSync(path.join(cwd, file), 'utf8');
}

function exists(cwd, file) {
  return fs.existsSync(path.join(cwd, file));
}

const SCAFFOLD = [
  'Project context',
  'Commands',
  'Conventions',
  'Interface design',
  'Known pitfalls',
  'Project skills',
].map((title) => `## ${title}\n`).join('\n');

/**
 * Lay out what Operator v3.2 wrote: OPERATOR.md, the AGENTS.md block, the empty project sections,
 * the tracker line, the CLAUDE.md import, and the state record of the import.
 * `userText` is appended to AGENTS.md after the scaffold (the user's own content).
 */
function writeV3Install(cwd, { claudeMd = '@AGENTS.md\n', userText = '', tracker = 'github', fileCreated = true } = {}) {
  fs.writeFileSync(path.join(cwd, 'OPERATOR.md'), '# Operator\n\nThe process.\n', 'utf8');
  const scaffold = SCAFFOLD.replace('## Project context\n', '## Project context\n\nSpecs and tickets live in: GitHub issues\n');
  fs.writeFileSync(
    path.join(cwd, 'AGENTS.md'),
    `${START_MARKER}\nRead @OPERATOR.md first.\n${END_MARKER}\n\n${scaffold}${userText}`,
    'utf8',
  );
  if (claudeMd !== null) fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), claudeMd, 'utf8');
  writeState(cwd, {
    version: 3,
    agents: ['claude-code'],
    tracker,
    claudeMd: { importAdded: true, fileCreated },
  });
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
  assert.equal(exists(cwd, 'references'), false, 'v4 installs no references/');
});

test('init writes only the state file: no AGENTS.md, CLAUDE.md, or OPERATOR.md', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  await init({ cwd, packageRoot: root, agents: ['cursor', 'claude-code'], yes: true, runner: async () => {}, log: quiet });
  assert.deepEqual(readState(cwd), { version: 3, agents: ['cursor', 'claude-code'], tracker: 'local' });
  assert.deepEqual(fs.readdirSync(cwd), ['.operator']);
});

test('init leaves existing AGENTS.md and CLAUDE.md byte for byte as they are', async () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Mine\n\nnpm test\n', 'utf8');
  fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Team notes\n', 'utf8');
  await init({ cwd, packageRoot: packageRoot(), agents: ['claude-code'], yes: true, runner: async () => {}, log: quiet });
  assert.equal(read(cwd, 'AGENTS.md'), '# Mine\n\nnpm test\n');
  assert.equal(read(cwd, 'CLAUDE.md'), '# Team notes\n');
  assert.deepEqual(fs.readdirSync(cwd).sort(), ['.operator', 'AGENTS.md', 'CLAUDE.md']);
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

test('init asks for the tracker and saves it in the state file only', async () => {
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
  assert.equal(readState(cwd).tracker, 'Jira project WEB');
  await init({ cwd, packageRoot: root, agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });
  assert.equal(readState(cwd).tracker, 'Jira project WEB', '-y keeps the saved choice');
  assert.deepEqual(fs.readdirSync(cwd), ['.operator']);
});

test('init -y without --agent fails', async () => {
  await assert.rejects(
    () => init({ cwd: tmpDir(), packageRoot: packageRoot(), yes: true, runner: async () => {}, log: quiet }),
    (err) => err.code === 2,
  );
});

test('init on a v3 install touches no v3 file and keeps the CLAUDE.md record for update', async () => {
  const cwd = tmpDir();
  writeV3Install(cwd);
  await init({ cwd, packageRoot: packageRoot(), agents: ['claude-code'], yes: true, runner: async () => {}, log: quiet });
  assert.ok(exists(cwd, 'OPERATOR.md'));
  assert.ok(read(cwd, 'AGENTS.md').includes(START_MARKER));
  assert.equal(read(cwd, 'CLAUDE.md'), '@AGENTS.md\n');
  assert.deepEqual(readState(cwd).claudeMd, { importAdded: true, fileCreated: true });
});

test('update cleans a v3.2 install whose AGENTS.md holds only Operator scaffolding', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  writeV3Install(cwd);
  /** @type {string[]} */
  const logs = [];
  await update({ cwd, packageRoot: root, runner: async () => {}, log: (m) => logs.push(m) });

  assert.equal(exists(cwd, 'OPERATOR.md'), false);
  assert.equal(exists(cwd, 'AGENTS.md'), false, 'only the empty scaffold was left, so the file goes');
  assert.equal(exists(cwd, 'CLAUDE.md'), false, 'Operator created it and only the import was in it');
  assert.deepEqual(readState(cwd), { version: 3, agents: ['claude-code'], tracker: 'github' });
  assert.ok(logs.some((m) => m.includes('Removed OPERATOR.md')));
  assert.ok(logs.some((m) => m.includes('Deleted AGENTS.md')));
  assert.ok(logs.some((m) => m.includes('Deleted CLAUDE.md')));
  assert.ok(!logs.includes(NO_TRACKER_HINT), 'the tracker survives in state');
});

test('update keeps the user text in AGENTS.md and the import that still feeds it to Claude Code', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  writeV3Install(cwd, { userText: '\n## Notes\n\nUse pnpm.\n' });
  fs.writeFileSync(
    path.join(cwd, 'AGENTS.md'),
    read(cwd, 'AGENTS.md').replace('## Commands\n', '## Commands\n\nnpm test\n'),
    'utf8',
  );
  /** @type {string[]} */
  const logs = [];
  await update({ cwd, packageRoot: root, runner: async () => {}, log: (m) => logs.push(m) });

  assert.equal(exists(cwd, 'OPERATOR.md'), false);
  const text = read(cwd, 'AGENTS.md');
  assert.ok(!text.includes(START_MARKER));
  assert.ok(!text.includes('Read @OPERATOR.md'));
  assert.ok(!text.includes('Specs and tickets live in:'));
  assert.ok(text.includes('## Commands\n\nnpm test\n'));
  assert.ok(text.includes('## Notes\n\nUse pnpm.\n'));
  assert.ok(text.startsWith('## Project context\n'));
  assert.equal(read(cwd, 'CLAUDE.md'), '@AGENTS.md\n', 'the import stays: AGENTS.md still has user content');
  assert.deepEqual(readState(cwd).claudeMd, { importAdded: true, fileCreated: true });
  assert.ok(logs.some((m) => m.includes('Removed the Operator block')));
  assert.ok(logs.some((m) => m.includes('Removed the tracker line')));
  assert.ok(!logs.some((m) => m.includes('CLAUDE.md')));

  // Nothing left to clean: the import is not a leftover and a second update is a no-op.
  const skills = managedSkillNames(loadCatalog(root));
  for (const name of skills) writeSkill(cwd, SKILLS_DIR, name);
  assert.equal(status({ cwd, packageRoot: root, env: {}, homedir: tmpDir(), log: quiet }).ok, true);
  const before = read(cwd, 'AGENTS.md');
  await update({ cwd, packageRoot: root, runner: async () => {}, log: quiet });
  assert.equal(read(cwd, 'AGENTS.md'), before);

  // remove drops the import whenever Operator added it, and CLAUDE.md with it (Operator created it).
  await remove({ cwd, packageRoot: root, runner: async () => {}, log: quiet });
  assert.equal(exists(cwd, 'CLAUDE.md'), false);
  assert.equal(read(cwd, 'AGENTS.md'), before, 'the user AGENTS.md is untouched');
  assert.equal(exists(cwd, '.operator'), false);
});

test('update removes only the import line from a CLAUDE.md the user owns', async () => {
  const cwd = tmpDir();
  writeV3Install(cwd, { claudeMd: '# Team notes\n\nBe kind.\n\n@AGENTS.md\n', fileCreated: false });
  await update({ cwd, packageRoot: packageRoot(), runner: async () => {}, log: quiet });
  assert.equal(exists(cwd, 'AGENTS.md'), false);
  assert.equal(read(cwd, 'CLAUDE.md'), '# Team notes\n\nBe kind.\n');
  assert.equal(readState(cwd).claudeMd, undefined);
});

test('update leaves an @AGENTS.md line Operator did not add', async () => {
  const cwd = tmpDir();
  writeV3Install(cwd);
  writeState(cwd, { version: 3, agents: ['claude-code'], tracker: 'github' });
  await update({ cwd, packageRoot: packageRoot(), runner: async () => {}, log: quiet });
  assert.equal(exists(cwd, 'AGENTS.md'), false);
  assert.equal(read(cwd, 'CLAUDE.md'), '@AGENTS.md\n', 'not recorded in state, so not ours');
});

test('update on a v4 install changes nothing in the repo', async () => {
  const cwd = tmpDir();
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Mine\n', 'utf8');
  await init({ cwd, packageRoot: packageRoot(), agents: ['cursor'], yes: true, runner: async () => {}, log: quiet });
  /** @type {string[]} */
  const logs = [];
  await update({ cwd, packageRoot: packageRoot(), runner: async () => {}, log: (m) => logs.push(m) });
  assert.deepEqual(logs, ['Operator updated. Skills are current.']);
  assert.deepEqual(fs.readdirSync(cwd).sort(), ['.operator', 'AGENTS.md']);
  assert.equal(read(cwd, 'AGENTS.md'), '# Mine\n');
});

test('remove uninstalls own + pstack without --copy and deletes the state', async () => {
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
  assert.equal(exists(cwd, '.operator'), false);
  assert.deepEqual(fs.readdirSync(cwd), []);
});

test('remove cleans a v3.2 install and keeps the user text in AGENTS.md', async () => {
  const cwd = tmpDir();
  writeV3Install(cwd, { userText: '\n## Notes\n\nUse pnpm.\n' });
  /** @type {string[]} */
  const logs = [];
  await remove({ cwd, packageRoot: packageRoot(), runner: async () => {}, log: (m) => logs.push(m) });
  assert.equal(exists(cwd, 'OPERATOR.md'), false);
  const text = read(cwd, 'AGENTS.md');
  assert.ok(!text.includes(START_MARKER));
  assert.ok(!text.includes('Specs and tickets live in:'));
  assert.ok(text.includes('## Notes\n\nUse pnpm.\n'));
  assert.equal(exists(cwd, 'CLAUDE.md'), false, 'remove drops the import even though AGENTS.md stays');
  assert.equal(exists(cwd, '.operator'), false);
  assert.ok(logs[0].includes('Operator skills removed.'));
});

test('remove on a v3 install with only the scaffold deletes AGENTS.md too', async () => {
  const cwd = tmpDir();
  writeV3Install(cwd);
  await remove({ cwd, packageRoot: packageRoot(), runner: async () => {}, log: quiet });
  assert.deepEqual(fs.readdirSync(cwd), []);
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

  for (const file of V2_REF_FILES) assert.equal(exists(cwd, path.join('references', file)), false);
  assert.equal(fs.existsSync(markerPath(cwd)), false);
  assert.equal(read(cwd, path.join('references', 'keep-me.md')), 'mine');

  assert.deepEqual(readState(cwd), { version: 3, agents: ['claude-code'] });
  assert.equal(exists(cwd, 'CLAUDE.md'), false, 'v4 never creates it');

  const text = read(cwd, 'AGENTS.md');
  assert.ok(!text.includes('OLD V2 BLOCK'));
  assert.ok(text.includes('# Keep me'));
  assert.ok(text.includes('## Commands\n\nnpm test\n'));
  assert.ok(logs.includes(NO_TRACKER_HINT));
  assert.ok(logs.some((m) => m.includes('Removed v2 skills')));
  assert.ok(logs.some((m) => m.includes('Removed v2 managed references/.')));

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

  await update({ cwd, packageRoot: root, tracker: 'linear', runner: async () => {}, log: quiet });
  assert.equal(readState(cwd).tracker, 'linear');
  assert.deepEqual(fs.readdirSync(cwd), ['.operator']);
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
  assert.equal(exists(cwd, 'references'), false);
  assert.equal(fs.existsSync(statePath(cwd)), false);
});

test('status reports skills, the saved tracker, and leftover v2 skills; references do not count', async () => {
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
  assert.equal(complete.tracker, 'github');
  assert.ok(out[0].includes('Skills: 31/31 installed'));
  assert.ok(out[0].includes('Tracker: github'));
  assert.ok(out[0].includes('Agents: claude-code'));
  assert.ok(!out[0].includes('References'));
  assert.ok(!out[0].includes('older Operator'));

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
});

test('status hints when no tracker is saved', async () => {
  const cwd = tmpDir();
  /** @type {string[]} */
  const out = [];
  status({ cwd, packageRoot: packageRoot(), env: {}, homedir: tmpDir(), log: (m) => out.push(m) });
  assert.ok(out[0].includes('Tracker: not set'));
  assert.ok(out[0].includes('Agents: none saved'));
});

test('status reports what an older Operator left and fails ok until update cleans it', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  const homedir = tmpDir();
  writeV3Install(cwd);
  for (const name of managedSkillNames(loadCatalog(root))) writeSkill(cwd, SKILLS_DIR, name);

  /** @type {string[]} */
  const out = [];
  const result = status({ cwd, packageRoot: root, env: {}, homedir, log: (m) => out.push(m) });
  assert.equal(result.ok, false);
  assert.deepEqual(
    { ...result.legacyFiles },
    { operatorMd: true, agentsBlock: true, trackerLine: true, claudeImport: true, any: true },
  );
  assert.ok(out[0].includes('run operator update'));
  assert.ok(out[0].includes('OPERATOR.md'));
  assert.ok(out[0].includes('AGENTS.md: Operator block'));
  assert.ok(out[0].includes('AGENTS.md: tracker line'));
  assert.ok(out[0].includes('CLAUDE.md: @AGENTS.md import'));

  await update({ cwd, packageRoot: root, runner: async () => {}, log: quiet });
  assert.equal(status({ cwd, packageRoot: root, env: {}, homedir, log: quiet }).ok, true);
});

test('status does not call the import a leftover while AGENTS.md still has user content', async () => {
  const cwd = tmpDir();
  const root = packageRoot();
  writeV3Install(cwd, { userText: '\n## Notes\n\nUse pnpm.\n' });
  for (const name of managedSkillNames(loadCatalog(root))) writeSkill(cwd, SKILLS_DIR, name);
  const result = status({ cwd, packageRoot: root, env: {}, homedir: tmpDir(), log: quiet });
  assert.equal(result.legacyFiles.agentsBlock, true);
  assert.equal(result.legacyFiles.claudeImport, false);
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
