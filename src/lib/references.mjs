import fs from 'node:fs';
import path from 'node:path';
import { OperatorError, pathExists, readJson, writeJson, writeText } from './fsutil.mjs';

export const MANAGED_MARKER = '.operator-managed.json';

const RAW_BASE = 'https://raw.githubusercontent.com';
const USER_AGENT = 'operator-cli (@marcjosia/operator)';

/** @param {string} destRoot */
export function referencesDir(destRoot) {
  return path.join(destRoot, 'references');
}

/** @param {string} destRoot */
export function markerPath(destRoot) {
  return path.join(referencesDir(destRoot), MANAGED_MARKER);
}

/**
 * @param {string} repo
 * @param {string} branch
 * @param {string} dir
 * @param {string} file
 */
export function rawUrl(repo, branch, dir, file) {
  return `${RAW_BASE}/${repo}/${branch}/${dir}/${file}`;
}

/**
 * @param {string} url
 * @param {{ fetchFn?: typeof fetch }} [opts]
 */
export async function fetchText(url, opts = {}) {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new OperatorError(`failed to fetch ${url} (${res.status} ${res.statusText})`, 1);
  }
  return res.text();
}

/** @param {string} destRoot */
export function readSavedAgents(destRoot) {
  const marker = markerPath(destRoot);
  if (!pathExists(marker)) return undefined;
  const managed = readJson(marker);
  if (!Array.isArray(managed.agents) || managed.agents.length === 0) return undefined;
  return managed.agents.map(String);
}

/**
 * @param {{
 *   catalog: { references: { repo: string, branch: string, dir: string, files: string[] } },
 *   destRoot: string,
 *   agents?: string[],
 *   fetchFn?: typeof fetch,
 * }} opts
 */
export async function installReferences(opts) {
  const { repo, branch, dir, files } = opts.catalog.references;
  const dest = referencesDir(opts.destRoot);
  const existingAgents = readSavedAgents(opts.destRoot);
  for (const file of files) {
    const url = rawUrl(repo, branch, dir, file);
    const body = await fetchText(url, { fetchFn: opts.fetchFn });
    writeText(path.join(dest, file), body);
  }
  const agents = opts.agents && opts.agents.length > 0 ? opts.agents : existingAgents;
  writeJson(markerPath(opts.destRoot), {
    source: `${repo}/${dir}`,
    branch,
    files: [...files],
    ...(agents && agents.length > 0 ? { agents } : {}),
  });
}

/** @param {string} destRoot */
export function referencesStatus(destRoot) {
  const dest = referencesDir(destRoot);
  const marker = markerPath(destRoot);
  if (!pathExists(dest)) {
    return { present: false, managed: false, files: [], missing: [] };
  }
  if (!pathExists(marker)) {
    return { present: true, managed: false, files: [], missing: [] };
  }
  const managed = readJson(marker);
  const files = Array.isArray(managed.files) ? managed.files : [];
  const missing = files.filter((file) => !pathExists(path.join(dest, file)));
  return { present: true, managed: true, files, missing, source: managed.source };
}

/**
 * @param {string} destRoot
 * @param {{ purge?: boolean }} [opts]
 */
export function removeReferences(destRoot, opts = {}) {
  if (!opts.purge) return { removed: false };
  const status = referencesStatus(destRoot);
  if (!status.managed) return { removed: false };
  const dest = referencesDir(destRoot);
  for (const file of status.files) {
    const filePath = path.join(dest, file);
    if (pathExists(filePath)) fs.unlinkSync(filePath);
  }
  const marker = markerPath(destRoot);
  if (pathExists(marker)) fs.unlinkSync(marker);
  if (pathExists(dest) && fs.readdirSync(dest).length === 0) {
    fs.rmdirSync(dest);
  }
  return { removed: true };
}
