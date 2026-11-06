import fs from 'node:fs';
import path from 'node:path';
import { pathExists, readJson, writeJson } from './fsutil.mjs';
import { readLegacyManifest } from './references.mjs';

export const STATE_DIR = '.operator';
export const STATE_FILE = 'state.json';
export const STATE_VERSION = 3;

/**
 * @typedef {{
 *   importAdded: boolean,
 *   fileCreated: boolean,
 * }} ClaudeMdRecord
 *
 * @typedef {{
 *   version: number,
 *   agents?: string[],
 *   tracker?: string,
 *   claudeMd?: ClaudeMdRecord,
 * }} OperatorState
 */

/**
 * `<project>/.operator/state.json`, or `~/.operator/state.json` when `destRoot` is the home dir (`-g`).
 * @param {string} destRoot
 */
export function statePath(destRoot) {
  return path.join(destRoot, STATE_DIR, STATE_FILE);
}

/** @param {unknown} value */
function cleanAgents(value) {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  return value.map(String);
}

/**
 * Read the saved state. When `.operator/state.json` is missing, fall back once to the v2
 * manifest (`references/.operator-managed.json`) for the saved agents; `migrated` is then true
 * and the caller writes the new file.
 * @param {string} destRoot
 * @returns {{ state: OperatorState, exists: boolean, migrated: boolean }}
 */
export function readState(destRoot) {
  const file = statePath(destRoot);
  if (pathExists(file)) {
    /** @type {OperatorState} */
    let raw;
    try {
      raw = readJson(file);
    } catch {
      raw = { version: STATE_VERSION };
    }
    /** @type {OperatorState} */
    const state = { version: STATE_VERSION };
    const agents = cleanAgents(raw.agents);
    if (agents) state.agents = agents;
    if (typeof raw.tracker === 'string' && raw.tracker.trim()) state.tracker = raw.tracker.trim();
    if (raw.claudeMd && typeof raw.claudeMd === 'object') {
      state.claudeMd = {
        importAdded: Boolean(raw.claudeMd.importAdded),
        fileCreated: Boolean(raw.claudeMd.fileCreated),
      };
    }
    return { state, exists: true, migrated: false };
  }
  const legacy = readLegacyManifest(destRoot);
  const agents = cleanAgents(legacy?.agents);
  if (agents) return { state: { version: STATE_VERSION, agents }, exists: false, migrated: true };
  return { state: { version: STATE_VERSION }, exists: false, migrated: false };
}

/**
 * @param {string} destRoot
 * @param {OperatorState} state
 */
export function writeState(destRoot, state) {
  /** @type {OperatorState} */
  const out = { version: STATE_VERSION };
  if (state.agents && state.agents.length > 0) out.agents = [...state.agents];
  if (state.tracker) out.tracker = state.tracker;
  if (state.claudeMd) out.claudeMd = { ...state.claudeMd };
  writeJson(statePath(destRoot), out);
}

/** @param {string} destRoot */
export function removeState(destRoot) {
  const file = statePath(destRoot);
  if (!pathExists(file)) return { removed: false };
  fs.unlinkSync(file);
  const dir = path.dirname(file);
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  return { removed: true };
}

/** @param {string} destRoot */
export function readSavedAgents(destRoot) {
  return readState(destRoot).state.agents;
}
