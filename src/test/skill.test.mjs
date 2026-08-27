import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { operatorSkillDir } from '../lib/catalog.mjs';
import { packageRoot } from './helpers.mjs';

test('operator skill has router frontmatter and arbitration rules', () => {
  const skill = fs.readFileSync(path.join(operatorSkillDir(packageRoot()), 'SKILL.md'), 'utf8');
  assert.ok(skill.replace(/\r\n/g, '\n').startsWith('---\n'));
  assert.ok(skill.includes('name: operator'));
  assert.ok(skill.includes('disable-model-invocation: true'));
  assert.ok(skill.includes('ask-matt'));
  assert.ok(skill.includes('using-agent-skills'));
  assert.ok(skill.includes('grill-with-docs'));
  assert.ok(skill.includes('security-and-hardening'));
  assert.ok(skill.includes('code-review-and-quality'));
  assert.ok(skill.includes('tdd'));
  assert.ok(skill.includes('Never Addy'));
});
