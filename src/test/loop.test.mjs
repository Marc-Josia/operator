import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadLoopContract, REVIEW_PHASES } from '../lib/loop-contract.mjs';
import { executeLoop, loopSnapshot, loopStatus, runLoopCommand } from '../lib/loop.mjs';
import { tmpDir } from './helpers.mjs';

function write(root, file, value) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value));
}

function fixture(t, change = () => {}) {
  const root = tmpDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  write(root, 'docs/spec.md', '# Approved feature\nMake app.txt say done.');
  write(root, 'docs/ticket.md', '# T1\nImplement app.txt and verify its contents.');
  write(root, 'app.txt', 'pending');
  write(root, 'check.mjs', "import fs from 'node:fs'; process.exit(fs.readFileSync('app.txt', 'utf8') === 'done' ? 0 : 1);\n");
  const contract = {
    version: 1, id: 'feature', approved: true, spec: 'docs/spec.md',
    tickets: [{ id: 'T1', path: 'docs/ticket.md', dependsOn: [], criteria: [{ id: 'C1', description: 'app.txt contains done', checks: ['behavior'] }] }],
    agent: { command: process.execPath, args: ['adapter.mjs'] },
    checks: [{ id: 'behavior', command: process.execPath, args: ['check.mjs'] }],
    deprecation: false, budget: { maxIterations: 5, maxNoProgress: 2, timeoutMs: 3000 },
  };
  change(contract);
  for (const name of ['implement', 'tdd', ...REVIEW_PHASES, 'deprecation-and-migration', 'shipping-and-launch']) {
    write(root, `.agents/skills/${name}/SKILL.md`, `---\nname: ${name}\n---\n# Fixture ${name}\n`);
  }
  write(root, 'contract.json', contract);
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Operator Test', '-c', 'user.email=operator@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  return { root, contract, contractPath: path.join(root, 'contract.json') };
}

function adapter(f, behavior = () => {}) {
  const calls = [];
  const runner = async (options) => {
    if (!options.env?.OPERATOR_CONTEXT) return runLoopCommand(options);
    const context = JSON.parse(fs.readFileSync(options.env.OPERATOR_CONTEXT, 'utf8'));
    calls.push({ phase: context.phase, iteration: context.iteration, failures: context.failures });
    if (context.phase === 'implement') write(f.root, 'app.txt', 'done');
    const report = { outcome: 'pass', evidence: 'Checked approved spec and app.txt.', findings: [] };
    if (context.phase === 'implement') report.criteria = [{ ticket: 'T1', criterion: 'C1', evidence: 'app.txt; behavior check verifies content.' }];
    await behavior(context, report, options);
    write(f.root, path.relative(f.root, context.resultPath), report);
    return { code: 0 };
  };
  return { runner, calls };
}

function run(f, a, extra = {}) {
  return executeLoop({ cwd: f.root, contractPath: f.contractPath, runner: a.runner, ...extra });
}

test('loop validates approval, spec, tickets, criteria, commands, and budgets before executing', async (t) => {
  const mutations = [
    (c) => { c.approved = false; },
    (c) => { c.spec = 'missing.md'; },
    (c) => { c.spec = '../outside.md'; },
    (c) => { c.tickets = []; },
    (c) => { c.tickets[0].criteria = []; },
    (c) => { c.tickets[0].criteria[0].checks = ['missing']; },
    (c) => { c.tickets[0].dependsOn = ['missing']; },
    (c) => { c.tickets[0].dependsOn = ['T1']; },
    (c) => { c.agent.args = 'shell string'; },
    (c) => { c.budget.maxIterations = 0; },
    (c) => { c.budget.timeoutMs = 2147483648; },
    (c) => { c.id = '../escape'; },
    (c) => { c.checks = []; },
  ];
  for (const mutation of mutations) {
    const f = fixture(t, mutation);
    let called = false;
    await assert.rejects(executeLoop({ cwd: f.root, contractPath: f.contractPath, runner: async () => { called = true; } }), /invalid loop contract/);
    assert.equal(called, false);
    assert.equal(fs.existsSync(path.join(f.root, 'temp/operator/execution.lock')), false);
  }
});

test('ticket order follows dependencies and duplicate criteria are rejected', (t) => {
  const f = fixture(t, (c) => {
    c.tickets.unshift({ id: 'T2', path: 'docs/ticket.md', dependsOn: ['T1'], criteria: [{ id: 'C2', description: 'Follow T1', checks: ['behavior'] }] });
  });
  assert.deepEqual(loadLoopContract(f.contractPath, f.root).order, ['T1', 'T2']);
  f.contract.tickets[0].criteria[0].id = 'C1';
  write(f.root, 'contract.json', f.contract);
  assert.throws(() => loadLoopContract(f.contractPath, f.root), /globally unique/);
});

test('missing or changed skill instructions prevent unverified completion', async (t) => {
  const f = fixture(t);
  write(f.root, '.agents/skills/security-and-hardening/SKILL.md', '');
  const a = adapter(f);
  await assert.rejects(run(f, a), /required skill security-and-hardening is empty/);
  assert.equal(a.calls.length, 0);
  write(f.root, '.agents/skills/security-and-hardening/SKILL.md', '# Installed security instructions');
  await run(f, a);
  write(f.root, '.agents/skills/security-and-hardening/SKILL.md', '# Changed security instructions');
  assert.equal(loopStatus({ cwd: f.root, id: 'feature' }).status, 'stale');
  await assert.rejects(executeLoop({ cwd: f.root, id: 'feature', resume: true, runner: a.runner }), /installed skills changed/);
});

test('controller runs checks and sequential reviews with evidence linked to every ticket', async (t) => {
  const f = fixture(t);
  const a = adapter(f);
  const result = await run(f, a);
  assert.equal(result.status, 'complete');
  assert.deepEqual(a.calls.map((c) => c.phase), ['implement', ...REVIEW_PHASES, 'shipping-and-launch']);
  assert.equal(result.checks[0].code, 0);
  assert.equal(result.criteria[0].criterion, 'C1');
  assert.ok(result.reviews.every((review) => review.snapshot === result.snapshot));
  assert.equal(loopStatus({ cwd: f.root, id: 'feature' }).fresh, true);
  const pinned = JSON.parse(fs.readFileSync(path.join(f.root, 'temp/operator/feature/approved.json')));
  assert.ok(pinned.sources.some((source) => source.path === 'docs/ticket.md'));
});

test('deprecation and a separate reviewer run in the production order', async (t) => {
  const f = fixture(t, (c) => {
    c.deprecation = true;
    c.reviewer = { command: 'reviewer', args: [] };
  });
  const a = adapter(f, (context, report, options) => {
    if (context.phase !== 'implement') assert.equal(options.command, 'reviewer');
  });
  await run(f, a);
  assert.deepEqual(a.calls.slice(-2).map((c) => c.phase), ['deprecation-and-migration', 'shipping-and-launch']);
});

test('a failing check returns to implementation without a human relaunch', async (t) => {
  const f = fixture(t);
  const a = adapter(f, (context) => {
    if (context.iteration === 1 && context.phase === 'implement') write(f.root, 'app.txt', 'broken');
  });
  const result = await run(f, a);
  assert.equal(result.status, 'complete');
  assert.equal(result.iteration, 2);
  assert.deepEqual(a.calls.slice(0, 3).map((c) => c.phase), ['implement', 'implement', 'code-review']);
  assert.equal(a.calls[1].failures[0].phase, 'check:behavior');
});

test('review findings return to implementation and invalidate earlier checks and reviews', async (t) => {
  const f = fixture(t);
  const a = adapter(f, (context, report) => {
    if (context.phase === 'code-review-and-quality' && context.iteration === 1) {
      report.outcome = 'fix';
      report.findings = [{ id: 'F1', summary: 'Missing edge case', evidence: 'app.txt' }];
    }
  });
  const result = await run(f, a);
  assert.equal(result.status, 'complete');
  assert.equal(result.iteration, 2);
  assert.equal(a.calls.filter((c) => c.phase === 'code-review').length, 2);
  assert.equal(a.calls.find((c) => c.iteration === 2).failures[0].findings[0].id, 'F1');
  assert.equal(result.reviews.length, REVIEW_PHASES.length + 1);
});

test('an agent cannot complete with missing acceptance evidence or unresolved findings', async (t) => {
  const mutations = [
    (report) => { report.criteria = []; },
    (report) => { report.criteria[0].criterion = 'invented'; },
    (report) => { report.findings = [{ id: 'F1', summary: 'Unresolved', evidence: 'app.txt' }]; },
    (report) => { report.evidence = ''; },
  ];
  for (const mutate of mutations) {
    const f = fixture(t);
    const a = adapter(f, (context, report) => { if (context.phase === 'implement') mutate(report); });
    await assert.rejects(run(f, a), /invalid implement report/);
    assert.equal(loopStatus({ cwd: f.root, id: 'feature' }).status, 'blocked');
    assert.equal(a.calls.length, 1);
  }
});

test('an adapter exit or missing JSON is incomplete and has an actionable reason', async (t) => {
  for (const code of [0, 1]) {
    const f = fixture(t);
    await assert.rejects(executeLoop({ cwd: f.root, contractPath: f.contractPath, runner: async () => ({ code }) }), code === 0 ? /did not write valid result/ : /exited with 1/);
    const state = loopStatus({ cwd: f.root, id: 'feature' });
    assert.equal(state.status, 'blocked');
    assert.ok(state.reason);
  }
});

test('a missing executable blocks the run without recreating a released lock', async (t) => {
  const f = fixture(t);
  f.contract.agent.command = path.join(f.root, 'nonexistent-operator-agent');
  write(f.root, 'contract.json', f.contract);
  await assert.rejects(executeLoop({ cwd: f.root, contractPath: f.contractPath }), /cannot run.*ENOENT/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fs.existsSync(path.join(f.root, 'temp/operator/execution.lock')), false);
  assert.equal(loopStatus({ cwd: f.root, id: 'feature' }).status, 'blocked');
});

test('a read-only review that mutates source forces a fresh round of verification', async (t) => {
  const f = fixture(t);
  const a = adapter(f, (context) => {
    if (context.phase === 'security-and-hardening' && context.iteration === 1) write(f.root, 'new-source.txt', 'changed');
  });
  const result = await run(f, a);
  assert.equal(result.iteration, 2);
  assert.match(result.history[0].failure.reason, /review changed/);
  assert.equal(a.calls.filter((c) => c.phase === 'code-review').length, 2);
});

test('a check that mutates source invalidates its result', async (t) => {
  const f = fixture(t);
  const a = adapter(f);
  let once = true;
  const result = await run(f, { runner: async (options) => {
    const execution = await a.runner(options);
    if (!options.env && once) { once = false; write(f.root, 'check-side-effect.txt', 'modified'); }
    return execution;
  } });
  assert.equal(result.iteration, 2);
  assert.match(result.history[0].failure.reason, /check changed/);
});

test('blocked human decisions resume without changing spec, tickets, or resetting the budget', async (t) => {
  const f = fixture(t);
  const a = adapter(f, (context, report) => {
    if (context.iteration === 1) { report.outcome = 'blocked'; report.reason = 'Need access to the staging fixture.'; }
  });
  const blocked = await run(f, a);
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.iteration, 1);
  const result = await executeLoop({ cwd: f.root, id: 'feature', resume: true, runner: a.runner });
  assert.equal(result.status, 'complete');
  assert.equal(result.iteration, 2);
});

test('contract and ticket changes reject resume before invoking the adapter', async (t) => {
  for (const file of ['contract.json', 'docs/ticket.md', 'docs/spec.md']) {
    const f = fixture(t);
    const a = adapter(f, (context, report) => { report.outcome = 'blocked'; report.reason = 'Need access.'; });
    await run(f, a);
    if (file === 'contract.json') { f.contract.budget.maxIterations++; write(f.root, file, f.contract); }
    else write(f.root, file, 'Changed acceptance criteria');
    const previous = a.calls.length;
    await assert.rejects(executeLoop({ cwd: f.root, id: 'feature', resume: true, runner: a.runner }), /changed; start a new run/);
    assert.equal(a.calls.length, previous);
  }
});

test('changing approved inputs during execution prevents completion', async (t) => {
  const f = fixture(t);
  const a = adapter(f, () => write(f.root, 'docs/ticket.md', 'Weakened criteria'));
  await assert.rejects(run(f, a), /changed during execution/);
  assert.notEqual(JSON.parse(fs.readFileSync(path.join(f.root, 'temp/operator/feature/state.json'))).status, 'complete');
});

test('stalled and exhausted runs remain incomplete', async (t) => {
  for (const maxIterations of [2, 5]) {
    const f = fixture(t, (c) => { c.budget.maxIterations = maxIterations; });
    const a = adapter(f, (context, report) => {
      report.outcome = 'fix';
      report.findings = [{ id: 'F1', summary: 'Same defect', evidence: 'app.txt' }];
    });
    const result = await run(f, a);
    assert.equal(result.status, maxIterations === 2 ? 'exhausted' : 'stalled');
    assert.ok(result.iteration <= maxIterations);
    const calls = a.calls.length;
    if (result.status === 'exhausted') {
      const resumed = await executeLoop({ cwd: f.root, id: 'feature', resume: true, runner: a.runner });
      assert.equal(resumed.status, 'exhausted');
      assert.equal(a.calls.length, calls);
    }
  }
});

test('a repository-wide lock rejects simultaneous loops and releases after completion', async (t) => {
  const f = fixture(t);
  const a = adapter(f, async () => {
    await assert.rejects(run(f, adapter(f)), /another Operator loop/);
  });
  await run(f, a);
  assert.equal(fs.existsSync(path.join(f.root, 'temp/operator/execution.lock')), false);
});

test('recovery refuses to overlap an orphan process from a crashed controller', async (t) => {
  const f = fixture(t);
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: process.platform !== 'win32', stdio: 'ignore' });
  t.after(() => child.kill('SIGKILL'));
  write(f.root, 'temp/operator/execution.lock', { pid: 2147483647, childPid: child.pid });
  const a = adapter(f);
  await assert.rejects(run(f, a), /previous loop process tree is still running/);
  assert.equal(a.calls.length, 0);
});

test('snapshot catches tracked edits, new files, deletions, and source mode changes', (t) => {
  const f = fixture(t);
  const original = loopSnapshot(f.root);
  write(f.root, 'app.txt', 'edit');
  assert.notEqual(loopSnapshot(f.root), original);
  write(f.root, 'app.txt', 'pending');
  write(f.root, 'new.txt', 'new');
  assert.notEqual(loopSnapshot(f.root), original);
  fs.unlinkSync(path.join(f.root, 'new.txt'));
  fs.unlinkSync(path.join(f.root, 'app.txt'));
  assert.notEqual(loopSnapshot(f.root), original);
  write(f.root, 'app.txt', 'pending');
  fs.chmodSync(path.join(f.root, 'app.txt'), 0o755);
  assert.notEqual(loopSnapshot(f.root), original);
});

test('completed results become stale after edits and resume rechecks them', async (t) => {
  const f = fixture(t);
  const a = adapter(f);
  await run(f, a);
  const calls = a.calls.length;
  await executeLoop({ cwd: f.root, id: 'feature', resume: true, runner: a.runner });
  assert.equal(a.calls.length, calls);
  write(f.root, 'app.txt', 'regression');
  assert.equal(loopStatus({ cwd: f.root, id: 'feature' }).status, 'stale');
  const result = await executeLoop({ cwd: f.root, id: 'feature', resume: true, runner: a.runner });
  assert.equal(result.status, 'complete');
  assert.equal(result.iteration, 2);
});

test('real subprocess adapter and CLI complete an offline implementation contract', async (t) => {
  const f = fixture(t);
  write(f.root, 'adapter.mjs', `import fs from 'node:fs';
const context = JSON.parse(fs.readFileSync(process.env.OPERATOR_CONTEXT, 'utf8'));
if (context.phase === 'implement') fs.writeFileSync('app.txt', 'done');
const report = { outcome: 'pass', evidence: 'app.txt and approved documents checked', findings: [] };
if (context.phase === 'implement') report.criteria = [{ticket: 'T1', criterion: 'C1', evidence: 'app.txt and behavior check'}];
fs.writeFileSync(process.env.OPERATOR_RESULT, JSON.stringify(report));
process.stdin.resume();
`);
  const cli = fileURLToPath(new URL('../bin/operator.mjs', import.meta.url));
  const output = execFileSync(process.execPath, [cli, 'loop', 'start', '--contract', 'contract.json'], { cwd: f.root, encoding: 'utf8' });
  assert.match(output, /"status":"complete"/);
  const status = JSON.parse(execFileSync(process.execPath, [cli, 'loop', 'status', '--id', 'feature'], { cwd: f.root, encoding: 'utf8' }));
  assert.equal(status.fresh, true);
  assert.ok(fs.existsSync(path.join(f.root, 'temp/operator/feature/iteration-1/code-review.log')));
  assert.throws(() => execFileSync(process.execPath, [cli, 'loop', 'start', '--contract', 'contract.json'], { cwd: f.root, stdio: 'pipe' }), (error) => error.status === 2);
  write(f.root, 'app.txt', 'regression');
  assert.throws(() => execFileSync(process.execPath, [cli, 'loop', 'status', '--id', 'feature'], { cwd: f.root, stdio: 'pipe' }), (error) => error.status === 1);
});

test('subprocess timeout and cancellation terminate the process and remain distinguishable', async (t) => {
  const root = tmpDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const timeout = await runLoopCommand({ command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], cwd: root, logPath: path.join(root, 'timeout.log'), timeoutMs: 100 });
  assert.equal(timeout.stopped, 'timeout');
  const controller = new AbortController();
  const running = runLoopCommand({ command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], cwd: root, logPath: path.join(root, 'cancel.log'), timeoutMs: 3000, signal: controller.signal });
  controller.abort();
  assert.equal((await running).stopped, 'cancelled');
});

test('an aborted loop persists an interrupted state and releases its lock', async (t) => {
  const f = fixture(t);
  const controller = new AbortController();
  controller.abort();
  const result = await executeLoop({ cwd: f.root, contractPath: f.contractPath, signal: controller.signal });
  assert.equal(result.status, 'interrupted');
  assert.equal(result.iteration, 0);
  assert.equal(fs.existsSync(path.join(f.root, 'temp/operator/execution.lock')), false);
});
