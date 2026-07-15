// `operator update` — refresh managed files from the RUNNING package's payload.
//
// No network. Per managed file, a three-way compare between the hash recorded
// at install time (.installed.json), the file on disk, and the new payload:
//   unchanged since install -> overwrite with the new version
//   user-modified           -> keep the user's file, write `<file>.operator-new`
//   missing                 -> restore
// `work/**`, `memory/**`, `projects/**`, and `config.json` are user-owned and never touched.
// The AGENTS.md managed block is replaced marker-to-marker only.

import fs from 'node:fs';
import path from 'node:path';
import {
  OperatorError,
  compareVersions,
  copyFilePreserving,
  defaultPackageRoot,
  findMarkerBlock,
  isUnmanagedOperatorPath,
  payloadDir,
  readJson,
  readPayloadVersion,
  renderMarkerBlock,
  sha256,
  sha256File,
  upsertMarkerBlock,
  walkFiles,
  writeJson,
} from './fsutil.mjs';
import { adapters, detectTools } from './adapters/index.mjs';
import { payloadSkillNames } from './init.mjs';

/** The one true fix for a stale npx cache serving an old package version. */
export const NPX_CACHE_FIX =
  'rm -rf "$(npm config get cache)/_npx" && npx --yes github:MarcJosia/operator update';

/** Map of managed target path (posix, project-relative) -> absolute payload source. */
function managedFileMap(payload) {
  const managed = new Map();
  const operatorSrc = path.join(payload, 'operator');
  for (const rel of walkFiles(operatorSrc)) {
    if (isUnmanagedOperatorPath(rel)) continue;
    managed.set(`.operator/${rel}`, path.join(operatorSrc, ...rel.split('/')));
  }
  const skillsSrc = path.join(payload, 'skills');
  for (const rel of walkFiles(skillsSrc)) {
    managed.set(`.agents/skills/${rel}`, path.join(skillsSrc, ...rel.split('/')));
  }
  return managed;
}

export async function update(opts = {}) {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const log = opts.log ?? console.log;
  const packageRoot = opts.packageRoot ?? defaultPackageRoot();
  const payload = payloadDir(packageRoot);

  const operatorDir = path.join(cwd, '.operator');
  const installedPath = path.join(operatorDir, '.installed.json');
  if (!fs.existsSync(operatorDir)) {
    throw new OperatorError('.operator/ not found — run `operator init` first.');
  }
  let installed = { version: '0.0.0', files: {} };
  if (fs.existsSync(installedPath)) {
    installed = readJson(installedPath);
  } else {
    log('warning: .operator/.installed.json missing — treating every differing file as user-modified (conservative).');
  }

  const runningVersion = readPayloadVersion(payload);
  if (compareVersions(runningVersion, installed.version) < 0) {
    const warning =
      `the running package is v${runningVersion} but v${installed.version} is installed — ` +
      'you are almost certainly running a stale npx cache.\n' +
      `Fix: ${NPX_CACHE_FIX}`;
    if (!opts.force) {
      throw new OperatorError('refusing to downgrade. ' + warning + '\n(Pass --force to downgrade anyway.)');
    }
    log('warning: ' + warning);
  }

  const report = {
    fromVersion: installed.version,
    toVersion: runningVersion,
    updated: [],
    kept: [],
    restored: [],
    added: [],
    removedObsolete: [],
    keptObsolete: [],
    agentsAction: null,
    adapters: [],
  };

  // Per-file three-way sync ---------------------------------------------------
  const managed = managedFileMap(payload);
  for (const [target, src] of managed) {
    const dest = path.join(cwd, ...target.split('/'));
    const newHash = sha256File(src);
    const installedHash = installed.files?.[target];
    if (!fs.existsSync(dest)) {
      copyFilePreserving(src, dest);
      (installedHash !== undefined ? report.restored : report.added).push(target);
      continue;
    }
    const currentHash = sha256File(dest);
    if (currentHash === newHash) continue; // already the new content
    if (currentHash === installedHash) {
      copyFilePreserving(src, dest); // unmodified since install: safe to overwrite
      report.updated.push(target);
    } else {
      // User-modified (or unknown provenance): keep theirs, offer ours next to it.
      fs.writeFileSync(dest + '.operator-new', fs.readFileSync(src));
      report.kept.push(target);
    }
  }

  // Files we managed before that the new payload no longer ships --------------
  for (const [target, hash] of Object.entries(installed.files ?? {})) {
    if (target.includes('#')) continue; // pseudo-entries (AGENTS.md block)
    if (managed.has(target)) continue;
    const dest = path.join(cwd, ...target.split('/'));
    if (!fs.existsSync(dest)) continue;
    if (sha256File(dest) === hash) {
      fs.rmSync(dest);
      report.removedObsolete.push(target);
    } else {
      report.keptObsolete.push(target); // user modified it — never delete their work
    }
  }

  // AGENTS.md: replace the marked block only ----------------------------------
  const blockBody = fs.readFileSync(path.join(payload, 'agents-block.md'), 'utf8');
  const block = renderMarkerBlock(runningVersion, blockBody);
  const agentsPath = path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const existing = fs.readFileSync(agentsPath, 'utf8');
    const had = findMarkerBlock(existing);
    fs.writeFileSync(agentsPath, upsertMarkerBlock(existing, block));
    report.agentsAction = had
      ? `managed block replaced (v${had.version ?? '?'} -> v${runningVersion})`
      : 'markers were missing — managed block re-inserted at the top';
  } else {
    fs.writeFileSync(agentsPath, block + '\n');
    report.agentsAction = 'AGENTS.md was missing — recreated with the managed block';
  }

  // Adapters: idempotent re-render --------------------------------------------
  const tools = installed.tools ?? detectTools(cwd);
  const ctx = { cwd, skillNames: payloadSkillNames(payload) };
  for (const name of tools) {
    if (!adapters[name]) continue;
    report.adapters.push({ name, actions: adapters[name].apply(ctx) });
  }

  // Refresh the inventory -------------------------------------------------------
  // Hashes record the MANAGED content (the new payload), so a user-modified file
  // keeps reading as modified on the next update instead of being clobbered.
  const files = {};
  for (const [target, src] of managed) files[target] = sha256File(src);
  const found = findMarkerBlock(fs.readFileSync(agentsPath, 'utf8'));
  if (found) files['AGENTS.md#operator-block'] = sha256(found.inner.trim());
  writeJson(installedPath, {
    version: runningVersion,
    installedAt: installed.installedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tools,
    files,
  });

  // Report ---------------------------------------------------------------------
  log(`Operator update: v${report.fromVersion} -> v${report.toVersion}`);
  log(`  AGENTS.md: ${report.agentsAction}`);
  const section = (label, list, note = '') => {
    if (!list.length) return;
    log(`  ${label}${note ? ` ${note}` : ''}:`);
    for (const t of list) log(`    - ${t}`);
  };
  section('updated', report.updated);
  section('restored (were missing)', report.restored);
  section('added (new in this version)', report.added);
  section('kept yours', report.kept, '(review the `<file>.operator-new` next to each)');
  section('removed (obsolete, unmodified)', report.removedObsolete);
  section('kept (obsolete but you modified them)', report.keptObsolete);
  if (
    !report.updated.length && !report.restored.length && !report.added.length &&
    !report.kept.length && !report.removedObsolete.length
  ) {
    log('  managed files: already up to date');
  }
  log('  untouched by design: .operator/work/, .operator/memory/, .operator/projects/, .operator/config.json');
  return report;
}
