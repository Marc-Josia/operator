import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { legacySkillNames, loadCatalog, ownSkillNames, payloadDir } from '../lib/catalog.mjs';
import { packageRoot } from './helpers.mjs';

const SECTIONS = ['Mission', 'Done when', 'Never', 'Stop and ask', 'Hand-off'];
const MAX_SKILL_LINES = 80;
const MAX_TEMPLATE_LINES = 59;

/** @param {string} text */
function normalize(text) {
  return text.replace(/\r\n/g, '\n');
}

/** @param {string} text */
function lineCount(text) {
  return text.replace(/\n$/, '').split('\n').length;
}

/** @param {string} text @returns {Record<string, string> | null} */
function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return null;
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

/** `## ` headings outside fenced code blocks, in order. @param {string} text */
function sectionHeadings(text) {
  const headings = [];
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced && line.startsWith('## ')) headings.push(line.slice(3).trim());
  }
  return headings;
}

/** Backticked legacy-only names in the text. @param {string} text @param {string[]} legacyOnly */
function legacyMentions(text, legacyOnly) {
  return legacyOnly.filter((name) => text.includes(`\`${name}\``));
}

const catalog = loadCatalog(packageRoot());
const own = ownSkillNames(catalog);
const legacyOnly = legacySkillNames(catalog).filter((name) => !own.includes(name));
const skillsDir = path.join(payloadDir(packageRoot()), 'skills');

for (const name of own) {
  const file = path.join(skillsDir, name, 'SKILL.md');
  const exists = fs.existsSync(file);
  test(`own skill ${name} follows the mission format`, { skip: !exists && 'not written yet' }, () => {
    const text = normalize(fs.readFileSync(file, 'utf8'));
    const fields = frontmatter(text);
    assert.ok(fields, `${name}: missing frontmatter`);
    assert.equal(fields.name, name, `${name}: frontmatter name must equal the folder name`);
    assert.ok(fields.description, `${name}: empty description`);
    assert.deepEqual(sectionHeadings(text), SECTIONS, `${name}: sections must be exactly ${SECTIONS.join(', ')}`);
    assert.ok(lineCount(text) <= MAX_SKILL_LINES, `${name}: ${lineCount(text)} lines, max ${MAX_SKILL_LINES}`);
    assert.deepEqual(legacyMentions(text, legacyOnly), [], `${name}: names legacy skills`);
  });
}

test('skill template has the mission sections, a filled example, and stays under 60 lines', () => {
  const text = normalize(fs.readFileSync(path.join(payloadDir(packageRoot()), 'SKILL-TEMPLATE.md'), 'utf8'));
  const fields = frontmatter(text);
  assert.ok(fields && 'name' in fields && fields.description, 'template frontmatter needs name and description');
  assert.deepEqual(sectionHeadings(text), [...SECTIONS, 'Example']);
  assert.ok(lineCount(text) <= MAX_TEMPLATE_LINES, `template is ${lineCount(text)} lines`);
  assert.deepEqual(legacyMentions(text, legacyOnly), []);

  const example = /```markdown\n([\s\S]*?)\n```\s*$/.exec(text);
  assert.ok(example, 'template must end with a fenced example skill');
  const exampleText = `${example[1]}\n`;
  assert.ok(frontmatter(exampleText)?.name, 'example needs a name');
  assert.ok(frontmatter(exampleText)?.description, 'example needs a description');
  assert.deepEqual(sectionHeadings(exampleText), SECTIONS);
});

test('legacy-only mention check flags backticked v2 names', () => {
  assert.ok(legacyOnly.includes('grill-with-docs'));
  assert.ok(legacyOnly.includes('operator'));
  assert.ok(!legacyOnly.includes('implement'), 'own names reused from v2 are not legacy-only');
  assert.deepEqual(legacyMentions('Hand off to `to-spec`, then `spec`.', legacyOnly), ['to-spec']);
});
