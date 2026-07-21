// "The router never lies" — the constitution's Routing section holds the full
// dispatch tree; the always-loaded agents-block.md gates engagement (default
// off, `/operator` on) and points to it. These tests pin the dispatcher to the
// skills actually shipped in src/payload/skills/: every shipped skill is routed
// in the constitution and listed in the README, every routed name in any router
// surface exists, the block stays within its line budget, and each SKILL.md
// frontmatter name matches its directory.
// Scope guard: this is a router-consistency check, not a general skill linter.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAYLOAD = path.join(REPO_ROOT, 'src', 'payload');

const BLOCK_LINE_BUDGET = 60; // AGENTS.md rule: the block is loaded on every turn

function read(...segments) {
  return fs.readFileSync(path.join(...segments), 'utf8');
}

/** Directory names under src/payload/skills/ that contain a SKILL.md. */
function skillDirs() {
  const root = path.join(PAYLOAD, 'skills');
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
}

/** Whole-word `op-*` / `operator-*` names in a text. Requiring a letter after
 *  the hyphen keeps generic wildcards (`op-*`, `operator-*`) out, and the
 *  hyphen requirement keeps `op.mjs` / `.operator/` out — only real skill-like
 *  names match, so this never fires on prose. */
function routedNames(text) {
  return [...new Set(text.match(/\b(?:op|operator)-[a-z][a-z-]*\b/g) ?? [])].sort();
}

/** The `## Routing` section of the constitution (up to the next `## `). */
function routingSection() {
  const constitution = read(PAYLOAD, 'operator', 'constitution.md');
  const match = constitution.match(/^## Routing\n[\s\S]*?(?=^## )/m);
  assert.ok(match, 'constitution.md has no `## Routing` section');
  return match[0];
}

/** The `**Skills**` paragraph of src/README.md (its structured skill list):
 *  from the line starting `**Skills**` to the next bold-led paragraph. */
function readmeSkillsSection() {
  const readme = read(REPO_ROOT, 'src', 'README.md');
  const match = readme.match(/^\*\*Skills\*\*[\s\S]*?(?=^\*\*[A-Z]|^## )/m);
  assert.ok(
    match,
    'src/README.md has no `**Skills**` paragraph — if the skill list moved or was removed, update router.test.mjs'
  );
  return match[0];
}

test('router coverage: every shipped skill is named in the Routing section and the README', () => {
  // The block no longer enumerates skills (it points to the constitution since
  // ADR-0021); coverage is asserted against the constitution's Routing tree and
  // the README skills list, which remain the authoritative enumerations.
  const routing = routingSection();
  const readmeSkills = readmeSkillsSection();
  for (const name of skillDirs()) {
    const word = new RegExp(`\\b${name}\\b`);
    assert.match(routing, word, `skill ${name} is shipped but the constitution Routing section never routes it`);
    assert.match(readmeSkills, word, `skill ${name} is shipped but the src/README.md Skills list omits it`);
  }
});

test('router ghosts: every routed name corresponds to a shipped skill directory', () => {
  const shipped = new Set(skillDirs());
  const sources = {
    'agents-block.md': read(PAYLOAD, 'agents-block.md'),
    'constitution.md Routing section': routingSection(),
    'src/README.md Skills list': readmeSkillsSection(),
  };
  for (const [label, text] of Object.entries(sources)) {
    for (const name of routedNames(text)) {
      assert.ok(shipped.has(name), `${label} routes ${name}, which is not a shipped skill`);
    }
  }
});

test(`agents-block.md stays within its ${BLOCK_LINE_BUDGET}-line budget`, () => {
  const lines = read(PAYLOAD, 'agents-block.md').trimEnd().split('\n').length;
  assert.ok(
    lines <= BLOCK_LINE_BUDGET,
    `agents-block.md is ${lines} lines (budget ${BLOCK_LINE_BUDGET}) — move detail to constitution.md`
  );
});

test('each SKILL.md frontmatter name matches its directory', () => {
  for (const dir of skillDirs()) {
    const skill = read(PAYLOAD, 'skills', dir, 'SKILL.md');
    const name = skill.match(/^---\n[\s\S]*?^name:[ \t]*(\S+)[ \t]*$/m)?.[1];
    assert.equal(name, dir, `skills/${dir}/SKILL.md frontmatter name is ${name ?? '(missing)'}`);
  }
});
