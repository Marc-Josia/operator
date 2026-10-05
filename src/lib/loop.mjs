import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { OperatorError, readJson } from './fsutil.mjs';
import { loadLoopContract, loadLoopSkills, validateLoopReport } from './loop-contract.mjs';

const RUNS = 'temp/operator';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function projectRoot(cwd) {
  try { return fs.realpathSync(git(cwd, ['rev-parse', '--show-toplevel']).trim()); } catch {
    throw new OperatorError('operator loop requires a Git working tree', 2);
  }
}

// Hash tracked and nonignored untracked files, including deletions and executable bits.
export function loopSnapshot(root) {
  const files = [...new Set(git(root, ['ls-files', '-c', '-o', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort();
  const hash = createHash('sha256');
  try { hash.update(git(root, ['rev-parse', '--verify', '--quiet', 'HEAD'])); } catch {
    // A new Git repository can implement its first feature before the first commit.
    hash.update('unborn-head');
  }
  for (const file of files) {
    if (file.startsWith(`${RUNS}/`)) continue;
    hash.update(JSON.stringify(file));
    const absolute = path.join(root, file);
    try {
      const stat = fs.lstatSync(absolute);
      hash.update(String(stat.mode));
      if (stat.isSymbolicLink()) hash.update(fs.readlinkSync(absolute));
      else if (stat.isFile()) hash.update(fs.readFileSync(absolute));
      else throw new OperatorError(`unsupported snapshot entry: ${file}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      hash.update('deleted');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

function writeAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
}

function runPaths(root, id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id)) throw new OperatorError('loop id must be a safe identifier', 2);
  const dir = path.join(root, RUNS, id);
  return { dir, state: path.join(dir, 'state.json') };
}

function acquireLock(root) {
  const file = path.join(root, RUNS, 'execution.lock');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(file, 'wx');
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid }));
      fs.closeSync(fd);
      return {
        release: () => fs.unlinkSync(file),
        recordChild: (childPid) => writeAtomic(file, { pid: process.pid, childPid }),
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const lock = readJson(file);
      try { process.kill(lock.pid, 0); } catch (probe) {
        if (probe.code === 'ESRCH') {
          if (lock.childPid) {
            try {
              process.kill(process.platform === 'win32' ? lock.childPid : -lock.childPid, 0);
              throw new OperatorError(`previous loop process tree is still running (pid ${lock.childPid}); wait or stop it before resuming`);
            } catch (childProbe) {
              if (childProbe.code !== 'ESRCH') throw childProbe;
            }
          }
          fs.unlinkSync(file);
          continue;
        }
      }
      throw new OperatorError('another Operator loop owns this working tree');
    }
  }
  throw new OperatorError('cannot acquire Operator loop lock');
}

// Run an explicit argv without shell expansion, logging both streams and terminating on timeout/cancel.
export function runLoopCommand({ command, args, cwd, stdin = '', env = {}, logPath, timeoutMs, signal, onSpawn = () => {}, onClose = () => {} }) {
  return new Promise((resolve, reject) => {
    const output = fs.openSync(logPath, 'w');
    const child = spawn(command, args, {
      cwd, env: { ...process.env, ...env }, shell: false,
      detached: process.platform !== 'win32', stdio: ['pipe', output, output],
    });
    fs.closeSync(output);
    let stopped;
    let cleaned = false;
    function kill(kind) {
      stopped = kind;
      if (!child.pid) return;
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
        else execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      } catch (error) {
        if (process.platform !== 'win32' && error.code !== 'ESRCH') child.kill('SIGKILL');
      }
    }
    const abort = () => kill('cancelled');
    const timer = setTimeout(() => kill('timeout'), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    child.stdin.on('error', () => {}); // An adapter may exit before consuming its prompt.
    child.stdin.end(stdin);
    if (signal?.aborted) abort();
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (child.pid && process.platform !== 'win32') {
        try { process.kill(-child.pid, 'SIGKILL'); } catch {}
      }
      onClose();
    }
    child.on('error', (error) => { cleanup(); reject(new OperatorError(`cannot run ${command}: ${error.message}`)); });
    child.on('close', (code, childSignal) => { cleanup(); resolve({ code, signal: childSignal, stopped }); });
    try { if (child.pid) onSpawn(child.pid); } catch (error) {
      kill('cancelled');
      cleanup();
      reject(error);
    }
  });
}

function prompt(context) {
  return `You are executing the approved Operator implementation contract.\nRead the project's AGENTS.md and the installed SKILL.md for ${context.phase}; follow the skill within the authorization below. Read the spec and every ticket. Implement in dependency order. Keep spec, tickets, acceptance criteria, and required checks intact.\n${context.phase === 'implement' ? 'Use Matt tdd at agreed seams, correct the supplied failures, and write criterion evidence for every ticket. The controller runs the required checks and reviews after you exit.' : 'Review only. Report every unresolved finding. The controller returns findings to implementation. Assess this phase without changing project files.'}\nUse shipping-and-launch for readiness only. Merge, push, deploy, publication, credentials changes, and destructive external operations require authorization outside this contract. Preserve the host permission policy. If a skill needs a human decision already resolved by the spec/tickets, use that decision; otherwise report blocked with the exact question.\nWrite JSON to ${context.resultPath}, with outcome (pass, fix, blocked), evidence (concrete files, checks, or observations), findings [{id, summary, evidence}], and reason when blocked. An implement pass also needs criteria [{ticket, criterion, evidence}] for every criterion. Pass requires no unresolved findings. Do not weaken checks to make them pass.\nContext:\n${JSON.stringify(context, null, 2)}\n`;
}

// Read-only status distinguishes a completed historical run from current verification.
export function loopStatus({ cwd = process.cwd(), id }) {
  const root = projectRoot(cwd);
  const paths = runPaths(root, id);
  const state = readJson(paths.state);
  const contract = loadLoopContract(state.contractPath, root);
  const fresh = contract.digest === state.contractDigest && loadLoopSkills(root, contract.phases).digest === state.skillsDigest && state.snapshot === loopSnapshot(root);
  return { ...state, status: state.status === 'complete' && !fresh ? 'stale' : state.status, fresh };
}

// Start/resume a bounded run. Only this controller can advance the sequence or declare completion.
export async function executeLoop({ cwd = process.cwd(), contractPath, id, resume = false, runner = runLoopCommand, onProgress = () => {}, signal }) {
  const root = projectRoot(cwd);
  const lock = acquireLock(root);
  let state;
  let paths;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  try {
    if (resume) {
      paths = runPaths(root, id);
      state = readJson(paths.state);
      contractPath = state.contractPath;
    } else {
      if (!contractPath) throw new OperatorError('loop start requires --contract', 2);
      contractPath = path.resolve(root, contractPath);
    }
    const contract = loadLoopContract(contractPath, root);
    const installed = loadLoopSkills(root, contract.phases);
    paths ??= runPaths(root, contract.value.id);
    if (resume && contract.digest !== state.contractDigest) throw new OperatorError('approved contract, spec, or tickets changed; start a new run with a new id', 2);
    if (resume && installed.digest !== state.skillsDigest) throw new OperatorError('installed skills changed; start a new run with a new id', 2);
    if (!resume && fs.existsSync(paths.state)) throw new OperatorError('loop id already exists; resume it or use a new id', 2);
    const current = loopSnapshot(root);
    if (resume && state.status === 'complete' && state.snapshot === current) return state;
    state ??= {
      version: 1, id: contract.value.id, contractPath, contractDigest: contract.digest,
      skillsDigest: installed.digest,
      iteration: 0, noProgress: 0, status: 'running', phase: 'implement', history: [], failures: [],
    };
    if (state.snapshot !== current) { state.noProgress = 0; state.lastFailure = undefined; }
    fs.mkdirSync(paths.dir, { recursive: true });
    writeAtomic(path.join(paths.dir, 'approved.json'), { contract: contract.value, sources: contract.sources, order: contract.order, skills: installed.skills });
    const save = () => writeAtomic(paths.state, state);
    const stop = (status, reason, snapshot) => {
      state.status = status;
      state.reason = reason;
      state.snapshot = snapshot ?? loopSnapshot(root);
      save();
      onProgress({ id: state.id, status, reason });
      return state;
    };
    const stillApproved = () => {
      if (loadLoopContract(contractPath, root).digest !== contract.digest) throw new OperatorError('approved contract, spec, or tickets changed during execution');
      if (loadLoopSkills(root, contract.phases).digest !== installed.digest) throw new OperatorError('installed skill instructions changed during execution');
    };
    while (state.iteration < contract.value.budget.maxIterations) {
      if (controller.signal.aborted) return stop('interrupted', 'execution cancelled; resume preserves the remaining iteration budget');
      stillApproved();
      state.iteration++;
      state.status = 'running';
      delete state.reason;
      state.checks = [];
      state.reviews = [];
      state.criteria = [];
      const attempt = path.join(paths.dir, `iteration-${state.iteration}`);
      fs.mkdirSync(attempt, { recursive: true });
      const beginning = loopSnapshot(root);
      let failure;
      async function agent(phase) {
        state.phase = phase;
        save();
        const resultPath = path.join(attempt, `${phase}.result.json`);
        const context = {
          phase, iteration: state.iteration, projectRoot: root, contract: contract.value,
          sources: contract.sources, ticketOrder: contract.order, failures: state.failures,
          skills: installed.skills.filter((skill) => skill.name === phase || (phase === 'implement' && skill.name === 'tdd')),
          snapshot: loopSnapshot(root), resultPath,
        };
        const input = prompt(context);
        const contextPath = path.join(attempt, `${phase}.context.json`);
        writeAtomic(contextPath, context);
        fs.writeFileSync(path.join(attempt, `${phase}.prompt.txt`), input);
        onProgress({ id: state.id, iteration: state.iteration, phase });
        const adapter = phase === 'implement' ? contract.value.agent : (contract.value.reviewer ?? contract.value.agent);
        const execution = await runner({ ...adapter, cwd: root, stdin: input, logPath: path.join(attempt, `${phase}.log`), timeoutMs: contract.value.budget.timeoutMs, signal: controller.signal, onSpawn: lock.recordChild, onClose: () => lock.recordChild(undefined), env: { OPERATOR_CONTEXT: contextPath, OPERATOR_RESULT: resultPath } });
        if (controller.signal.aborted || execution.stopped === 'cancelled') throw new OperatorError('execution cancelled');
        if (execution.code !== 0 || execution.stopped) throw new OperatorError(`${phase} adapter ${execution.stopped ?? `exited with ${execution.code}`}; see ${attempt}`);
        stillApproved();
        let report;
        try { report = readJson(resultPath); } catch { throw new OperatorError(`${phase} adapter did not write valid result JSON`); }
        return { report: validateLoopReport(report, phase, contract.value), before: context.snapshot };
      }
      const implementation = await agent('implement');
      if (implementation.report.outcome === 'blocked') return stop('blocked', implementation.report.reason);
      if (implementation.report.outcome === 'fix') failure = { phase: 'implement', findings: implementation.report.findings };
      else {
        state.criteria = implementation.report.criteria;
        const verified = loopSnapshot(root);
        for (const check of contract.value.checks) {
          state.phase = `check:${check.id}`;
          save();
          onProgress({ id: state.id, iteration: state.iteration, phase: state.phase });
          const result = await runner({ ...check, cwd: root, logPath: path.join(attempt, `check-${check.id}.log`), timeoutMs: contract.value.budget.timeoutMs, signal: controller.signal, onSpawn: lock.recordChild, onClose: () => lock.recordChild(undefined) });
          if (controller.signal.aborted) return stop('interrupted', 'execution cancelled during checks');
          stillApproved();
          state.checks.push({ id: check.id, ...result, snapshot: verified });
          writeAtomic(path.join(attempt, `check-${check.id}.result.json`), state.checks.at(-1));
          if (result.stopped) return stop('blocked', `check ${check.id} ${result.stopped}; inspect its log`);
          if (result.code !== 0) { failure = { phase: state.phase, reason: `check ${check.id} failed`, log: path.join(attempt, `check-${check.id}.log`) }; break; }
          if (loopSnapshot(root) !== verified) { failure = { phase: state.phase, reason: 'check changed the repository; verification must restart' }; break; }
        }
        if (!failure) {
          for (const phase of contract.phases) {
            const review = await agent(phase);
            const after = loopSnapshot(root);
            if (review.before !== verified || after !== verified) { failure = { phase, reason: 'review changed the repository; checks and reviews must restart' }; break; }
            if (review.report.outcome === 'blocked') return stop('blocked', review.report.reason);
            if (review.report.outcome === 'fix') { failure = { phase, findings: review.report.findings }; break; }
            state.reviews.push({ phase, snapshot: verified, evidence: review.report.evidence });
          }
        }
        if (!failure) {
          stillApproved();
          if (loopSnapshot(root) !== verified) failure = { phase: 'final', reason: 'repository changed before completion' };
          else {
            state.failures = [];
            state.history.push({ iteration: state.iteration, snapshot: verified, outcome: 'pass' });
            return stop('complete', 'all ticket criteria, required checks, and sequential reviews passed on the same snapshot', verified);
          }
        }
      }
      const ending = loopSnapshot(root);
      const signature = JSON.stringify(failure);
      state.noProgress = beginning === ending && state.lastFailure === signature ? state.noProgress + 1 : 0;
      state.lastFailure = signature;
      state.failures = [failure];
      state.snapshot = ending;
      state.history.push({ iteration: state.iteration, snapshot: ending, outcome: 'fix', failure });
      state.phase = 'implement';
      save();
      if (state.noProgress >= contract.value.budget.maxNoProgress) return stop('stalled', 'same failure repeated without repository progress');
    }
    return stop('exhausted', 'iteration budget exhausted; run remains incomplete');
  } catch (error) {
    if (state && paths) {
      state.status = controller.signal.aborted ? 'interrupted' : 'blocked';
      state.reason = error.message;
      writeAtomic(paths.state, state);
      if (controller.signal.aborted) return state;
    }
    throw error;
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
    signal?.removeEventListener('abort', cancel);
    lock.release();
  }
}
