// manifest.mjs — build/verify src/manifest.json, the payload's hash manifest.
//
// `build`  — walk src/payload/**, write { version, generatedAt, files } where
//            files maps package-root-relative posix paths to sha256 hex digests.
// `verify` — recompute and diff against the committed manifest; non-zero exit
//            on any drift so CI can catch a payload edited without a rebuild.
//
// Runs as a module (buildManifest/verifyManifest) or directly:
//   node src/lib/manifest.mjs build|verify

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  defaultPackageRoot,
  payloadDir,
  readJson,
  readPayloadVersion,
  sha256File,
  walkFiles,
  writeJson,
} from './fsutil.mjs';

export function manifestPath(packageRoot = defaultPackageRoot()) {
  return path.join(packageRoot, 'src', 'manifest.json');
}

/** Compute the manifest object for a package root (does not write anything). */
export function computeManifest(packageRoot = defaultPackageRoot()) {
  const payload = payloadDir(packageRoot);
  const files = {};
  for (const rel of walkFiles(payload)) {
    files[`src/payload/${rel}`] = sha256File(path.join(payload, ...rel.split('/')));
  }
  return {
    version: readPayloadVersion(payload),
    generatedAt: new Date().toISOString(),
    files,
  };
}

export function buildManifest(packageRoot = defaultPackageRoot(), log = console.log) {
  const manifest = computeManifest(packageRoot);
  writeJson(manifestPath(packageRoot), manifest);
  log(`manifest: wrote src/manifest.json (${Object.keys(manifest.files).length} files, v${manifest.version})`);
  return manifest;
}

/** Recompute and diff. Returns { ok, added, removed, changed }. */
export function verifyManifest(packageRoot = defaultPackageRoot(), log = console.log) {
  const file = manifestPath(packageRoot);
  if (!fs.existsSync(file)) {
    log('manifest: src/manifest.json missing — run `npm run build:manifest`');
    return { ok: false, added: [], removed: [], changed: [] };
  }
  const committed = readJson(file);
  const current = computeManifest(packageRoot);
  const added = Object.keys(current.files).filter((k) => !(k in committed.files));
  const removed = Object.keys(committed.files).filter((k) => !(k in current.files));
  const changed = Object.keys(current.files).filter(
    (k) => k in committed.files && committed.files[k] !== current.files[k]
  );
  const ok = added.length === 0 && removed.length === 0 && changed.length === 0 && committed.version === current.version;
  if (ok) {
    log(`manifest: ok (${Object.keys(current.files).length} files, v${current.version})`);
  } else {
    for (const k of added) log(`manifest: added   ${k}`);
    for (const k of removed) log(`manifest: removed ${k}`);
    for (const k of changed) log(`manifest: changed ${k}`);
    if (committed.version !== current.version) {
      log(`manifest: version drift (manifest v${committed.version}, payload v${current.version})`);
    }
    log('manifest: out of date — run `npm run build:manifest`');
  }
  return { ok, added, removed, changed };
}

// Direct invocation: node src/lib/manifest.mjs build|verify
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cmd = process.argv[2];
  if (cmd === 'build') {
    buildManifest();
  } else if (cmd === 'verify') {
    process.exitCode = verifyManifest().ok ? 0 : 1;
  } else {
    console.error('usage: node src/lib/manifest.mjs build|verify');
    process.exitCode = 2;
  }
}
