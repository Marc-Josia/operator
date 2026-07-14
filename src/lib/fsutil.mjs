// fsutil.mjs — shared filesystem and text helpers for the Operator installer.
// Zero dependencies. ESM. Node >= 18.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Error meant for the operator: printed without a stack trace, sets the exit code. */
export class OperatorError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.name = 'OperatorError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Package layout
// ---------------------------------------------------------------------------

/** Root of the running Operator package (resolved from this module, not from cwd,
 *  so it works from the npx cache and from any working directory). */
export function defaultPackageRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
}

/** The payload directory of a package root (`<root>/src/payload`). */
export function payloadDir(packageRoot) {
  return path.join(packageRoot, 'src', 'payload');
}

/** Version shipped in a payload (`operator/VERSION`). */
export function readPayloadVersion(payload) {
  return fs.readFileSync(path.join(payload, 'operator', 'VERSION'), 'utf8').trim();
}

/** Numeric dotted-version compare: negative when a < b, 0 when equal, positive when a > b. */
export function compareVersions(a, b) {
  const pa = String(a).trim().split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).trim().split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Paths under `.operator/` that init copies once but never manages afterwards.
 *  They are user-owned: excluded from the install inventory, never touched by update. */
export function isUnmanagedOperatorPath(rel) {
  return (
    rel === '.installed.json' ||
    rel === 'config.json' ||
    rel.startsWith('memory/') ||
    rel.startsWith('work/')
  );
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

export function sha256File(file) {
  return sha256(fs.readFileSync(file));
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Recursively list regular files under `dir` as sorted posix-relative paths.
 *  Symlinks are skipped (never followed) so a hostile payload or project cannot
 *  make the installer read or write outside the tree. */
export function walkFiles(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else if (entry.isFile()) out.push(toPosix(path.relative(base, full)));
  }
  return out.sort();
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Copy one file, creating parent directories and preserving the source mode
 *  (the gate checker in bin/ keeps its executable bit). */
export function copyFilePreserving(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, fs.statSync(src).mode);
}

/** Recursive directory copy. No symlinks (skipped by walkFiles). Returns the
 *  posix-relative paths copied. `filter(rel)` may exclude files. */
export function copyDir(src, dest, { filter } = {}) {
  const copied = [];
  for (const rel of walkFiles(src)) {
    if (filter && !filter(rel)) continue;
    copyFilePreserving(path.join(src, ...rel.split('/')), path.join(dest, ...rel.split('/')));
    copied.push(rel);
  }
  return copied;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

/** Deep JSON merge: plain objects merge recursively, arrays and scalars are
 *  replaced by the source value, and keys unknown to the source are preserved.
 *  Used so adapter writes never destroy a user's existing settings. */
export function deepMerge(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) return source;
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    out[key] = deepMerge(target[key], value);
  }
  return out;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// AGENTS.md marker block
// ---------------------------------------------------------------------------

export const MARKER_END = '<!-- operator:end -->';
const BEGIN_RE = /<!--\s*operator:begin(?:\s+v([^\s>]+))?\s*-->/;
const END_RE = /<!--\s*operator:end\s*-->/;

export function markerBegin(version) {
  return `<!-- operator:begin v${version} -->`;
}

/** Locate the managed block. Returns `{ start, end, inner, version }` (offsets
 *  cover the markers themselves; `inner` is the raw text between them) or null. */
export function findMarkerBlock(content) {
  const begin = content.match(BEGIN_RE);
  if (!begin) return null;
  const afterBegin = begin.index + begin[0].length;
  const rest = content.slice(afterBegin);
  const end = rest.match(END_RE);
  if (!end) return null;
  return {
    start: begin.index,
    end: afterBegin + end.index + end[0].length,
    inner: rest.slice(0, end.index),
    version: begin[1] ?? null,
  };
}

/** Render the full managed block (markers included) for a version and body. */
export function renderMarkerBlock(version, body) {
  return `${markerBegin(version)}\n${body.trim()}\n${MARKER_END}`;
}

/** Replace the existing managed block in place, or insert `block` at the top of
 *  the content when no markers are present. User content is always preserved. */
export function upsertMarkerBlock(content, block) {
  const found = findMarkerBlock(content);
  if (found) return content.slice(0, found.start) + block + content.slice(found.end);
  if (!content.trim()) return block + '\n';
  return block + '\n\n' + content.replace(/^\n+/, '');
}

/** Remove the managed block (markers included), keeping everything else. */
export function removeMarkerBlock(content) {
  const found = findMarkerBlock(content);
  if (!found) return content;
  return (content.slice(0, found.start) + content.slice(found.end)).replace(/^\n+/, '');
}

// ---------------------------------------------------------------------------
// Minimal glob
// ---------------------------------------------------------------------------

/**
 * Convert a glob pattern to a RegExp matching posix-relative paths.
 *
 * Supported subset (deliberately minimal — document any extension here):
 *   `**`  any number of characters including `/`; a `**` /-delimited on both
 *         sides (or at the start) also matches ZERO segments, so `**\/auth/**`
 *         matches both `auth/login.js` and `src/auth/login.js`
 *   `*`   any characters within one path segment (no `/`)
 *   `?`   exactly one character, not `/`
 * No brace expansion, character classes, or negation.
 */
export function globToRegExp(pattern) {
  const pat = toPosix(String(pattern));
  let re = '';
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c === '*') {
      if (pat[i + 1] === '*') {
        const prevIsBoundary = i === 0 || pat[i - 1] === '/';
        const nextIsSlash = pat[i + 2] === '/';
        if (prevIsBoundary && nextIsSlash) {
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

// ---------------------------------------------------------------------------
// Work-item documents (frontmatter + journal)
// ---------------------------------------------------------------------------

/** Strict flat `key: value` frontmatter between `---` fences — no YAML library.
 *  Returns `{ data, error }`; `data` is null when malformed. */
export function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { data: null, error: 'missing opening --- fence' };
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') return { data, error: null };
    if (!line.trim()) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) return { data: null, error: `malformed frontmatter line ${i + 1}: "${line}"` };
    data[m[1]] = m[2].trim();
  }
  return { data: null, error: 'missing closing --- fence' };
}

/** Body of a `## <heading>` section, up to the next `## ` heading or EOF. Null if absent. */
export function sectionBody(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s+${escaped}\\s*$`, 'm');
  const m = content.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = content.slice(start);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

/** The `- ` event lines of the Journal section (all of them, oldest first). */
export function journalLines(content) {
  const body = sectionBody(content, 'Journal') ?? '';
  return body.split(/\r?\n/).filter((l) => l.startsWith('- '));
}
