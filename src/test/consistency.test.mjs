import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ownSkillNames, payloadDir } from '../lib/catalog.mjs';
import { packageRoot } from './helpers.mjs';

/**
 * Skill-shaped backticked tokens (lowercase kebab) that are not skills: folders, code,
 * frontmatter keys, CLIs, git branches, and pstack hand-offs that are not installed.
 */
const NOT_SKILLS = new Set([
  'any', 'eval', 'gh', 'name', 'description',
  'src', 'tests', 'docs', 'config', 'tools', 'examples', 'temp',
  'arena', 'how', 'why',
  'main', 'master', 'develop', 'staging',
]);

const catalog = loadCatalog(packageRoot());
const own = ownSkillNames(catalog);
const pstack = catalog.sources.find((source) => source.id === 'pstack')?.skills ?? [];
const installed = new Set([...own, ...pstack]);
const skillsDir = path.join(payloadDir(packageRoot()), 'skills');

/** @param {string} file */
function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** Backticked tokens shaped like a skill name. @param {string} text */
function skillTokens(text) {
  return [...text.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((match) => match[1]).filter((token) => !NOT_SKILLS.has(token));
}

/** @param {string} text @param {string} heading */
function section(text, heading) {
  const start = text.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `missing section ## ${heading}`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end);
}

const skillText = new Map(own.map((name) => [name, read(path.join(skillsDir, name, 'SKILL.md'))]));

test('catalog ownSkills equals the skill folders in the payload', () => {
  const folders = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  assert.deepEqual([...folders].sort(), [...own].sort());
});

test('every skill name used in an own skill is an own or pstack skill', () => {
  for (const [name, text] of skillText) {
    const unknown = skillTokens(text).filter((token) => !installed.has(token));
    assert.deepEqual([...new Set(unknown)], [], `${name} names skills that are not installed`);
  }
});

test('every own skill hands off only to existing skills', () => {
  for (const [name, text] of skillText) {
    const unknown = skillTokens(section(text, 'Hand-off')).filter((token) => !installed.has(token));
    assert.deepEqual([...new Set(unknown)], [], `${name}: Hand-off names missing skills`);
  }
});

/** @param {string} text */
function description(text) {
  return /^description: (.*)$/m.exec(text)?.[1] ?? '';
}

/** The agent picks a skill from its description alone, and the listing shares one budget across every installed skill. */
const MAX_DESCRIPTION = 400;
const MAX_DESCRIPTIONS_TOTAL = 6000;

test('every own skill description leads with its trigger and stays short', () => {
  for (const [name, text] of skillText) {
    const desc = description(text);
    assert.match(desc, /^Use /, `${name}: description must start with its trigger`);
    assert.ok(desc.length <= MAX_DESCRIPTION, `${name}: description is ${desc.length} chars, max ${MAX_DESCRIPTION}`);
  }
  const total = [...skillText.values()].reduce((sum, text) => sum + description(text).length, 0);
  assert.ok(total <= MAX_DESCRIPTIONS_TOTAL, `own descriptions total ${total} chars, max ${MAX_DESCRIPTIONS_TOTAL}`);
});

test('no own skill points agents at files Operator no longer writes', () => {
  for (const [name, text] of skillText) {
    for (const gone of ['OPERATOR.md', 'operator:start', 'operator:end', 'Specs and tickets live in', '## Project context']) {
      assert.ok(!text.includes(gone), `${name} mentions ${gone}`);
    }
  }
});
