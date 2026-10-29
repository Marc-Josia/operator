import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { agentsBlockPath, allCatalogSkills, loadCatalog, operatorSkillDir } from '../lib/catalog.mjs';
import { packageRoot } from './helpers.mjs';

test('operator skill has router frontmatter and arbitration rules', () => {
  const skill = fs.readFileSync(path.join(operatorSkillDir(packageRoot()), 'SKILL.md'), 'utf8');
  assert.ok(skill.replace(/\r\n/g, '\n').startsWith('---\n'));
  assert.ok(skill.includes('name: operator'));
  assert.ok(skill.includes('disable-model-invocation: true'));
  assert.ok(skill.includes('ask-matt'));
  assert.ok(skill.includes('using-agent-skills'));
  assert.ok(skill.includes('poteto-mode'));
  assert.ok(skill.includes('grill-with-docs'));
  assert.ok(skill.includes('security-and-hardening'));
  assert.ok(skill.includes('code-review-and-quality'));
  assert.ok(skill.includes('tdd'));
  assert.ok(skill.includes('unslop'));
  assert.ok(skill.includes('Never Addy'));
  assert.ok(skill.includes('triage'));
  assert.ok(skill.includes('handoff'));
  assert.ok(skill.includes('Take the first true branch'));
  assert.ok(skill.includes('Entry is `implement`'));
  const production = skill.slice(skill.indexOf('### Production'));
  assert.ok(
    production.indexOf('observability-and-instrumentation') <
      production.indexOf('code-review-and-quality'),
  );
});

test('operator skill routes every catalog skill and the GLOSSARY.md rename', () => {
  const skill = fs.readFileSync(path.join(operatorSkillDir(packageRoot()), 'SKILL.md'), 'utf8');
  for (const name of allCatalogSkills(loadCatalog(packageRoot()))) {
    assert.ok(skill.includes(`\`${name}\``), `router does not mention ${name}`);
  }
  assert.ok(skill.includes('GLOSSARY.md'));
  assert.ok(!skill.includes('implement-ledger'));
});

test('operator skill sizes work before the Understand lane and gates Production by trigger', () => {
  const skill = fs.readFileSync(path.join(operatorSkillDir(packageRoot()), 'SKILL.md'), 'utf8');
  const detector = skill.slice(skill.indexOf('## Detector'), skill.indexOf('## Lanes'));
  assert.ok(detector.indexOf('**Small change.**') < detector.indexOf('**Medium change.**'));
  assert.ok(detector.indexOf('**Medium change.**') < detector.indexOf('`grill-with-docs`'));
  for (const gate of ['**Understanding.**', '**Breakdown.**', '**Merge.**']) {
    assert.ok(skill.includes(gate), `missing gate ${gate}`);
  }
  assert.ok(!skill.includes('One phase per pass'));
  const production = skill.slice(skill.indexOf('### Production'), skill.indexOf('### Close'));
  assert.ok(production.includes('| Phase | Trigger |'));
  assert.ok(skill.includes('One review per change'));
});

test('pstack skills route as overlays with Cursor paths mapped to the agent', () => {
  const skill = fs.readFileSync(path.join(operatorSkillDir(packageRoot()), 'SKILL.md'), 'utf8');
  const block = fs.readFileSync(agentsBlockPath(packageRoot()), 'utf8');
  const pstack = loadCatalog(packageRoot()).sources.find((s) => s.id === 'pstack');
  assert.ok(pstack);
  const overlays = skill.slice(skill.indexOf('## Overlays'), skill.indexOf('## Side paths'));
  const sidePaths = skill.slice(skill.indexOf('## Side paths'));
  for (const name of pstack.skills) {
    const where = name === 'maintain-verification-skill' ? sidePaths : skill;
    assert.ok(where.includes(`\`${name}\``), `router does not place ${name}`);
    assert.ok(block.includes(`\`${name}\``), `agents block does not mention ${name}`);
  }
  assert.ok(overlays.includes('`benchmark-checklist` before you report'));
  assert.ok(skill.includes('`.cursor/skills/` path means the skills folder'));
  assert.ok(skill.includes('pstack `tdd`'));
});

test('router and agents block compose with TokenEconomizer without installing it', () => {
  const skill = fs.readFileSync(path.join(operatorSkillDir(packageRoot()), 'SKILL.md'), 'utf8');
  const block = fs.readFileSync(agentsBlockPath(packageRoot()), 'utf8');
  const section = skill.slice(skill.indexOf('## TokenEconomizer'), skill.indexOf('## Side paths'));
  for (const mechanism of ['**Loop guard.**', '**Micro-skills.**', '**Tool pruning.**']) {
    assert.ok(section.includes(mechanism), `router does not cover ${mechanism}`);
  }
  assert.ok(section.includes('Operator does not install it'));
  assert.ok(section.includes('`diagnosing-bugs`'));
  assert.ok(section.includes('`toolprune restore`'));
  assert.ok(block.includes('TokenEconomizer'));
  assert.ok(block.includes('`toolprune restore`'));
  const catalog = loadCatalog(packageRoot());
  assert.ok(!catalog.sources.some((source) => /tokeneconomizer/i.test(source.repo)));
});
