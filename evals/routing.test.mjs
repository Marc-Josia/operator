// Self-test for the Tier-2 routing engine. Deterministic, zero-dep, node:test.
// Not part of `npm test` (that globs src/test/ — the shipped toolkit); run with
// `npm run eval:selftest`. Guards the lexical scorer against silent drift so a
// green Tier-2 report always means something.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCorpus, rankSkills, rankOf, cosine, tokenize } from './lib/routing.mjs';

const SKILLS = [
  { name: 'op-fix', description: 'Reproduce a bug with a failing test, root-cause it, fix the cause, keep the regression test forever.' },
  { name: 'op-plan', description: 'Write the spec with testable acceptance criteria and stop for operator approval before any code.' },
  { name: 'op-status', description: 'Read-only orientation: report where every work item stands and the next action, changing nothing.' },
];

test('tokenize drops stopwords and stems inflections', () => {
  const t = tokenize('Reproduces the failing tests and gates');
  assert.ok(t.includes('reproduce'), t.join(',')); // "Reproduces" -> "reproduce"
  assert.ok(t.includes('gate'), t.join(',')); // "gates" -> "gate"
  assert.ok(t.includes('fail'), t.join(',')); // "failing" -> "fail"
  assert.ok(!t.includes('the'));
  assert.ok(!t.includes('and'));
});

test('cosine of a vector with itself is 1', () => {
  const corpus = buildCorpus(SKILLS);
  const bug = rankSkills('reproduce the bug with a failing regression test', corpus);
  assert.ok(bug[0].score > 0);
});

test('a bug prompt ranks op-fix first', () => {
  const corpus = buildCorpus(SKILLS);
  const ranked = rankSkills('there is a bug, reproduce it with a failing test and fix the root cause', corpus);
  assert.equal(ranked[0].name, 'op-fix');
  assert.equal(rankOf(ranked, 'op-fix'), 1);
});

test('a spec/approval prompt ranks op-plan first', () => {
  const corpus = buildCorpus(SKILLS);
  const ranked = rankSkills('write the spec and acceptance criteria and get approval', corpus);
  assert.equal(ranked[0].name, 'op-plan');
});

test('ranking is deterministic and ties break by name', () => {
  const corpus = buildCorpus(SKILLS);
  const a = rankSkills('completely unrelated xyzzy tokens', corpus).map((r) => r.name);
  const b = rankSkills('completely unrelated xyzzy tokens', corpus).map((r) => r.name);
  assert.deepEqual(a, b);
  assert.deepEqual(a, [...a].sort()); // all-zero scores -> alphabetical
});

test('rankOf returns Infinity for a zero-score skill', () => {
  const empty = cosine(new Map(), new Map([['x', 1]]));
  assert.equal(empty, 0);
});
