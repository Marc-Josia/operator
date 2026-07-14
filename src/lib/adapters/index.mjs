// Adapter registry: one adapter per supported agent tool.
//
// An adapter is `{ name, detect(cwd), apply(ctx), check(ctx), remove(ctx) }`:
//   detect — is this tool plausibly used in the project?
//   apply  — idempotently render the tool-specific wiring; returns action strings
//   check  — doctor issues: [{ level, id, message, fix? }]
//   remove — conservative reversal; returns { removed, kept }
// ctx is `{ cwd, skillNames }`.

import fs from 'node:fs';
import path from 'node:path';
import { OperatorError } from '../fsutil.mjs';
import claude from './claude.mjs';
import codex from './codex.mjs';
import cursor from './cursor.mjs';
import gemini from './gemini.mjs';
import opencode from './opencode.mjs';

export const adapters = { claude, gemini, codex, opencode, cursor };
export const TOOL_NAMES = Object.keys(adapters);

/** Names of the tools whose presence markers exist in the project. */
export function detectTools(cwd) {
  return TOOL_NAMES.filter((name) => adapters[name].detect(cwd));
}

/**
 * Decide which adapters to run. `toolsFlag` is the raw `--tools` value
 * (comma-separated names, or "none" for a generic-only install). Without a
 * flag we detect; when nothing is detected we still apply claude — it is the
 * most common tool and the adapter is harmless elsewhere.
 * Returns `{ tools, reason }`.
 */
export function resolveTools(cwd, toolsFlag) {
  if (toolsFlag) {
    const names = String(toolsFlag)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (names.includes('none')) {
      if (names.length > 1) {
        throw new OperatorError('--tools none cannot be combined with other tools', 2);
      }
      return { tools: [], reason: '--tools none: generic install only (AGENTS.md + .agents/skills/)' };
    }
    for (const name of names) {
      if (!adapters[name]) {
        throw new OperatorError(`unknown tool "${name}" — known tools: ${TOOL_NAMES.join(', ')}, none`, 2);
      }
    }
    return { tools: [...new Set(names)], reason: 'selected via --tools' };
  }
  const detected = detectTools(cwd);
  if (detected.length) return { tools: detected, reason: `detected: ${detected.join(', ')}` };
  return {
    tools: ['claude'],
    reason:
      'no tool markers detected — applying the claude adapter anyway (the most common tool; ' +
      'CLAUDE.md and the skills mirror are harmless for other tools). Pass --tools none to skip.',
  };
}

/** Skill directory names Operator installed, from the .installed.json inventory
 *  when available, else from `op-*`/`operator-*` directories on disk. */
export function installedSkillNames(installed, cwd) {
  const names = new Set();
  for (const key of Object.keys(installed?.files ?? {})) {
    const m = key.match(/^\.agents\/skills\/([^/]+)\//);
    if (m) names.add(m[1]);
  }
  if (names.size === 0) {
    const root = path.join(cwd, '.agents', 'skills');
    if (fs.existsSync(root)) {
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory() && /^(op|operator)-/.test(entry.name)) names.add(entry.name);
      }
    }
  }
  return [...names].sort();
}
