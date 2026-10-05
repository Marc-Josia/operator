import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathExists } from './fsutil.mjs';

export const PROJECT_SKILL_DIRS = [
  '.agents/skills',
  '.claude/skills',
  '.cursor/skills',
  '.codex/skills',
  '.opencode/skills',
  '.gemini/skills',
  '.github/skills',
  '.windsurf/skills',
  '.kiro/skills',
  '.agent/skills',
];

export const GLOBAL_SKILL_DIRS = [
  path.join('.agents', 'skills'),
  path.join('.claude', 'skills'),
  path.join('.cursor', 'skills'),
  path.join('.codex', 'skills'),
  path.join('.opencode', 'skills'),
  path.join('.gemini', 'skills'),
];

/** @param {boolean | undefined} global */
export function destRoot(cwd, global) {
  return global ? os.homedir() : cwd;
}

/**
 * @param {string} root
 * @param {string[]} relDirs
 */
export function listInstalledSkills(root, relDirs = PROJECT_SKILL_DIRS) {
  /** @type {Map<string, string[]>} */
  const found = new Map();
  for (const rel of relDirs) {
    const dir = path.join(root, rel);
    if (!pathExists(dir)) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const skillDir = path.join(dir, entry.name);
      let st;
      try {
        st = fs.statSync(skillDir);
      } catch {
        continue;
      }
      if (!st.isDirectory()) continue;
      if (!pathExists(path.join(skillDir, 'SKILL.md'))) continue;
      const locations = found.get(entry.name) ?? [];
      locations.push(rel);
      found.set(entry.name, locations);
    }
  }
  return found;
}

/**
 * @param {string[]} expected
 * @param {Map<string, string[]>} installed
 */
export function diffSkills(expected, installed) {
  const present = [];
  const missing = [];
  for (const name of expected) {
    if (installed.has(name)) present.push(name);
    else missing.push(name);
  }
  return { present, missing };
}
