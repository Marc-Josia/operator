#!/usr/bin/env node
// op.mjs — Operator runtime gate checker. Standalone, zero dependencies, Node >= 18.
//
// Installed at `.operator/bin/op.mjs` in a user project. It resolves gates.json,
// config.json and work items relative to its OWN location (import.meta.url), never
// from the process cwd, so it behaves the same run from anywhere. It intentionally
// depends on nothing outside this single file — the installer copies it verbatim.
//
// Subcommands:
//   status                        list work items + the active item's next action
//   gate <id>                     verify the current stage's checks; on pass, advance
//   escalate <id>                 one-way lane raise (quick -> standard)
//
// Exit codes: 0 success, 1 a gate failed, 2 malformed input / precondition error.
// Gates are checked, not asserted: on pass this tool appends the journal line and
// advances the stage itself; on fail it prints every failing check with its fix and
// changes nothing.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OPERATOR_DIR = path.resolve(HERE, '..'); // .operator/
const PROJECT_ROOT = path.resolve(OPERATOR_DIR, '..'); // the user project root
const WORK_DIR = path.join(OPERATOR_DIR, 'work');

const LANE_RANK = { quick: 0, standard: 1 };

// Tokens that never count as "filled" content in a template section. `{{...}}` is
// removed separately by regex; the rest are matched as whole trimmed tokens.
const PLACEHOLDERS = new Set([
  'yes/no',
  'tbd',
  '...',
  '…', // …
  '_not yet surveyed_',
  '_not yet surveyed._',
  '_none recorded yet._',
]);

// ---------------------------------------------------------------------------
// Output & exit
// ---------------------------------------------------------------------------

const log = (...a) => console.log(...a);
const warn = (m) => console.error(`warning: ${m}`);
function die(msg, code = 2) {
  console.error(`error: ${msg}`);
  process.exit(code);
}

// ---------------------------------------------------------------------------
// Text helpers (frontmatter, sections, journal) — strict, no YAML library
// ---------------------------------------------------------------------------

/** Strict flat `key: value` frontmatter between `---` fences. `{ data, error }`;
 *  `data` is null when malformed. Key order is preserved (object insertion order). */
function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { data: null, error: 'missing opening --- fence' };
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') return { data, error: null };
    if (!line.trim()) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) return { data: null, error: `malformed line ${i + 1}: "${line}"` };
    data[m[1]] = m[2].trim();
  }
  return { data: null, error: 'missing closing --- fence' };
}

function stripComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Body of a `## <heading>` section up to the next `## ` heading or EOF; null if absent. */
function sectionBody(content, heading) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+${esc}\\s*$`, 'm');
  const m = content.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = content.slice(start);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

/** All `## ` sections of a document as `{ title, body }`, in order. */
function sections(content) {
  const re = /^##\s+(.+?)\s*$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(content))) heads.push({ title: m[1].trim(), index: m.index, after: re.lastIndex });
  const out = [];
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].after;
    const end = i + 1 < heads.length ? heads[i + 1].index : content.length;
    out.push({ title: heads[i].title, body: content.slice(start, end) });
  }
  return out;
}

/** The `- ` event lines of the Journal section (oldest first). */
function journalLines(content) {
  const body = sectionBody(content, 'Journal') ?? '';
  return body.split(/\r?\n/).filter((l) => l.startsWith('- '));
}

function journalGrep(content, sub) {
  return journalLines(content).some((l) => l.includes(sub));
}

/** Meaningful (non-placeholder) text of a section body: strips comments,
 *  `{{...}}` placeholders, table separators, list/checkbox markers and the
 *  documented placeholder tokens. Empty string means "not filled". */
function meaningfulText(body) {
  const s = stripComments(body).replace(/\{\{[^}]*\}\}/g, ' ');
  const kept = [];
  for (const line of s.split(/\r?\n/)) {
    if (/^[\s|:_-]+$/.test(line)) continue; // blank line or table separator row
    const cells = line.includes('|') ? line.split('|') : [line];
    for (let cell of cells) {
      let c = cell.trim();
      if (!c) continue;
      c = c
        .replace(/^[-*]\s+\[[ xX]\]\s*/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim();
      if (!c) continue;
      if (PLACEHOLDERS.has(c.toLowerCase())) continue;
      kept.push(c);
    }
  }
  return kept.join(' ').trim();
}

function sectionFilled(content, heading) {
  const b = sectionBody(content, heading);
  return b !== null && meaningfulText(b) !== '';
}

function sectionHasTBD(content, heading) {
  const b = sectionBody(content, heading) ?? '';
  return /\bTBD\b/i.test(stripComments(b));
}

/** Checkbox states of a section: array of booleans (true = checked). */
function checkboxes(content, heading) {
  const body = sectionBody(content, heading) ?? '';
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]/);
    if (m) out.push(m[1].toLowerCase() === 'x');
  }
  return out;
}

/** Rows of the Triage table as `{ question, answer }` (answer lowercased). */
function triageAnswers(content) {
  const body = sectionBody(content, 'Triage') ?? '';
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const parts = t.split('|').map((c) => c.trim());
    const question = parts[1] ?? '';
    const answer = (parts[2] ?? '').toLowerCase();
    if (!question) continue;
    if (/^:?-+:?$/.test(question)) continue; // separator row
    if (question.toLowerCase() === 'question') continue; // header row
    rows.push({ question, answer });
  }
  return rows;
}

/** Lane implied by the triage answers (the template's lane rule): any yes -> standard. */
function expectedLane(rows) {
  const yes = rows.filter((r) => r.answer === 'yes').length;
  return yes === 0 ? 'quick' : 'standard';
}

/** Numbered acceptance criteria of a spec doc (placeholder-only entries excluded). */
function acceptanceCriteria(spec) {
  const sec = sections(spec).find((s) => /^acceptance criteria$/i.test(s.title));
  if (!sec) return [];
  const out = [];
  for (const line of sec.body.split(/\r?\n/)) {
    const m = line.match(/^\s*\d+\.\s+(.*)$/);
    if (!m) continue;
    const c = m[1].trim();
    if (c && !PLACEHOLDERS.has(c.toLowerCase())) out.push(c);
  }
  return out;
}

/** Declared Scope paths (one per line, bullet/backtick markers stripped). */
function scopePaths(content) {
  const body = stripComments(sectionBody(content, 'Scope') ?? '');
  const out = [];
  for (let line of body.split(/\r?\n/)) {
    line = line.trim().replace(/^[-*]\s+/, '').replace(/^`+|`+$/g, '').trim();
    if (line) out.push(line);
  }
  return out;
}

function lineCount(text) {
  if (!text) return 0;
  return text.replace(/\n$/, '').split('\n').length;
}

// ---------------------------------------------------------------------------
// Minimal glob (posix paths). Subset: `**`, `*`, `?`. No braces/classes/negation.
// ---------------------------------------------------------------------------

function globToRegExp(pattern) {
  const pat = String(pattern).split(path.sep).join('/');
  let re = '';
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c === '*') {
      if (pat[i + 1] === '*') {
        const prevBoundary = i === 0 || pat[i - 1] === '/';
        const nextSlash = pat[i + 2] === '/';
        if (prevBoundary && nextSlash) {
          re += '(?:[^/]+/)*'; // `**/` — zero or more whole segments
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp('^' + re + '$');
}

function matchesAnyGlob(p, patterns) {
  return patterns.some((pat) => globToRegExp(pat).test(p));
}

/** A measured-diff path is within Scope if it matches any declared entry as an
 *  exact path, a directory prefix, or a glob. */
function matchesScope(filePath, scope) {
  for (let s of scope) {
    s = s.replace(/\/+$/, '');
    if (!s) continue;
    if (filePath === s) return true;
    if (filePath.startsWith(s + '/')) return true;
    if (globToRegExp(s).test(filePath)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Git & diff measurement
// ---------------------------------------------------------------------------

function git(args) {
  return spawnSync('git', args, { cwd: PROJECT_ROOT, encoding: 'utf8' });
}

function gitResolvable(sha) {
  if (!sha) return false;
  const r = git(['rev-parse', '--verify', '--quiet', `${sha}^{commit}`]);
  return r.status === 0 && (r.stdout || '').trim() !== '';
}

function short(sha) {
  return String(sha).slice(0, 7);
}

/** numstat of `git diff <args>` as `{ path: { adds, dels } }`. Binary = 0/0. */
function numstatMap(args) {
  const r = git(['diff', '--numstat', ...args]);
  const map = {};
  if (!r.stdout) return map;
  for (const line of r.stdout.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const a = parts[0];
    const d = parts[1];
    const p = normalizeRename(parts.slice(2).join('\t'));
    map[p] = { adds: a === '-' ? 0 : parseInt(a, 10) || 0, dels: d === '-' ? 0 : parseInt(d, 10) || 0 };
  }
  return map;
}

/** numstat renders renames as `a => b` or `pre/{a => b}/post`; keep the new path. */
function normalizeRename(p) {
  if (p.includes('=>')) {
    p = p.replace(/\{[^}]*=>\s*([^}]*)\}/, '$1').replace(/\/{2,}/g, '/');
    if (p.includes('=>')) p = p.split('=>').pop();
  }
  return p.trim();
}

/** Untracked (not ignored) files via porcelain, NUL-delimited for safety. */
function untrackedList() {
  const r = git(['status', '--porcelain', '-z', '-uall']);
  const out = [];
  if (!r.stdout) return out;
  for (const entry of r.stdout.split('\0')) {
    if (entry.startsWith('?? ')) out.push(entry.slice(3));
  }
  return out;
}

function fileLineCount(rel) {
  try {
    const c = fs.readFileSync(path.join(PROJECT_ROOT, rel));
    if (!c.length) return 0;
    return lineCount(c.toString('utf8'));
  } catch {
    return 0;
  }
}

/** Directory prefixes excluded from the measured diff: `.operator/` always, plus
 *  the directory holding the item's external spec artifact (spec-kit and OpenSpec
 *  author sibling documents there; that authoring is spec-stage work, not build diff). */
function diffExcludes(data) {
  const excludes = ['.operator'];
  const spec = String(data.spec || '').trim().replace(/^\.\//, '');
  if (spec && !spec.startsWith('.operator/')) {
    const dir = spec.includes('/') ? spec.slice(0, spec.lastIndexOf('/')) : null;
    if (dir) excludes.push(dir);
  }
  return excludes;
}

/** The change surface since `base`: distinct files + total changed lines,
 *  excluding the `excludes` directory prefixes (default `.operator/**`).
 *  Unresolvable base falls back to uncommitted-only. */
function measureDiff(base, excludes = ['.operator']) {
  const map = {};
  let warning = null;
  const merge = (src) => {
    for (const [k, v] of Object.entries(src)) if (!(k in map)) map[k] = v;
  };
  if (gitResolvable(base)) {
    merge(numstatMap([base, '--', '.']));
    merge(numstatMap(['--cached']));
  } else {
    warning = `base '${base || '(unset)'}' is not a resolvable commit — falling back to uncommitted changes only`;
    if (gitResolvable('HEAD')) merge(numstatMap(['HEAD', '--', '.']));
    else {
      merge(numstatMap(['--cached']));
      merge(numstatMap([]));
    }
  }
  for (const rel of untrackedList()) {
    if (!(rel in map)) map[rel] = { adds: fileLineCount(rel), dels: 0 };
  }
  const files = [];
  let changedLines = 0;
  for (const [p, v] of Object.entries(map)) {
    if (excludes.some((ex) => p === ex || p.startsWith(ex + '/'))) continue;
    files.push(p);
    changedLines += v.adds + v.dels;
  }
  files.sort();
  return { files, changedLines, warning };
}

function runTestCommand(cmd) {
  return process.platform === 'win32'
    ? spawnSync('cmd', ['/c', cmd], { cwd: PROJECT_ROOT, encoding: 'utf8' })
    : spawnSync('sh', ['-c', cmd], { cwd: PROJECT_ROOT, encoding: 'utf8' });
}

// ---------------------------------------------------------------------------
// Checks — each returns { pass, evidence?, fix? }. Implements every id in
// gates.json exactly as its checkDescription states.
// ---------------------------------------------------------------------------

function chkWorkitemSections(ctx) {
  const need = ['Problem', 'Triage', 'Scope', 'Tasks'];
  const missing = need.filter((h) => !sectionFilled(ctx.content, h));
  const tbd = ['Problem', 'Scope'].filter((h) => sectionHasTBD(ctx.content, h));
  if (missing.length || tbd.length) {
    const parts = [];
    if (missing.length) parts.push(`fill the ${missing.join(', ')} section${missing.length > 1 ? 's' : ''}`);
    if (tbd.length) parts.push(`remove TBD from ${tbd.join(', ')}`);
    return { pass: false, fix: `in workitem.md: ${parts.join('; ')}` };
  }
  return { pass: true, evidence: 'Problem, Triage, Scope, Tasks filled; no TBD in Problem/Scope' };
}

function chkTriage(ctx) {
  const rows = triageAnswers(ctx.content);
  if (!rows.length) return { pass: false, fix: 'fill the Triage table with a yes/no answer on every row' };
  const bad = rows.filter((r) => r.answer !== 'yes' && r.answer !== 'no');
  if (bad.length) {
    return { pass: false, fix: `answer yes or no on every Triage row (unanswered: ${bad.map((b) => b.question).join('; ')})` };
  }
  const exp = expectedLane(rows);
  if (LANE_RANK[ctx.lane] < LANE_RANK[exp]) {
    return {
      pass: false,
      fix: `triage implies at least the ${exp} lane but this item is ${ctx.lane}; re-answer the scorecard or escalate: node .operator/bin/op.mjs escalate ${ctx.id} --to ${exp}`,
    };
  }
  const yes = rows.filter((r) => r.answer === 'yes').length;
  return { pass: true, evidence: `${yes} yes → ${ctx.lane} lane consistent (rule floor: ${exp})` };
}

function chkBase(ctx) {
  if (ctx.data.base && gitResolvable(ctx.data.base)) {
    return { pass: true, evidence: `base ${short(ctx.data.base)} resolves` };
  }
  return { pass: false, fix: 'record a resolvable base sha in frontmatter (`git rev-parse HEAD` at intake)' };
}

function chkProtectedLane(ctx) {
  const patterns = ctx.config.protectedPaths || [];
  const hits = [];
  for (const p of scopePaths(ctx.content)) if (matchesAnyGlob(p, patterns)) hits.push(`scope:${p}`);
  for (const p of ctx.getDiff().files) if (matchesAnyGlob(p, patterns)) hits.push(`diff:${p}`);
  if (hits.length) {
    return {
      pass: false,
      fix: `quick lane cannot touch protected paths (${hits.join(', ')}); escalate: node .operator/bin/op.mjs escalate ${ctx.id} --to standard`,
    };
  }
  return { pass: true, evidence: 'no protected paths in scope or diff' };
}

/** Spec tools detected in the project by their filesystem markers. */
function detectSpecTools() {
  const tools = [];
  if (fs.existsSync(path.join(PROJECT_ROOT, '.specify'))) tools.push('spec-kit (.specify/)');
  if (fs.existsSync(path.join(PROJECT_ROOT, 'openspec'))) tools.push('OpenSpec (openspec/)');
  return tools;
}

/** The spec gate is provider-aware: frontmatter `spec:` names the artifact.
 *  An Operator-template spec (inside the work item directory) is held to the
 *  template contract — sections filled, no TBD, numbered acceptance criteria.
 *  An external artifact (spec-kit, OpenSpec, hand-written) must exist and be
 *  non-empty; its structure is the external tool's contract, not ours. */
function chkSpecArtifact(ctx) {
  const rel = String(ctx.data.spec || '').trim().replace(/^\.\//, '');
  if (!rel) {
    const tools = detectSpecTools();
    const hint = tools.length
      ? `author it with ${tools.join(' or ')} and point \`spec:\` at the artifact`
      : `author .operator/work/${ctx.id}/spec.md from .operator/templates/spec.md`;
    return { pass: false, fix: `frontmatter \`spec:\` is empty — ${hint} (path from the project root)` };
  }
  const abs = path.resolve(PROJECT_ROOT, rel);
  if (!abs.startsWith(PROJECT_ROOT + path.sep)) {
    return { pass: false, fix: `spec: '${rel}' resolves outside the project — use a path relative to the project root` };
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return { pass: false, fix: `spec: points at '${rel}', which does not exist — author the spec document (op-plan) or fix the path` };
  }
  const spec = fs.readFileSync(abs, 'utf8');
  const internal = abs.startsWith(ctx.itemDir + path.sep);
  if (!internal) {
    if (meaningfulText(stripComments(spec)) === '') {
      return { pass: false, fix: `spec artifact '${rel}' is empty — fill it via its own tool before requesting approval` };
    }
    return { pass: true, evidence: `external spec artifact ${rel} present (${lineCount(spec)} lines)` };
  }
  const secs = sections(spec);
  if (!secs.length) return { pass: false, fix: `${rel} has no sections; write it from .operator/templates/spec.md` };
  const empty = secs.filter((s) => meaningfulText(s.body) === '').map((s) => s.title);
  const tbd = secs.filter((s) => /\bTBD\b/i.test(stripComments(s.body))).map((s) => s.title);
  if (empty.length || tbd.length) {
    const parts = [];
    if (empty.length) parts.push(`fill ${empty.join(', ')}`);
    if (tbd.length) parts.push(`remove TBD from ${tbd.join(', ')}`);
    return { pass: false, fix: `in ${rel}: ${parts.join('; ')}` };
  }
  const ac = acceptanceCriteria(spec);
  if (!ac.length) return { pass: false, fix: `add at least one numbered, testable entry under Acceptance criteria in ${rel}` };
  return { pass: true, evidence: `${rel}: all ${secs.length} sections filled, ${ac.length} acceptance criteria` };
}

function chkApproval(ctx) {
  for (const l of journalLines(ctx.content)) {
    const m = l.match(/APPROVAL plan granted by operator:\s*"([^"]*)"/);
    if (m && m[1].trim() !== '') return { pass: true, evidence: 'operator approval journaled' };
  }
  return {
    pass: false,
    fix: 'get the operator to approve the plan, then journal: `- <date> APPROVAL plan granted by operator: "<their words>"`',
  };
}

function chkAllChecked(heading, label) {
  return (ctx) => {
    const boxes = checkboxes(ctx.content, heading);
    if (!boxes.length) return { pass: false, fix: `add at least one ${label} as a checkbox in the ${heading} section` };
    const open = boxes.filter((b) => !b).length;
    if (open) return { pass: false, fix: `check off every item in the ${heading} section (${open} still unchecked)` };
    return { pass: true, evidence: `all ${boxes.length} ${heading} items checked` };
  };
}

function chkTests(ctx) {
  const cmd = ctx.config.testCommand;
  if (cmd === null || cmd === undefined) {
    return { pass: false, fix: 'configure .operator/config.json testCommand (the test command that must pass), then re-run' };
  }
  if (cmd === false) {
    if (journalGrep(ctx.content, 'WAIVER tests')) return { pass: true, evidence: 'tests waived (WAIVER tests journaled)' };
    return {
      pass: false,
      fix: 'tests are waived in config; journal `- <date> WAIVER tests <operator reason>` — or set a real testCommand',
    };
  }
  const r = runTestCommand(String(cmd));
  if (r.status === 0) return { pass: true, evidence: `\`${cmd}\` exited 0` };
  const code = r.status === null ? `signal ${r.signal || '?'}` : r.status;
  return { pass: false, fix: `\`${cmd}\` must exit 0 (it exited ${code}); fix the failing tests and re-run` };
}

function chkLaneCaps(ctx) {
  const caps = (ctx.config.lanes && ctx.config.lanes[ctx.lane]) || {};
  const diff = ctx.getDiff();
  const problems = [];
  if (caps.maxFiles != null && diff.files.length > caps.maxFiles) problems.push(`${diff.files.length} files > ${caps.maxFiles}`);
  if (caps.maxChangedLines != null && diff.changedLines > caps.maxChangedLines) {
    problems.push(`${diff.changedLines} changed lines > ${caps.maxChangedLines}`);
  }
  if (problems.length) {
    return {
      pass: false,
      fix: `${ctx.lane} lane cap exceeded (${problems.join('; ')}); escalate: node .operator/bin/op.mjs escalate ${ctx.id} --to standard`,
    };
  }
  return { pass: true, evidence: `${diff.files.length} files / ${diff.changedLines} changed lines within ${ctx.lane} caps` };
}

function chkScope(ctx) {
  const scope = scopePaths(ctx.content);
  const diff = ctx.getDiff();
  const outside = diff.files.filter((f) => !matchesScope(f, scope));
  if (outside.length) {
    return {
      pass: false,
      fix: `the diff touches paths outside Scope: ${outside.join(', ')} — add them to the workitem Scope (and escalate if this widens the work)`,
    };
  }
  return { pass: true, evidence: `all ${diff.files.length} changed files within declared Scope` };
}

function chkSelfReview(ctx) {
  if (journalGrep(ctx.content, 'REVIEW self')) return { pass: true, evidence: 'self-review journaled' };
  return { pass: false, fix: 'self-review the diff and journal: `- <date> REVIEW self — <findings summary>`' };
}

function chkReview(ctx) {
  if (journalLines(ctx.content).some((l) => /\bREVIEW\b/.test(l))) return { pass: true, evidence: 'review journaled' };
  return { pass: false, fix: 'run the review and journal a `REVIEW` line (reviewer context, findings count, resolution)' };
}

function chkSecReview(ctx) {
  const touched = ctx.getDiff().files.filter((f) => matchesAnyGlob(f, ctx.config.protectedPaths || []));
  if (!touched.length) return { pass: true, evidence: 'no protected paths in diff' };
  if (journalGrep(ctx.content, 'REVIEW security')) {
    return { pass: true, evidence: `security review journaled (protected: ${touched.join(', ')})` };
  }
  return {
    pass: false,
    fix: `the diff touches protected paths (${touched.join(', ')}); run a security review and journal: \`- <date> REVIEW security — <findings>\``,
  };
}

function chkDocs(ctx) {
  if (journalGrep(ctx.content, 'DOCS updated:') || journalGrep(ctx.content, 'DOCS no-impact:')) {
    return { pass: true, evidence: 'docs status journaled' };
  }
  return { pass: false, fix: 'journal `- <date> DOCS updated: <what>` or `- <date> DOCS no-impact: <reason>`' };
}

function chkHarvest(ctx) {
  if (journalGrep(ctx.content, 'MEMORY harvested:') || journalGrep(ctx.content, 'MEMORY none:')) {
    return { pass: true, evidence: 'memory harvest journaled' };
  }
  return {
    pass: false,
    fix: 'harvest at most 3 durable items and journal `- <date> MEMORY harvested: <items>` or `- <date> MEMORY none: <reason>`',
  };
}

function chkMemCaps(ctx) {
  const caps = ctx.config.memoryCaps || {};
  const files = { project: 'project.md', conventions: 'conventions.md', lessons: 'lessons.md' };
  const over = [];
  for (const [key, name] of Object.entries(files)) {
    const cap = caps[key];
    if (cap == null) continue;
    const f = path.join(OPERATOR_DIR, 'memory', name);
    if (!fs.existsSync(f)) continue;
    const n = lineCount(fs.readFileSync(f, 'utf8'));
    if (n > cap) over.push(`${name} (${n} > ${cap})`);
  }
  if (over.length) return { pass: false, fix: `trim memory over cap: ${over.join(', ')} (consolidate/gc via op-memory)` };
  return { pass: true, evidence: 'memory files within caps' };
}

function chkRetro(ctx) {
  if (!sectionFilled(ctx.content, 'Retro')) return { pass: false, fix: 'fill the Retro section of workitem.md (what worked, what to improve)' };
  if (sectionHasTBD(ctx.content, 'Retro')) return { pass: false, fix: 'remove TBD from the Retro section' };
  return { pass: true, evidence: 'retro filled' };
}

function chkThrashing(ctx) {
  const threshold = ctx.config.postmortemThreshold ?? 3;
  if (!(threshold > 0)) return { pass: true, evidence: 'postmortem threshold disabled' };
  // Count ATTEMPT lines recorded since the last POSTMORTEM (a postmortem resets the counter).
  let attempts = 0;
  for (const l of journalLines(ctx.content)) {
    if (/\bPOSTMORTEM\b/.test(l)) attempts = 0;
    else if (/\bATTEMPT\b/.test(l)) attempts += 1;
  }
  if (attempts >= threshold) {
    return {
      pass: false,
      fix: `${attempts} failed ATTEMPT(s) on this item without a postmortem — stop re-trying: copy .operator/templates/postmortem.md to .operator/work/${ctx.id}/postmortem-<NNN>.md, fill it, journal \`- <date> POSTMORTEM <file>: <one line>\`, then escalate or ask the operator`,
    };
  }
  return {
    pass: true,
    evidence: attempts ? `${attempts} attempt(s) since last postmortem, under threshold ${threshold}` : 'no thrashing',
  };
}

const CHECKS = {
  'workitem-sections': chkWorkitemSections,
  'triage-scorecard': chkTriage,
  'base-recorded': chkBase,
  'protected-paths-lane': chkProtectedLane,
  'spec-artifact': chkSpecArtifact,
  'operator-approval': chkApproval,
  'tasks-complete': chkAllChecked('Tasks', 'task'),
  'postmortem-if-thrashing': chkThrashing,
  'tests-pass': chkTests,
  'diff-within-lane-caps': chkLaneCaps,
  'diff-within-scope': chkScope,
  'self-review-evidence': chkSelfReview,
  'review-evidence': chkReview,
  'security-review-if-protected': chkSecReview,
  'dod-complete': chkAllChecked('Definition of done', 'item'),
  'docs-updated-or-waived': chkDocs,
  'memory-harvest': chkHarvest,
  'memory-caps': chkMemCaps,
  'retro-filled': chkRetro,
};

// ---------------------------------------------------------------------------
// Work-item load & rewrite
// ---------------------------------------------------------------------------

function loadJson(f) {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    die(`cannot read ${path.relative(PROJECT_ROOT, f)}: ${e.message}`);
  }
}

function loadWorkitem(id) {
  if (!id) die('usage: op.mjs gate <id>');
  const itemDir = path.join(WORK_DIR, id);
  const wi = path.join(itemDir, 'workitem.md');
  if (!fs.existsSync(wi)) die(`work item '${id}' not found (looked for ${path.relative(PROJECT_ROOT, wi)})`);
  const content = fs.readFileSync(wi, 'utf8');
  const { data, error } = parseFrontmatter(content);
  if (error) die(`workitem.md frontmatter is malformed: ${error}. Fix the --- fenced key: value block.`, 2);
  return { content, data, itemDir };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Append a journal line at the end of the Journal section, preserving order. */
function appendJournal(content, line) {
  const m = content.match(/^##\s+Journal\s*$/m);
  if (!m) return content.replace(/\s*$/, '') + `\n\n## Journal\n\n${line}\n`;
  const start = m.index + m[0].length;
  const rest = content.slice(start);
  const nextRel = rest.search(/^##\s+/m);
  const end = nextRel === -1 ? content.length : start + nextRel;
  const section = content.slice(start, end).replace(/\s+$/, '');
  return content.slice(0, start) + section + '\n' + line + '\n\n' + content.slice(end);
}

/** Rewrite the frontmatter with `updates`, preserving key order (unknown keys kept). */
function rewriteFrontmatter(content, updates) {
  const { data, error } = parseFrontmatter(content);
  if (error) die(`cannot rewrite frontmatter: ${error}`, 2);
  for (const [k, v] of Object.entries(updates)) data[k] = v;
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  const fm = '---\n' + Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n---';
  return fm + body;
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

function runGate(id) {
  const { content, data, itemDir } = loadWorkitem(id);
  const config = loadJson(path.join(OPERATOR_DIR, 'config.json'));
  const gates = loadJson(path.join(OPERATOR_DIR, 'gates.json'));
  const stage = data.stage;
  const lane = data.lane;
  if (!lane || !(lane in LANE_RANK)) die(`work item ${id} has an invalid lane '${lane}'`);
  if (stage === 'done') {
    log(`Work item ${id} is already done — no gate to run.`);
    process.exit(0);
  }
  const gate = gates.gates[stage];
  if (!gate) die(`work item ${id} is at stage '${stage}', which has no gate`);
  const checkIds = gate.checks[lane];
  if (!checkIds) die(`stage '${stage}' has no checks for the ${lane} lane`);

  let diffCache = null;
  const ctx = {
    content,
    data,
    config,
    gates,
    lane,
    stage,
    itemDir,
    id,
    getDiff() {
      if (!diffCache) {
        diffCache = measureDiff(data.base, diffExcludes(data));
        if (diffCache.warning) warn(diffCache.warning);
      }
      return diffCache;
    },
  };

  const results = checkIds.map((cid) => ({
    id: cid,
    ...(CHECKS[cid] ? CHECKS[cid](ctx) : { pass: false, fix: `unknown check '${cid}' (gates.json/checker mismatch)` }),
  }));
  const failed = results.filter((r) => !r.pass);

  if (failed.length) {
    log(`Gate ${stage} FAILED for ${id} (${lane} lane) — ${failed.length} of ${results.length} check(s) failed:`);
    for (const r of failed) log(`  [${r.id}] ${r.fix}`);
    log(`Nothing was changed. Fix the above and re-run: node .operator/bin/op.mjs gate ${id}`);
    process.exit(1);
  }

  const nextStage = gate.advancesTo[lane];
  const evidence = results.map((r) => `${r.id}: ${r.evidence}`).join('; ');
  const date = today();
  let updated = appendJournal(content, `- ${date} GATE ${stage} PASSED — evidence: ${evidence}`);
  updated = rewriteFrontmatter(updated, { stage: nextStage, updated: date });
  fs.writeFileSync(path.join(itemDir, 'workitem.md'), updated);

  log(`Gate ${stage} PASSED for ${id} (${lane} lane).`);
  for (const r of results) log(`  [${r.id}] ${r.evidence}`);
  log(
    `Advanced: ${stage} → ${nextStage}.` +
      (nextStage === 'done' ? ' Work item complete.' : ` Next: node .operator/bin/op.mjs gate ${id}`)
  );
  process.exit(0);
}

function parseEscalate(rest) {
  let id = null;
  let to = null;
  const reason = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--to') to = rest[++i];
    else if (a.startsWith('--to=')) to = a.slice(5);
    else if (a === '--reason') reason.push(rest[++i] ?? '');
    else if (a.startsWith('--reason=')) reason.push(a.slice(9));
    else if (!id) id = a;
    else reason.push(a);
  }
  return { id, to, reason: reason.join(' ').trim() };
}

function runEscalate(rest) {
  const { id, to, reason } = parseEscalate(rest);
  const { content, data, itemDir } = loadWorkitem(id);
  const old = data.lane;
  if (!(old in LANE_RANK)) die(`work item ${id} has an invalid lane '${old}'`);
  const target = to || 'standard';
  if (!(target in LANE_RANK)) die(`unknown lane '${target}' (the only escalation target is standard)`);
  if (old === 'standard') die(`work item ${id} is already at the standard lane; cannot escalate further — re-plan via op-plan instead`);
  if (LANE_RANK[target] <= LANE_RANK[old]) die(`escalation is one-way; cannot move ${old} → ${target}`);

  const reasonText = reason || '(no reason provided)';
  const date = today();
  let updated = appendJournal(content, `- ${date} ESCALATED ${old} → ${target} — reason: ${reasonText}`);
  updated = rewriteFrontmatter(updated, { lane: target, updated: date });
  fs.writeFileSync(path.join(itemDir, 'workitem.md'), updated);

  const tools = detectSpecTools();
  log(`Escalated ${id}: ${old} → ${target}.`);
  log(
    `Backfill before the next gate (run op-plan): author the spec — ` +
      (tools.length ? `via ${tools.join(' or ')}` : `from .operator/templates/spec.md into .operator/work/${id}/spec.md`) +
      ` — and set the workitem frontmatter \`spec:\` to its path so the spec gate can pass.`
  );
  process.exit(0);
}

function runStatus() {
  const items = [];
  if (fs.existsSync(WORK_DIR)) {
    for (const entry of fs.readdirSync(WORK_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const wi = path.join(WORK_DIR, entry.name, 'workitem.md');
      if (!fs.existsSync(wi)) continue;
      const content = fs.readFileSync(wi, 'utf8');
      const { data, error } = parseFrontmatter(content);
      if (error) {
        items.push({ id: entry.name, error });
        continue;
      }
      items.push({
        id: data.id || entry.name,
        lane: data.lane || '?',
        stage: data.stage || '?',
        next: data.next || '',
        updated: data.updated || '',
        journal: journalLines(content).slice(-3),
      });
    }
  }
  const tools = detectSpecTools();
  if (tools.length) log(`Spec tools detected: ${tools.join(', ')}`);
  if (!items.length) {
    log('No work items yet. Ask your agent for a change — the AGENTS.md routing engages op-new.');
    return;
  }
  const rows = [
    ['ID', 'LANE', 'STAGE', 'NEXT'],
    ...items.map((it) => (it.error ? [it.id, '-', 'INVALID', it.error] : [it.id, it.lane, it.stage, it.next])),
  ];
  const w = [0, 1, 2].map((c) => Math.max(...rows.map((r) => String(r[c]).length)));
  for (const r of rows) log([0, 1, 2].map((c) => String(r[c]).padEnd(w[c])).join('  ') + '  ' + r[3]);

  const active = items
    .filter((it) => !it.error && it.stage !== 'done')
    .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0];
  log('');
  if (active) {
    log(`Active: ${active.id} (${active.lane} lane, ${active.stage} stage)`);
    for (const l of active.journal) log(`  ${l}`);
    if (active.next) log(`Next action: ${active.next}`);
    log(`Advance it with: node .operator/bin/op.mjs gate ${active.id}`);
  } else {
    log('All work items are done.');
  }
}

function usage() {
  log('Operator gate checker');
  log('');
  log('Usage:');
  log('  node .operator/bin/op.mjs status');
  log('  node .operator/bin/op.mjs gate <id>');
  log('  node .operator/bin/op.mjs escalate <id> [reason...]');
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const [sub, ...rest] = process.argv.slice(2);
switch (sub) {
  case 'status':
    runStatus();
    break;
  case 'gate':
    runGate(rest[0]);
    break;
  case 'escalate':
    runEscalate(rest);
    break;
  case undefined:
  case '-h':
  case '--help':
    usage();
    break;
  default:
    die(`unknown subcommand '${sub}'. Use: status | gate <id> | escalate <id>`);
}
