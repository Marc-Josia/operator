import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadCatalog,
  allCatalogSkills,
  managedSkillNames,
  ownSkillNames,
  legacySkillNames,
} from '../lib/catalog.mjs';
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
  'implement-spec',
  'code-review',
  'pr',
  'codebase-design',
  'improve-codebase-architecture',
  'diagnosing-bugs',
  'retro',
  'prototype',
  'wayfinder',
  'triage',
  'handoff',
  'research',
  'writing-for-agents',
  'wizard',
];

const ADDY = [
  'constraint-driven-development',
  'security-and-hardening',
  'code-review-and-quality',
  'deprecation-and-migration',
  'observability-and-instrumentation',
  'ci-cd-and-automation',
  'shipping-and-launch',
  'performance-optimization',
];

const OWN = [
  'grill',
  'spec',
  'tickets',
  'prototype',
  'wayfinder',
  'constraints',
  'implement',
  'review',
  'architecture',
  'debug',
  'security',
  'observability',
  'ci',
  'migration',
  'ship',
  'performance',
  'retro',
  'pr',
  'handoff',
  'writing-for-agents',
];

const PSTACK = [
  'unslop',
  'correct',
  'blast-radius',
  'benchmark-checklist',
  'create-verification-skill',
  'maintain-verification-skill',
  'principle-prove-it-works',
  'principle-fix-root-causes',
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

test('catalog lists own skills, pstack as the only source, and legacy names for removal', () => {
  const catalog = loadCatalog(packageRoot());
  assert.deepEqual(ownSkillNames(catalog), OWN);
  assert.equal(catalog.sources.length, 1);
  const [pstack] = catalog.sources;
  assert.equal(pstack.id, 'pstack');
  assert.equal(pstack.repo, 'https://github.com/cursor/plugins/tree/main/pstack');
  assert.deepEqual(pstack.skills, PSTACK);
  assert.ok(!pstack.skills.includes('tdd'), 'pstack tdd would clash with implement');
  assert.deepEqual(legacySkillNames(catalog), [...MATT, ...ADDY, 'operator']);
  assert.equal(new Set(OWN).size, OWN.length);
  for (const name of PSTACK) {
    assert.ok(!OWN.includes(name), `${name} is both own and pstack`);
    assert.ok(!legacySkillNames(catalog).includes(name), `${name} is both pstack and legacy`);
  }
  assert.equal(catalog.operatorSkill, 'operator');
  assert.ok(catalog.skip.includes('ask-matt'));
  assert.ok(catalog.skip.includes('using-agent-skills'));
  assert.ok(catalog.skip.includes('poteto-mode'));
  const names = allCatalogSkills(catalog);
  assert.deepEqual(names, PSTACK);
  assert.deepEqual(catalog.references.files, REF_FILES);
  assert.deepEqual(managedSkillNames(catalog), [...PSTACK, 'operator']);
  assert.ok(catalog.agents.length > 0);
  assert.equal(catalog.agents[0].id, 'cursor');
  assert.ok(catalog.agents.some((agent) => agent.id === 'claude-code'));
  assert.ok(catalog.agents.some((agent) => agent.id === 'windsurf'));
  assert.ok(catalog.agents.some((agent) => agent.id === 'openhands'));
});
