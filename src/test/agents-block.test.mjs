import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { agentsBlockPath, legacySkillNames, loadCatalog, ownSkillNames } from '../lib/catalog.mjs';
import { packageRoot } from './helpers.mjs';

const MAX_BLOCK_LINES = 100;

/**
 * Backticked tokens the block may use that are not installed skills: files, folders,
 * headings, commands, code tokens, and pstack hand-offs that are not installed here.
 */
const NON_SKILL_TOKENS = new Set([
  '## Hand-off',
  'SKILL.md',
  'CONSTRAINTS.md',
  'AGENTS.md',
  'GLOSSARY.md',
  'Specs and tickets live in: …',
  '## Project context',
  '## Commands',
  '## Conventions',
  '## Interface design',
  '## Known pitfalls',
  '## Project skills',
  '.cursor/skills/',
  'arena',
  'how',
  'why',
  'TokenEconomizer:',
  'toolprune restore',
  'any',
  '@ts-ignore',
  '@ts-expect-error',
  'src',
  'tests',
  'docs',
  'config',
  'tools',
  'examples',
  'prototype',
  'temp',
  'docs/architecture.md',
  'docs/features/',
  'docs/changes/<change-id>/',
  'operator:start',
  'operator:end',
  'operator update',
  '.claude/skills/<name>/SKILL.md',
  'name',
  'description',
  '.claude/settings.json',
]);

const catalog = loadCatalog(packageRoot());
const own = ownSkillNames(catalog);
const pstack = catalog.sources.find((source) => source.id === 'pstack')?.skills ?? [];
const installed = new Set([...own, ...pstack]);
const legacyOnly = legacySkillNames(catalog).filter((name) => !own.includes(name));

function block() {
  return fs.readFileSync(agentsBlockPath(packageRoot()), 'utf8').replace(/\r\n/g, '\n');
}

/** @param {string} text */
function backticked(text) {
  return [...text.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
}

/** @param {string} text @param {string} heading */
function section(text, heading) {
  const start = `\n${text}`.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `missing section ## ${heading}`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end);
}

test('agents block stays under 100 lines because it loads every session', () => {
  const lines = block().replace(/\n$/, '').split('\n').length;
  assert.ok(lines < MAX_BLOCK_LINES, `agents block is ${lines} lines`);
});

test('every backticked name in the block is an installed skill or an allow-listed token', () => {
  const unknown = backticked(block()).filter((token) => !installed.has(token) && !NON_SKILL_TOKENS.has(token));
  assert.deepEqual([...new Set(unknown)], []);
});

test('block names no legacy-only skill and no command to invoke', () => {
  const text = block();
  const tokens = new Set(backticked(text));
  assert.deepEqual(
    legacyOnly.filter((name) => tokens.has(name)),
    [],
  );
  assert.ok(legacyOnly.includes('operator'));
  assert.ok(!text.includes('/operator'));
  for (const name of ['Matt', 'Addy', 'ask-matt', 'using-agent-skills', 'poteto-mode']) {
    assert.ok(!text.includes(name), `block mentions ${name}`);
  }
});

test('block routes every pstack skill and the own lifecycle skills', () => {
  const tokens = new Set(backticked(block()));
  for (const name of pstack) assert.ok(tokens.has(name), `block does not place ${name}`);
  for (const name of own) assert.ok(tokens.has(name), `block does not place ${name}`);
});

test('detector sizes work first, then the Understand lane, then Production in trigger order', () => {
  const detector = section(block(), 'Detector');
  assert.ok(detector.includes('take the larger'));
  assert.ok(detector.includes('cause is unknown is not small'));
  const order = ['Small change', 'Medium change', '`grill`', '`spec`', '`tickets`', '`prototype`', '`constraints`', '`implement`', '`simplify-pass`', '`architecture`', '`security`', '`observability`', '`ci`', '`review`', '`migration`', '`ship`', '`retro`'];
  let from = 0;
  for (const needle of order) {
    const at = detector.indexOf(needle, from);
    assert.ok(at >= 0, `detector misses ${needle} after the previous branch`);
    from = at + needle.length;
  }
});

test('block holds the three gates and never asks to continue between them', () => {
  const gates = section(block(), 'Gates');
  for (const gate of ['**Understanding.**', '**Breakdown.**', '**Merge.**']) {
    assert.ok(gates.includes(gate), `missing gate ${gate}`);
  }
  assert.ok(gates.includes('test kit'), 'merge gate is the PM testing the journey');
  assert.ok(gates.includes('do not stop to ask whether to continue'));
});

test('block states the PM rules and the test kit', () => {
  const pm = section(block(), 'The user is a Product Manager');
  for (const needle of ['recommended answer', 'one line each', 'veto', 'vertical slice', 'never ships alone', '**test kit**', 'journey step by step', '`principle-prove-it-works`']) {
    assert.ok(pm.includes(needle), `PM rules miss "${needle}"`);
  }
});

test('block states the orchestration rule with its sequential fallback', () => {
  const orchestration = section(block(), 'Orchestration');
  for (const needle of ['subagent', 'own git worktree', 'parallel', 'integrate', 'one after another']) {
    assert.ok(orchestration.includes(needle), `orchestration misses "${needle}"`);
  }
});

test('block keeps pstack substitutions, the tracker line, and composes with TokenEconomizer', () => {
  const text = block();
  assert.ok(text.includes('`.cursor/skills/` path means'));
  assert.ok(text.includes('Opening-a-PR playbook is `pr`'));
  assert.ok(text.includes('`Specs and tickets live in: …`'));
  assert.ok(text.includes('One review per change: `review`'));
  assert.ok(text.includes('One simplify pass per medium or larger change: `simplify-pass`, by a fresh subagent'));
  assert.ok(text.includes('`toolprune restore`'));
  assert.ok(text.includes('unknown cause: `debug`'));
  assert.ok(!catalog.sources.some((source) => /tokeneconomizer/i.test(source.repo)));
});
