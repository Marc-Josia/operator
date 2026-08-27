import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, allCatalogSkills, managedSkillNames } from '../lib/catalog.mjs';
import { packageRoot } from './helpers.mjs';

const MATT = [
  'setup-matt-pocock-skills',
  'grill-with-docs',
  'grill-me',
  'grilling',
  'domain-modeling',
  'to-spec',
  'to-tickets',
  'tdd',
  'implement',
  'code-review',
  'codebase-design',
  'improve-codebase-architecture',
  'diagnosing-bugs',
  'prototype',
  'wayfinder',
  'research',
  'writing-for-agents',
  'wizard',
];

const ADDY = [
  'security-and-hardening',
  'code-review-and-quality',
  'deprecation-and-migration',
  'observability-and-instrumentation',
  'ci-cd-and-automation',
  'shipping-and-launch',
  'performance-optimization',
];

const REF_FILES = [
  'accessibility-checklist.md',
  'definition-of-done.md',
  'observability-checklist.md',
  'orchestration-patterns.md',
  'performance-checklist.md',
  'security-checklist.md',
  'testing-patterns.md',
];

test('catalog lists the curated Matt + Addy skills and skips competing routers', () => {
  const catalog = loadCatalog(packageRoot());
  const matt = catalog.sources.find((s) => s.id === 'mattpocock');
  const addy = catalog.sources.find((s) => s.id === 'addyosmani');
  assert.ok(matt);
  assert.ok(addy);
  assert.equal(matt.repo, 'mattpocock/skills');
  assert.equal(addy.repo, 'addyosmani/agent-skills');
  assert.deepEqual(matt.skills, MATT);
  assert.deepEqual(addy.skills, ADDY);
  assert.equal(catalog.operatorSkill, 'operator');
  assert.ok(catalog.skip.includes('ask-matt'));
  assert.ok(catalog.skip.includes('using-agent-skills'));
  const names = allCatalogSkills(catalog);
  assert.ok(!names.includes('ask-matt'));
  assert.ok(!names.includes('using-agent-skills'));
  assert.deepEqual(catalog.references.files, REF_FILES);
  assert.deepEqual(managedSkillNames(catalog), [...MATT, ...ADDY, 'operator']);
});
