// Communication profile region — op-init writes a SECOND managed region into
// AGENTS.md (language / verbosity / operator expertise). These tests pin two
// things: the region's markers never collide with the router block's, so update
// preserves one while replacing the other; and op-init actually offers the three
// tuning dimensions with the exact markers remove strips.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PROFILE_BEGIN,
  PROFILE_END,
  findMarkerBlock,
  findProfileRegion,
  removeMarkerBlock,
  removeProfileRegion,
  renderMarkerBlock,
} from '../lib/fsutil.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function sample() {
  const block = renderMarkerBlock('9.9.9', 'ROUTER BODY');
  const profile = `${PROFILE_BEGIN}\n## Operator — communication profile\n- Language: French\n${PROFILE_END}`;
  return `${block}\n\n${profile}\n\n# My project\n\nMy own notes.\n`;
}

test('the two managed regions are located independently, no marker collision', () => {
  const content = sample();
  assert.match(findMarkerBlock(content).inner, /ROUTER BODY/, 'block region found');
  assert.match(findProfileRegion(content).inner, /communication profile/, 'profile region found');
  // The block regex must not swallow the profile markers, and vice-versa.
  assert.doesNotMatch(findMarkerBlock(content).inner, /operator:profile/, 'block must not include the profile markers');
});

test('removeProfileRegion strips only the profile, keeping block and user content', () => {
  const content = sample();
  const stripped = removeProfileRegion(content);
  assert.match(stripped, /ROUTER BODY/, 'router block survives');
  assert.match(stripped, /My own notes/, 'user content survives');
  assert.doesNotMatch(stripped, /operator:profile/, 'profile markers gone');
  assert.doesNotMatch(stripped, /communication profile/, 'profile body gone');
});

test('removing both regions leaves only the user content (clean uninstall)', () => {
  const bare = removeProfileRegion(removeMarkerBlock(sample()));
  assert.match(bare, /My own notes/);
  assert.doesNotMatch(bare, /ROUTER BODY/);
  assert.doesNotMatch(bare, /operator:(begin|end|profile)/);
});

test('op-init offers language, verbosity, and expertise with the exact profile markers', () => {
  const skill = fs.readFileSync(path.join(REPO_ROOT, 'src', 'payload', 'skills', 'op-init', 'SKILL.md'), 'utf8');
  for (const dim of [/language/i, /verbosity/i, /expertise/i, /novice/i, /expert/i]) {
    assert.match(skill, dim, `op-init must cover ${dim}`);
  }
  assert.ok(skill.includes(PROFILE_BEGIN) && skill.includes(PROFILE_END), 'op-init must document the exact profile markers');
});
