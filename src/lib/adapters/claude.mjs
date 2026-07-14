// Claude Code adapter.
//
// Claude Code reads CLAUDE.md (not AGENTS.md) and discovers skills in
// .claude/skills/. This adapter bridges both: a CLAUDE.md that imports
// AGENTS.md via the `@AGENTS.md` include syntax, and a copy-mirror of the
// installed skills from .agents/skills/ into .claude/skills/.

import fs from 'node:fs';
import path from 'node:path';
import { copyDir, sha256File, walkFiles } from '../fsutil.mjs';

export const CLAUDE_IMPORT_LINE = '@AGENTS.md';

/** Exactly what we generate when CLAUDE.md does not exist. `remove` deletes
 *  CLAUDE.md only when its content still equals this, so user edits survive. */
export const GENERATED_CLAUDE_MD = '@AGENTS.md\n';

function claudeMdPath(cwd) {
  return path.join(cwd, 'CLAUDE.md');
}

function hasImport(content) {
  return content.split(/\r?\n/).some((line) => line.trim() === CLAUDE_IMPORT_LINE);
}

/** Ensure CLAUDE.md exists and imports AGENTS.md. Returns a human action string or null. */
export function ensureImport(cwd) {
  const file = claudeMdPath(cwd);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, GENERATED_CLAUDE_MD);
    return 'created CLAUDE.md importing AGENTS.md';
  }
  const content = fs.readFileSync(file, 'utf8');
  if (hasImport(content)) return null;
  fs.writeFileSync(file, CLAUDE_IMPORT_LINE + '\n\n' + content);
  return 'added the @AGENTS.md import to your existing CLAUDE.md';
}

/** Copy-mirror the named skill directories from .agents/skills/ into
 *  .claude/skills/. Idempotent: each mirrored directory is replaced wholesale,
 *  and directories NOT in `skillNames` (a user's own skills) are never touched. */
export function mirrorSkills(cwd, skillNames) {
  const mirrored = [];
  for (const name of skillNames) {
    const src = path.join(cwd, '.agents', 'skills', name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(cwd, '.claude', 'skills', name);
    fs.rmSync(dest, { recursive: true, force: true });
    copyDir(src, dest);
    mirrored.push(name);
  }
  return mirrored;
}

/** Skill directories whose mirror is missing or differs from .agents/skills/. */
export function mirrorDrift(cwd, skillNames) {
  const drifted = [];
  for (const name of skillNames) {
    const src = path.join(cwd, '.agents', 'skills', name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(cwd, '.claude', 'skills', name);
    const srcFiles = walkFiles(src);
    const destFiles = walkFiles(dest);
    if (srcFiles.join('\n') !== destFiles.join('\n')) {
      drifted.push(name);
      continue;
    }
    for (const rel of srcFiles) {
      if (sha256File(path.join(src, rel)) !== sha256File(path.join(dest, rel))) {
        drifted.push(name);
        break;
      }
    }
  }
  return drifted;
}

export default {
  name: 'claude',

  detect(cwd) {
    return fs.existsSync(claudeMdPath(cwd)) || fs.existsSync(path.join(cwd, '.claude'));
  },

  /** Idempotent: safe to re-run on init, update, and doctor --fix. */
  apply({ cwd, skillNames }) {
    const actions = [];
    const imported = ensureImport(cwd);
    if (imported) actions.push(imported);
    const mirrored = mirrorSkills(cwd, skillNames);
    if (mirrored.length) actions.push(`mirrored ${mirrored.length} skill(s) into .claude/skills/`);
    if (!actions.length) actions.push('CLAUDE.md import and .claude/skills/ mirror already in place');
    return actions;
  },

  check({ cwd, skillNames }) {
    const issues = [];
    const file = claudeMdPath(cwd);
    const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (content === null || !hasImport(content)) {
      issues.push({
        level: 'error',
        id: 'claude-import',
        message:
          content === null
            ? 'CLAUDE.md missing — Claude Code will not load AGENTS.md'
            : 'CLAUDE.md no longer imports AGENTS.md (`@AGENTS.md` line missing)',
        fix: () => ensureImport(cwd),
      });
    }
    const drifted = mirrorDrift(cwd, skillNames);
    if (drifted.length) {
      issues.push({
        level: 'warn',
        id: 'claude-mirror',
        message: `.claude/skills/ mirror out of sync with .agents/skills/ for: ${drifted.join(', ')}`,
        fix: () => mirrorSkills(cwd, skillNames),
      });
    }
    return issues;
  },

  remove({ cwd, skillNames }) {
    const removed = [];
    const kept = [];
    for (const name of skillNames) {
      const dest = path.join(cwd, '.claude', 'skills', name);
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
        removed.push(`.claude/skills/${name}/`);
      }
    }
    const file = claudeMdPath(cwd);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content === GENERATED_CLAUDE_MD || content.trim() === CLAUDE_IMPORT_LINE) {
        fs.rmSync(file);
        removed.push('CLAUDE.md (it contained only our generated import)');
      } else {
        kept.push('CLAUDE.md — it has your own content; delete the `@AGENTS.md` line yourself if you want it gone');
      }
    }
    return { removed, kept };
  },
};
