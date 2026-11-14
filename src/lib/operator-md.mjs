import fs from 'node:fs';
import path from 'node:path';
import { pathExists, readText, writeText } from './fsutil.mjs';

/** @param {string} cwd */
export function operatorMdPath(cwd) {
  return path.join(cwd, 'OPERATOR.md');
}

/**
 * Write OPERATOR.md, the full process the AGENTS.md block points to. Operator owns the whole file.
 * @param {string} cwd
 * @param {string} contents
 */
export function writeOperatorMd(cwd, contents) {
  writeText(operatorMdPath(cwd), `${contents.replace(/^﻿/, '').trimEnd()}\n`);
}

/**
 * @param {string} cwd
 * @param {string} expected the payload text
 */
export function operatorMdStatus(cwd, expected) {
  const filePath = operatorMdPath(cwd);
  if (!pathExists(filePath)) return { present: false, current: false };
  const normalize = (/** @type {string} */ text) => text.replace(/^﻿/, '').replace(/\r\n/g, '\n').trimEnd();
  return { present: true, current: normalize(readText(filePath)) === normalize(expected) };
}

/** @param {string} cwd */
export function removeOperatorMd(cwd) {
  const filePath = operatorMdPath(cwd);
  if (!pathExists(filePath)) return { removed: false };
  fs.unlinkSync(filePath);
  return { removed: true };
}
