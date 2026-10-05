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
  'triage',
  'handoff',
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

const PSTACK = ['unslop'];

const REF_FILES = [
  'accessibility-checklist.md',
  'definition-of-done.md',
  'observability-checklist.md',
  'orchestration-patterns.md',
  'performance-checklist.md',
  'security-checklist.md',
  'testing-patterns.md',
];

test('catalog lists the curated Matt + Addy + pstack skills and skips competing routers', () => {
  const catalog = loadCatalog(packageRoot());
  const matt = catalog.sources.find((s) => s.id === 'mattpocock');
  const addy = catalog.sources.find((s) => s.id === 'addyosmani');
  const pstack = catalog.sources.find((s) => s.id === 'pstack');
  assert.ok(matt);
  assert.ok(addy);
  assert.ok(pstack);
  assert.equal(matt.repo, 'mattpocock/skills');
  assert.equal(addy.repo, 'addyosmani/agent-skills');
  assert.equal(pstack.repo, 'https://github.com/cursor/plugins/tree/main/pstack');
  assert.deepEqual(matt.skills, MATT);
  assert.deepEqual(addy.skills, ADDY);
  assert.deepEqual(pstack.skills, PSTACK);
  assert.equal(catalog.operatorSkill, 'operator');
  assert.ok(catalog.skip.includes('ask-matt'));
  assert.ok(catalog.skip.includes('using-agent-skills'));
  assert.ok(catalog.skip.includes('poteto-mode'));
  const names = allCatalogSkills(catalog);
  assert.ok(!names.includes('ask-matt'));
  assert.ok(!names.includes('using-agent-skills'));
  assert.ok(!names.includes('poteto-mode'));
  assert.ok(names.includes('unslop'));
  assert.deepEqual(catalog.references.files, REF_FILES);
  assert.deepEqual(managedSkillNames(catalog), [...MATT, ...ADDY, ...PSTACK, 'operator']);
  assert.ok(catalog.agents.length > 0);
  assert.equal(catalog.agents[0].id, 'cursor');
  assert.ok(catalog.agents.some((agent) => agent.id === 'claude-code'));
  assert.ok(catalog.agents.some((agent) => agent.id === 'windsurf'));
  assert.ok(catalog.agents.some((agent) => agent.id === 'openhands'));
});
