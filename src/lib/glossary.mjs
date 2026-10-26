import path from 'node:path';
import { pathExists } from './fsutil.mjs';

/** Matt renamed the domain-doc convention; his skills only read the new names. */
export const GLOSSARY_RENAMES = [
  ['CONTEXT.md', 'GLOSSARY.md'],
  ['CONTEXT-MAP.md', 'GLOSSARY-MAP.md'],
];

/**
 * Root domain docs still under their pre-rename name, with no new-name file beside them.
 * Operator only reports these; renaming is the consumer's call.
 * @param {string} cwd
 * @returns {{ from: string, to: string }[]}
 */
export function legacyGlossaryFiles(cwd) {
  return GLOSSARY_RENAMES
    .filter(([from, to]) => pathExists(path.join(cwd, from)) && !pathExists(path.join(cwd, to)))
    .map(([from, to]) => ({ from, to }));
}

/** @param {{ from: string, to: string }[]} legacy */
export function legacyGlossaryWarning(legacy) {
  const moves = legacy.map(({ from, to }) => `  git mv ${from} ${to}`).join('\n');
  return `Matt skills now read GLOSSARY.md, not CONTEXT.md. Rename (per-context CONTEXT.md files too):\n${moves}`;
}
