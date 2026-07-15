// Gemini CLI adapter.
//
// Gemini reads GEMINI.md by default; its settings.json `contextFileName` can
// name additional context files. We add "AGENTS.md" to that list (creating
// .gemini/settings.json when the adapter is explicitly requested) and remove
// exactly that entry on uninstall — never any other key.

import fs from 'node:fs';
import path from 'node:path';
import { deepMerge, readJson, writeJson } from '../fsutil.mjs';

const CONTEXT_FILE = 'AGENTS.md';

function settingsPath(cwd) {
  return path.join(cwd, '.gemini', 'settings.json');
}

export default {
  name: 'gemini',

  detect(cwd) {
    return fs.existsSync(path.join(cwd, '.gemini'));
  },

  /** Idempotent. Preserves every existing key via deep merge; only
   *  `contextFileName` gains the AGENTS.md entry. */
  apply({ cwd }) {
    const file = settingsPath(cwd);
    let settings = {};
    if (fs.existsSync(file)) {
      try {
        settings = readJson(file);
      } catch {
        return [`left ${path.join('.gemini', 'settings.json')} alone — it is not valid JSON; add "${CONTEXT_FILE}" to contextFileName yourself`];
      }
    }
    const current = settings.contextFileName;
    let next;
    if (current === undefined) next = ['GEMINI.md', CONTEXT_FILE];
    else if (typeof current === 'string') next = current === CONTEXT_FILE ? current : [current, CONTEXT_FILE];
    else if (Array.isArray(current)) next = current.includes(CONTEXT_FILE) ? current : [...current, CONTEXT_FILE];
    else next = current; // unknown shape: do not touch it
    if (next === current) return ['.gemini/settings.json already lists AGENTS.md as a context file'];
    writeJson(file, deepMerge(settings, { contextFileName: next }));
    return ['added AGENTS.md to contextFileName in .gemini/settings.json'];
  },

  check() {
    return [];
  },

  /** Conservative reversal: remove only the entry we added. */
  remove({ cwd }) {
    const removed = [];
    const kept = [];
    const file = settingsPath(cwd);
    if (!fs.existsSync(file)) return { removed, kept };
    let settings;
    try {
      settings = readJson(file);
    } catch {
      kept.push('.gemini/settings.json — not valid JSON, left untouched');
      return { removed, kept };
    }
    const current = settings.contextFileName;
    if (Array.isArray(current) && current.includes(CONTEXT_FILE)) {
      const filtered = current.filter((v) => v !== CONTEXT_FILE);
      if (filtered.length === 0) delete settings.contextFileName;
      else settings.contextFileName = filtered;
      writeJson(file, settings);
      removed.push('the AGENTS.md entry from contextFileName in .gemini/settings.json');
    } else if (current === CONTEXT_FILE) {
      delete settings.contextFileName;
      writeJson(file, settings);
      removed.push('contextFileName from .gemini/settings.json (it was exactly our entry)');
    }
    return { removed, kept };
  },
};
