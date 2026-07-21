// Tests for the runtime gate checker `.operator/bin/op.mjs`.
//
// Each test builds an isolated fixture: a REAL git repo in a tmp dir with a copy
// of the repo's `src/payload/operator` tree as `.operator/` (which brings the very
// op.mjs under test, plus gates.json/config.json/templates/memory). The checker
// resolves those siblings from its own location, so it must be run from the copy.
// node:test, zero dependencies.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAYLOAD_OPERATOR = path.join(REPO_ROOT, 'src', 'payload', 'operator');

// --- git & fixture helpers ----------------------------------------------------

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0 && args[0] !== 'rev-parse') throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r;
}

function commitAll(root, msg = 'seed') {
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', msg]);
  return git(root, ['rev-parse', 'HEAD']).stdout.trim();
}

function writeFile(root, rel, content) {
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-gate-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  fs.cpSync(PAYLOAD_OPERATOR, path.join(root, '.operator'), { recursive: true });
  // Keep .operator out of git so its churn never leaks into the measured diff.
  writeFile(root, '.gitignore', '.operator/\n');
  writeFile(root, 'README.md', '# fixture\n');
  const base = commitAll(root, 'initial');
  return { root, base };
}

function op(root, args) {
  const r = spawnSync('node', [path.join(root, '.operator', 'bin', 'op.mjs'), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', out: (r.stdout || '') + (r.stderr || '') };
}

function setConfig(root, patch) {
  const f = path.join(root, '.operator', 'config.json');
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  Object.assign(c, patch);
  fs.writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
}

function setMemory(root, name, lines) {
  writeFile(root, path.join('.operator', 'memory', name), Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join('\n') + '\n');
}

// --- work-item builder --------------------------------------------------------

const ALL_NO = [
  ['Public interface or API change?', 'no'],
  ['Schema or data migration?', 'no'],
  ['Touches protected paths?', 'no'],
  ['New dependency?', 'no'],
  ['Hard to reverse?', 'no'],
  ['More than ~3 files expected?', 'no'],
  ['Crosses module boundaries?', 'no'],
  ['User-visible behavior change?', 'no'],
];

function withYes(...questions) {
  return ALL_NO.map(([q, a]) => [q, questions.includes(q) ? 'yes' : a]);
}

function triageTable(rows) {
  return '| Question | Answer |\n|---|---|\n' + rows.map(([q, a]) => `| ${q} | ${a} |`).join('\n') + '\n';
}

const DOD_ITEMS = [
  'Acceptance criteria demonstrably met',
  'Tests exist for the changed behavior and pass',
  'No unrelated changes in the diff',
  'Applicable conventions respected',
  'Docs updated, or no-doc-impact journaled',
];

function writeItem(root, id, opts = {}) {
  const {
    lane = 'quick',
    stage = 'intake',
    base = '',
    problem = 'The widget crashes on empty input, which blocks users at checkout.',
    triage = ALL_NO,
    scope = 'src/app.js',
    tasks = ['- [x] Fix the crash on empty input'],
    dodChecked = true,
    journal = [`- 2026-07-15 CREATED lane=${lane}`],
    retro = 'Straightforward fix; a regression test now guards the empty-input path.',
    extraFrontmatter = {},
  } = opts;

  const fm = {
    id,
    title: 'Test item',
    lane,
    stage,
    base,
    created: '2026-07-15',
    updated: '2026-07-15',
    next: 'run the gate',
    ...extraFrontmatter,
  };
  const fmText = '---\n' + Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n---\n';
  const dod = DOD_ITEMS.map((tt) => `- [${dodChecked ? 'x' : ' '}] ${tt}`).join('\n');
  const scopeText = Array.isArray(scope) ? scope.join('\n') : scope;
  const content =
    fmText +
    `\n# Test item\n\n` +
    `## Problem\n\n${problem}\n\n` +
    `## Triage\n\n${triageTable(triage)}\n` +
    `## Scope\n\n${scopeText}\n\n` +
    `## Tasks\n\n${tasks.join('\n')}\n\n` +
    `## Definition of done\n\n${dod}\n\n` +
    `## Journal\n\n${journal.join('\n')}\n\n` +
    `## Retro\n\n${retro}\n`;

  const dir = path.join(root, '.operator', 'work', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'workitem.md'), content);
  return dir;
}

/** Write a fallback-template-shaped spec into `dir` (default name spec.md). */
function writeSpec(dir, name = 'spec.md', opts = {}) {
  const { filled = true, ac = ['The API returns 200 for valid input.'], tbd = false } = opts;
  const acText = ac.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const secBody = (real) => (filled ? (tbd ? 'TBD' : real) : '<!-- placeholder -->\n\n...');
  const body =
    `---\nitem: 001\nstatus: approved\n---\n\n# Spec — Test\n\n` +
    `## Problem & goal\n\n${secBody('Users hit a crash; done means no crash on empty input.')}\n\n` +
    `## Acceptance criteria\n\n${acText}\n\n` +
    `## Approach\n\n${secBody('Guard the empty-input branch and add a regression test.')}\n\n` +
    `## Non-functional constraints\n\n${secBody('None — a small internal guard, no perf/i18n/security surface.')}\n\n` +
    `## Out of scope\n\n${secBody('Any redesign of the input widget.')}\n\n` +
    `## Risks & assumptions\n\n${secBody('Assumes the validator is the only caller.')}\n`;
  fs.writeFileSync(path.join(dir, name), body);
}

function readItem(dir) {
  return fs.readFileSync(path.join(dir, 'workitem.md'), 'utf8');
}

// =============================================================================
// status
// =============================================================================

test('status: no work items prints the onboarding hint', (t) => {
  const { root } = setup(t);
  const r = op(root, ['status']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /No work items yet/);
});

test('status: lists items and names the next action', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base });
  const r = op(root, ['status']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /001-fix/);
  assert.match(r.stdout, /gate 001-fix/);
});

// =============================================================================
// Malformed frontmatter -> exit 2
// =============================================================================

test('malformed frontmatter exits 2 with an actionable error', (t) => {
  const { root } = setup(t);
  const dir = path.join(root, '.operator', 'work', '001-bad');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'workitem.md'), '---\nid: 001-bad\nthis line has no colon\n---\n\n# x\n');
  const r = op(root, ['gate', '001-bad']);
  assert.equal(r.status, 2);
  assert.match(r.out, /malformed/i);
});

// =============================================================================
// intake gate — quick lane (workitem-sections, triage, base, protected)
// =============================================================================

test('intake gate (quick) passes and advances to build', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '001-fix', { lane: 'quick', stage: 'intake', base });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.stdout, /Gate intake PASSED/);
  const wi = readItem(dir);
  assert.match(wi, /^stage: build$/m);
  assert.match(wi, /GATE intake PASSED — evidence:/);
});

test('workitem-sections fails on an empty Problem section', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'intake', base, problem: '<!-- nothing yet -->' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /workitem-sections/);
});

test('workitem-sections fails on TBD in Scope', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'intake', base, scope: 'TBD' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /workitem-sections/);
  assert.match(r.out, /TBD/);
});

test('triage-scorecard fails on an unanswered row', (t) => {
  const { root, base } = setup(t);
  const triage = ALL_NO.map(([q, a], i) => (i === 0 ? [q, 'yes/no'] : [q, a]));
  writeItem(root, '001-fix', { lane: 'quick', stage: 'intake', base, triage });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /triage-scorecard/);
});

test('triage-scorecard fails when the lane is below the rule floor', (t) => {
  const { root, base } = setup(t);
  // three yes -> rule floor is standard, but the item claims quick
  const triage = withYes('New dependency?', 'Hard to reverse?', 'Crosses module boundaries?');
  writeItem(root, '001-fix', { lane: 'quick', stage: 'intake', base, triage });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /triage-scorecard/);
});

test('base-recorded fails when base is unset', (t) => {
  const { root } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'intake', base: '' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /base-recorded/);
});

test('protected-paths-lane fails when Scope declares a protected path (quick)', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'intake', base, scope: 'src/auth/login.js' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /protected-paths-lane/);
});

// =============================================================================
// intake gate — standard lane (no protected-paths-lane check)
// =============================================================================

test('intake gate (standard) passes and advances to spec', (t) => {
  const { root, base } = setup(t);
  const triage = withYes('User-visible behavior change?');
  const dir = writeItem(root, '002-feat', { lane: 'standard', stage: 'intake', base, triage });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: spec$/m);
});

// =============================================================================
// spec gate — standard (spec-artifact, approval)
// =============================================================================

function specItem(root, id, opts = {}) {
  const { approved = true, spec } = opts;
  const journal = ['- 2026-07-15 CREATED lane=standard'];
  if (approved) journal.push('- 2026-07-15 APPROVAL plan granted by operator: "ship it, looks right"');
  const extraFrontmatter = spec === undefined ? {} : { spec };
  const dir = writeItem(root, id, { lane: 'standard', stage: 'spec', base: '', journal, extraFrontmatter });
  return dir;
}

test('spec gate (standard) passes with a filled fallback-template spec', (t) => {
  const { root } = setup(t);
  const dir = specItem(root, '002-feat', { spec: '.operator/work/002-feat/spec.md' });
  writeSpec(dir, 'spec.md');
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: build$/m);
});

test('spec gate passes with a non-empty external spec artifact (spec tool regime)', (t) => {
  const { root } = setup(t);
  const dir = specItem(root, '003-ext', { spec: 'specs/003-ext/spec.md' });
  writeFile(root, 'specs/003-ext/spec.md', '# Feature\n\nThe app SHALL return 200 for valid input.\n');
  const r = op(root, ['gate', '003-ext']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: build$/m);
  assert.match(r.stdout, /external spec artifact/);
});

test('spec-artifact fails when the spec frontmatter is empty', (t) => {
  const { root } = setup(t);
  specItem(root, '002-feat');
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /spec-artifact/);
  assert.match(r.out, /`spec:` is empty/);
});

test('spec-artifact fails when the referenced document does not exist', (t) => {
  const { root } = setup(t);
  specItem(root, '002-feat', { spec: 'specs/002-feat/spec.md' });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /spec-artifact/);
  assert.match(r.out, /does not exist/);
});

test('spec-artifact fails on an empty external artifact', (t) => {
  const { root } = setup(t);
  specItem(root, '003-ext', { spec: 'specs/003-ext/spec.md' });
  writeFile(root, 'specs/003-ext/spec.md', '<!-- nothing yet -->\n');
  const r = op(root, ['gate', '003-ext']);
  assert.equal(r.status, 1);
  assert.match(r.out, /spec-artifact/);
  assert.match(r.out, /empty/);
});

test('spec-artifact holds a fallback-template spec to the template contract (unfilled section)', (t) => {
  const { root } = setup(t);
  const dir = specItem(root, '002-feat', { spec: '.operator/work/002-feat/spec.md' });
  writeSpec(dir, 'spec.md', { filled: false });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /spec-artifact/);
});

test('spec-artifact requires acceptance criteria in a fallback-template spec', (t) => {
  const { root } = setup(t);
  const dir = specItem(root, '002-feat', { spec: '.operator/work/002-feat/spec.md' });
  writeSpec(dir, 'spec.md', { ac: [] });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /spec-artifact/);
  assert.match(r.out, /Acceptance criteria/);
});

test('operator-approval fails without a quoted approval line', (t) => {
  const { root } = setup(t);
  const dir = specItem(root, '002-feat', { approved: false, spec: '.operator/work/002-feat/spec.md' });
  writeSpec(dir, 'spec.md');
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /operator-approval/);
});

// =============================================================================
// build gate — quick (tasks, tests, lane caps, scope, protected)
// =============================================================================

function buildQuick(root, opts = {}) {
  // seed the scoped file, commit as base, then modify it (a small in-scope diff)
  writeFile(root, 'src/app.js', 'export const a = 1;\n');
  const base = commitAll(root, 'seed app');
  writeFile(root, 'src/app.js', 'export const a = 1;\nexport const b = 2;\n');
  setConfig(root, { testCommand: 'exit 0' });
  return writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base, scope: 'src/app.js', ...opts });
}

test('build gate (quick) passes and advances to review', (t) => {
  const { root } = setup(t);
  const dir = buildQuick(root);
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: review$/m);
});

test('tasks-complete fails with an unchecked task', (t) => {
  const { root } = setup(t);
  buildQuick(root, { tasks: ['- [x] one', '- [ ] two'] });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /tasks-complete/);
});

test('tests-pass fails when testCommand is null', (t) => {
  const { root } = setup(t);
  const dir = buildQuick(root);
  setConfig(root, { testCommand: null });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /tests-pass/);
  assert.match(r.out, /configure .*testCommand/);
  assert.match(readItem(dir), /^stage: build$/m); // unchanged on failure
});

test('tests-pass: testCommand false fails without a waiver, passes with one', (t) => {
  const { root } = setup(t);
  buildQuick(root, { journal: ['- 2026-07-15 CREATED lane=quick'] });
  setConfig(root, { testCommand: false });
  const fail = op(root, ['gate', '001-fix']);
  assert.equal(fail.status, 1);
  assert.match(fail.out, /tests-pass/);

  // add a waiver line and retry
  writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'build',
    base: fs.readFileSync(path.join(root, '.operator', 'work', '001-fix', 'workitem.md'), 'utf8').match(/^base: (.*)$/m)[1],
    scope: 'src/app.js',
    journal: ['- 2026-07-15 CREATED lane=quick', '- 2026-07-15 WAIVER tests operator accepts no suite yet'],
  });
  const pass = op(root, ['gate', '001-fix']);
  assert.equal(pass.status, 0, pass.out);
});

test('tests-pass fails when the test command exits non-zero', (t) => {
  const { root } = setup(t);
  buildQuick(root);
  setConfig(root, { testCommand: 'exit 3' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /tests-pass/);
  assert.match(r.out, /exited 3/);
});

test('diff-within-lane-caps fails when too many files change (quick)', (t) => {
  const { root } = setup(t);
  for (const f of ['a', 'b', 'c', 'd']) writeFile(root, `src/${f}.js`, 'x\n');
  const base = commitAll(root, 'seed four');
  for (const f of ['a', 'b', 'c', 'd']) writeFile(root, `src/${f}.js`, 'x\ny\n');
  setConfig(root, { testCommand: 'exit 0' });
  writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'build',
    base,
    scope: ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'],
  });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /diff-within-lane-caps/);
});

test('diff-within-scope fails when the diff touches an undeclared file', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/app.js', 'x\n');
  writeFile(root, 'src/other.js', 'y\n');
  const base = commitAll(root, 'seed two');
  writeFile(root, 'src/other.js', 'y\nz\n');
  setConfig(root, { testCommand: 'exit 0' });
  writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base, scope: 'src/app.js' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /diff-within-scope/);
  assert.match(r.out, /src\/other\.js/);
});

test('protected-paths-lane fails when the build diff touches a protected path (quick)', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/auth/login.js', 'x\n');
  const base = commitAll(root, 'seed auth');
  writeFile(root, 'src/auth/login.js', 'x\ny\n');
  setConfig(root, { testCommand: 'exit 0' });
  writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base, scope: 'src/auth/login.js' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /protected-paths-lane/);
});

test('build gate counts untracked files in the measured diff', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/app.js', 'x\n');
  const base = commitAll(root, 'seed app');
  writeFile(root, 'src/new.js', 'a\nb\nc\n'); // untracked, not in scope
  setConfig(root, { testCommand: 'exit 0' });
  writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base, scope: 'src/app.js' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /diff-within-scope/);
  assert.match(r.out, /src\/new\.js/);
});

// =============================================================================
// build gate — postmortem-if-thrashing (repeated ATTEMPTs force a postmortem)
// =============================================================================

const CREATED = '- 2026-07-15 CREATED lane=quick';
const ATTEMPT = (n) => `- 2026-07-15 ATTEMPT fix-crash failed: hypothesis ${n} wrong`;

test('build gate passes with zero ATTEMPT lines (no thrashing)', (t) => {
  const { root } = setup(t);
  const dir = buildQuick(root, { journal: [CREATED] });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: review$/m);
});

test('build gate passes under the postmortem threshold', (t) => {
  const { root } = setup(t);
  buildQuick(root, { journal: [CREATED, ATTEMPT(1), ATTEMPT(2)] }); // 2 < default 3
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
});

test('postmortem-if-thrashing fails at the threshold without a postmortem', (t) => {
  const { root } = setup(t);
  const dir = buildQuick(root, { journal: [CREATED, ATTEMPT(1), ATTEMPT(2), ATTEMPT(3)] });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /postmortem-if-thrashing/);
  assert.match(r.out, /postmortem/i);
  assert.match(readItem(dir), /^stage: build$/m); // unchanged on failure
});

test('a POSTMORTEM line resets the counter and the gate passes', (t) => {
  const { root } = setup(t);
  const dir = buildQuick(root, {
    journal: [CREATED, ATTEMPT(1), ATTEMPT(2), ATTEMPT(3), '- 2026-07-15 POSTMORTEM postmortem-001.md: wrong mental model of the parser', ATTEMPT(4)],
  });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out); // only 1 ATTEMPT since the postmortem
  assert.match(readItem(dir), /^stage: review$/m);
});

test('postmortemThreshold is configurable (0 disables the check)', (t) => {
  const { root } = setup(t);
  buildQuick(root, { journal: [CREATED, ATTEMPT(1), ATTEMPT(2), ATTEMPT(3), ATTEMPT(4)] });
  setConfig(root, { postmortemThreshold: 0 });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
});

// =============================================================================
// build gate — standard (tasks, tests, scope only)
// =============================================================================

test('build gate (standard) passes with an in-scope diff', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/app.js', 'x\n');
  const base = commitAll(root, 'seed');
  writeFile(root, 'src/app.js', 'x\ny\n');
  setConfig(root, { testCommand: 'exit 0' });
  const dir = writeItem(root, '002-feat', { lane: 'standard', stage: 'build', base, scope: 'src/app.js' });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: review$/m);
});

// =============================================================================
// review gate — quick (self-review, dod) & standard (review, security, dod)
// =============================================================================

test('review gate (quick) passes with a self-review line and a complete DoD', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'review',
    base,
    journal: ['- 2026-07-15 CREATED lane=quick', '- 2026-07-15 REVIEW self — 1 finding, resolved'],
  });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: ship$/m);
});

test('self-review-evidence fails without a REVIEW self line', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'review', base });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /self-review-evidence/);
});

test('dod-complete fails with an unchecked Definition of done item', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'review',
    base,
    dodChecked: false,
    journal: ['- 2026-07-15 CREATED lane=quick', '- 2026-07-15 REVIEW self — clean'],
  });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /dod-complete/);
});

test('review gate (standard) passes; security-review not required off protected paths', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '002-feat', {
    lane: 'standard',
    stage: 'review',
    base, // no diff since base -> nothing protected
    journal: ['- 2026-07-15 CREATED lane=standard', '- 2026-07-15 REVIEW sub-agent — 2 findings, resolved'],
  });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: ship$/m);
});

test('review-evidence fails without any REVIEW line (standard)', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '002-feat', { lane: 'standard', stage: 'review', base });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /review-evidence/);
});

test('security-review-if-protected fails when a protected path is in the diff', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/auth/login.js', 'x\n');
  const base = commitAll(root, 'seed auth');
  writeFile(root, 'src/auth/login.js', 'x\ny\n');
  writeItem(root, '002-feat', {
    lane: 'standard',
    stage: 'review',
    base,
    journal: ['- 2026-07-15 CREATED lane=standard', '- 2026-07-15 REVIEW peer — resolved'],
  });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /security-review-if-protected/);
});

test('security-review-if-protected passes with a REVIEW security line', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/auth/login.js', 'x\n');
  const base = commitAll(root, 'seed auth');
  writeFile(root, 'src/auth/login.js', 'x\ny\n');
  const dir = writeItem(root, '002-feat', {
    lane: 'standard',
    stage: 'review',
    base,
    journal: [
      '- 2026-07-15 CREATED lane=standard',
      '- 2026-07-15 REVIEW peer — resolved',
      '- 2026-07-15 REVIEW security — no issues in the auth change',
    ],
  });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: ship$/m);
});

// =============================================================================
// ship gate — quick (docs, harvest, retro) & standard (+ memory caps)
// =============================================================================

const SHIP_JOURNAL = [
  '- 2026-07-15 CREATED lane=quick',
  '- 2026-07-15 DOCS no-impact: internal fix, no user docs',
  '- 2026-07-15 MEMORY none: nothing durable this time',
];

test('ship gate (quick) passes and advances to done', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '001-fix', { lane: 'quick', stage: 'ship', base, journal: SHIP_JOURNAL });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: done$/m);
  assert.match(r.stdout, /Work item complete/);
});

test('docs-updated-or-waived fails without a DOCS line', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'ship',
    base,
    journal: ['- 2026-07-15 CREATED lane=quick', '- 2026-07-15 MEMORY none: nothing durable'],
  });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /docs-updated-or-waived/);
});

test('memory-harvest does NOT match MEMORY recorded / lesson recorded', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'ship',
    base,
    journal: [
      '- 2026-07-15 CREATED lane=quick',
      '- 2026-07-15 DOCS no-impact: internal',
      '- 2026-07-15 MEMORY recorded: C-004 always quote paths',
      '- 2026-07-15 MEMORY lesson recorded: L-002 repro first',
    ],
  });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /memory-harvest/);
});

test('memory-harvest passes on MEMORY harvested:', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'ship',
    base,
    journal: [
      '- 2026-07-15 CREATED lane=quick',
      '- 2026-07-15 DOCS no-impact: internal',
      '- 2026-07-15 MEMORY harvested: L-003 guard empty input',
    ],
  });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: done$/m);
});

test('retro-filled fails on an empty Retro section', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'ship', base, journal: SHIP_JOURNAL, retro: '<!-- todo -->' });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 1);
  assert.match(r.out, /retro-filled/);
});

test('ship gate (standard) enforces memory caps', (t) => {
  const { root, base } = setup(t);
  setMemory(root, 'lessons.md', 300); // cap is 150
  writeItem(root, '002-feat', {
    lane: 'standard',
    stage: 'ship',
    base,
    journal: [
      '- 2026-07-15 CREATED lane=standard',
      '- 2026-07-15 DOCS updated: README quickstart',
      '- 2026-07-15 MEMORY none: nothing durable',
    ],
  });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 1);
  assert.match(r.out, /memory-caps/);
});

test('ship gate (standard) passes with memory within caps', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '002-feat', {
    lane: 'standard',
    stage: 'ship',
    base,
    journal: [
      '- 2026-07-15 CREATED lane=standard',
      '- 2026-07-15 DOCS updated: README quickstart',
      '- 2026-07-15 MEMORY none: nothing durable',
    ],
  });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: done$/m);
});

// =============================================================================
// escalate — one-way lane raise
// =============================================================================

test('escalate quick -> standard journals the raise and names the spec to backfill', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base });
  const r = op(root, ['escalate', '001-fix', '--to', 'standard', 'grew past the caps']);
  assert.equal(r.status, 0, r.out);
  const wi = readItem(dir);
  assert.match(wi, /^lane: standard$/m);
  assert.match(wi, /ESCALATED quick → standard — reason: grew past the caps/);
  assert.match(r.stdout, /templates\/spec\.md/);
  assert.match(r.stdout, /`spec:`/);
});

test('escalate with no --to defaults to standard', (t) => {
  const { root, base } = setup(t);
  const dir = writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base });
  const r = op(root, ['escalate', '001-fix']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^lane: standard$/m);
});

test('escalate refuses to lower the lane (one-way)', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'build', base });
  const r = op(root, ['escalate', '001-fix', '--to', 'quick']);
  assert.equal(r.status, 2);
  assert.match(r.out, /one-way/);
});

test('escalate refuses to go beyond standard', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '002-feat', { lane: 'standard', stage: 'build', base });
  const r = op(root, ['escalate', '002-feat']);
  assert.equal(r.status, 2);
  assert.match(r.out, /standard lane/);
});

// =============================================================================
// external spec artifact directory is excluded from the measured diff
// =============================================================================

test('build gate excludes the external spec artifact directory from the diff', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/app.js', 'x\n');
  const base = commitAll(root, 'seed');
  writeFile(root, 'src/app.js', 'x\ny\n');
  // spec-stage documents authored by the spec tool, NOT in Scope
  writeFile(root, 'specs/002-feat/spec.md', '# spec\n\nThe app SHALL work.\n');
  writeFile(root, 'specs/002-feat/plan.md', '# plan\n');
  setConfig(root, { testCommand: 'exit 0' });
  const dir = writeItem(root, '002-feat', {
    lane: 'standard',
    stage: 'build',
    base,
    scope: 'src/app.js',
    extraFrontmatter: { spec: 'specs/002-feat/spec.md' },
  });
  const r = op(root, ['gate', '002-feat']);
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: review$/m);
});

// =============================================================================
// unresolvable base -> uncommitted-only fallback with a printed warning
// =============================================================================

test('unresolvable base falls back to uncommitted-only and warns', (t) => {
  const { root } = setup(t);
  writeFile(root, 'src/app.js', 'x\n');
  commitAll(root, 'seed'); // committed, but the item points at a bogus base
  writeFile(root, 'src/app.js', 'x\ny\n');
  setConfig(root, { testCommand: 'exit 0' });
  const dir = writeItem(root, '001-fix', {
    lane: 'quick',
    stage: 'build',
    base: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    scope: 'src/app.js',
  });
  const r = op(root, ['gate', '001-fix']);
  assert.notEqual(r.status, 2);
  assert.match(r.out, /not a resolvable commit/);
  assert.match(r.out, /uncommitted/);
  // the uncommitted change is still measured, in scope -> gate passes
  assert.equal(r.status, 0, r.out);
  assert.match(readItem(dir), /^stage: review$/m);
});

// =============================================================================
// done stage has no gate
// =============================================================================

test('gate on a done item reports nothing to do', (t) => {
  const { root, base } = setup(t);
  writeItem(root, '001-fix', { lane: 'quick', stage: 'done', base });
  const r = op(root, ['gate', '001-fix']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /already done/);
});
