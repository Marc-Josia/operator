import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { agentsBlockPath, loadCatalog, ownSkillNames, payloadDir } from '../lib/catalog.mjs';
import { packageRoot } from './helpers.mjs';

/**
 * Skill-shaped backticked tokens (lowercase kebab) that are not skills: folders, code,
 * frontmatter keys, CLIs, and pstack hand-offs the block says are not installed.
 */
const NOT_SKILLS = new Set([
  'any', 'eval', 'gh', 'name', 'description',
  'src', 'tests', 'docs', 'config', 'tools', 'examples', 'temp',
  'arena', 'how', 'why',
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
const block = read(agentsBlockPath(packageRoot()));

test('catalog ownSkills equals the skill folders in the payload', () => {
  const folders = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  assert.deepEqual([...folders].sort(), [...own].sort());
});

test('every skill name used in an own skill or the agents block is an own or pstack skill', () => {
  for (const [name, text] of [...skillText, ['agents-block', block]]) {
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

test('every own skill is reachable from the agents block, directly or through Hand-offs', () => {
  const reached = new Set(skillTokens(block).filter((token) => skillText.has(token)));
  const queue = [...reached];
  while (queue.length > 0) {
    const next = skillTokens(section(skillText.get(queue.shift()) ?? '', 'Hand-off'));
    for (const token of next) {
      if (skillText.has(token) && !reached.has(token)) {
        reached.add(token);
        queue.push(token);
      }
    }
  }
  assert.deepEqual(own.filter((name) => !reached.has(name)), []);
});
