import fs from 'node:fs';
import path from 'node:path';
import { pathExists, readJson } from './fsutil.mjs';

/**
 * Operator v2 fetched Addy's checklists into `references/` and listed them in this manifest
 * (which also held the saved agents). v3 installs no references: this module only reads the
 * old manifest once (see `state.mjs`) and purges the files it lists.
 */
export const MANAGED_MARKER = '.operator-managed.json';

/** @param {string} destRoot */
export function referencesDir(destRoot) {
  return path.join(destRoot, 'references');
}

/** @param {string} destRoot */
export function markerPath(destRoot) {
  return path.join(referencesDir(destRoot), MANAGED_MARKER);
}

/**
 * @param {string} destRoot
 * @returns {{ agents?: unknown, files?: unknown, source?: unknown } | undefined}
 */
export function readLegacyManifest(destRoot) {
  const marker = markerPath(destRoot);
  if (!pathExists(marker)) return undefined;
  try {
    return readJson(marker);
  } catch {
    return undefined;
  }
}

/** @param {string} destRoot */
export function legacyReferencesStatus(destRoot) {
  const manifest = readLegacyManifest(destRoot);
  if (!manifest) return { managed: false, files: [] };
  const files = Array.isArray(manifest.files) ? manifest.files.map(String) : [];
  return { managed: true, files };
}

/**
 * Delete the v2 managed `references/` files: only those listed in the manifest, then the
 * manifest, then the folder if nothing else is left. Other files stay.
 * @param {string} destRoot
 */
export function purgeLegacyReferences(destRoot) {
  const status = legacyReferencesStatus(destRoot);
  if (!status.managed) return { removed: false };
  const dest = referencesDir(destRoot);
  for (const file of status.files) {
    const filePath = path.join(dest, file);
    if (path.dirname(path.resolve(filePath)) !== path.resolve(dest)) continue;
    if (pathExists(filePath)) fs.unlinkSync(filePath);
  }
  const marker = markerPath(destRoot);
  if (pathExists(marker)) fs.unlinkSync(marker);
  if (pathExists(dest) && fs.readdirSync(dest).length === 0) {
    fs.rmdirSync(dest);
  }
  return { removed: true };
}
