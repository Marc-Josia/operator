import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class OperatorError extends Error {
  /**
   * @param {string} message
   * @param {number} [code]
   */
  constructor(message, code = 1) {
    super(message);
    this.name = 'OperatorError';
    this.code = code;
  }
}

/** @param {string} [fromHref] */
export function defaultPackageRoot(fromHref = import.meta.url) {
  return path.resolve(path.dirname(fileURLToPath(fromHref)), '..', '..');
}

/** @param {string} filePath */
export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * @param {string} filePath
 * @param {string} contents
 */
export function writeText(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

/** @param {string} filePath */
export function pathExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} filePath */
export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

/**
 * @param {string} filePath
 * @param {unknown} value
 */
export function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
