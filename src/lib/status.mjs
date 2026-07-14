// `operator status` — table of work items, for convenience from the installer.
//
// The runtime gate checker (`.operator/bin/op.mjs status`) prints the same view
// from inside the user project. The payload must stay standalone (it cannot
// import this package), so the ~40 lines of overlap are accepted duplication.

import fs from 'node:fs';
import path from 'node:path';
import { OperatorError, journalLines, parseFrontmatter } from './fsutil.mjs';

export async function status(opts = {}) {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const log = opts.log ?? console.log;

  const operatorDir = path.join(cwd, '.operator');
  if (!fs.existsSync(operatorDir)) {
    throw new OperatorError('.operator/ not found — run `operator init` first.');
  }

  const workDir = path.join(operatorDir, 'work');
  const items = [];
  if (fs.existsSync(workDir)) {
    for (const entry of fs.readdirSync(workDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const wiPath = path.join(workDir, entry.name, 'workitem.md');
      if (!fs.existsSync(wiPath)) continue;
      const content = fs.readFileSync(wiPath, 'utf8');
      const { data, error } = parseFrontmatter(content);
      if (error) {
        items.push({ id: entry.name, error });
        continue;
      }
      items.push({
        id: data.id ?? entry.name,
        lane: data.lane ?? '?',
        stage: data.stage ?? '?',
        next: data.next ?? '',
        updated: data.updated ?? '',
        journal: journalLines(content).slice(-3),
      });
    }
  }

  if (items.length === 0) {
    log('No work items yet. Ask your agent for a change — the AGENTS.md routing engages op-new.');
    return { items: [], active: null };
  }

  // Table -----------------------------------------------------------------------
  const rows = [
    ['ID', 'LANE', 'STAGE', 'NEXT'],
    ...items.map((it) => (it.error ? [it.id, '-', 'INVALID', it.error] : [it.id, it.lane, it.stage, it.next])),
  ];
  const widths = [0, 1, 2].map((col) => Math.max(...rows.map((r) => String(r[col]).length)));
  for (const row of rows) {
    log([0, 1, 2].map((col) => String(row[col]).padEnd(widths[col])).join('  ') + '  ' + row[3]);
  }

  // Active item: the most recently updated item that is not done ------------------
  const active =
    items
      .filter((it) => !it.error && it.stage !== 'done')
      .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0] ?? null;
  log('');
  if (active) {
    log(`Active: ${active.id} (${active.lane} lane, ${active.stage} stage)`);
    for (const line of active.journal) log(`  ${line}`);
    if (active.next) log(`Next action: ${active.next}`);
    log(`Advance it with: node .operator/bin/op.mjs gate ${active.id}`);
  } else {
    log('All work items are done.');
  }
  return { items, active };
}
