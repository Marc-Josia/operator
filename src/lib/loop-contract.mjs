import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { OperatorError, readJson } from './fsutil.mjs';
import { PROJECT_SKILL_DIRS, GLOBAL_SKILL_DIRS } from './scan.mjs';

export const REVIEW_PHASES = [
  'code-review',
  'security-and-hardening',
  'observability-and-instrumentation',
  'ci-cd-and-automation',
  'code-review-and-quality',
];

// Pin actual installed skill instructions, including globally installed packs.
export function loadLoopSkills(root, phases) {
  const skills = [];
  for (const name of ['implement', 'tdd', ...phases]) {
    const candidates = [
      ...PROJECT_SKILL_DIRS.map((directory) => path.join(root, directory, name, 'SKILL.md')),
      ...GLOBAL_SKILL_DIRS.map((directory) => path.join(os.homedir(), directory, name, 'SKILL.md')),
    ];
    const file = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) throw new OperatorError(`missing required skill ${name}; install Operator and run setup before implementation`, 2);
    const content = fs.readFileSync(file, 'utf8');
    if (!content.trim()) throw new OperatorError(`required skill ${name} is empty`, 2);
    skills.push({ name, path: fs.realpathSync(file), content });
  }
  const digest = createHash('sha256').update(JSON.stringify(skills)).digest('hex');
  return { skills, digest };
}

function requireValue(condition, message) {
  if (!condition) throw new OperatorError(`invalid loop contract: ${message}`, 2);
}

function identifier(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function command(value, label) {
  requireValue(value && text(value.command), `${label}.command is required`);
  requireValue(Array.isArray(value.args) && value.args.every((arg) => typeof arg === 'string'), `${label}.args must be an array of strings`);
}

function source(root, relative, label) {
  requireValue(text(relative) && !path.isAbsolute(relative), `${label} must be a project-relative file`);
  const absolute = path.resolve(root, relative);
  const inside = (file) => file.startsWith(`${root}${path.sep}`) && !file.startsWith(path.join(root, 'temp', 'operator') + path.sep);
  requireValue(inside(absolute), `${label} must be outside temp/operator and inside the project`);
  requireValue(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `${label} must exist`);
  requireValue(inside(fs.realpathSync(absolute)), `${label} resolves outside the project`);
  const content = fs.readFileSync(absolute, 'utf8');
  requireValue(content.trim().length > 0, `${label} must not be empty`);
  return { path: relative, content };
}

// Validate and pin the approved spec, ticket graph, commands, and budgets before spawning anything.
export function loadLoopContract(file, root) {
  root = fs.realpathSync(root);
  let value;
  try { value = readJson(file); } catch (error) {
    throw new OperatorError(`cannot read loop contract: ${error.message}`, 2);
  }
  requireValue(value && value.version === 1, 'version must be 1');
  requireValue(identifier(value.id), 'id must be a safe identifier');
  requireValue(value.approved === true, 'approved must be true after user approval of the spec and tickets');
  const spec = source(root, value.spec, 'spec');
  requireValue(Array.isArray(value.tickets) && value.tickets.length > 0, 'tickets are required');
  requireValue(Array.isArray(value.checks) && value.checks.length > 0, 'checks are required');
  const checkIds = new Set();
  for (const check of value.checks) {
    requireValue(identifier(check.id) && !checkIds.has(check.id), 'check ids must be unique identifiers');
    checkIds.add(check.id);
    command(check, `check ${check.id}`);
  }
  command(value.agent, 'agent');
  if (value.reviewer !== undefined) command(value.reviewer, 'reviewer');
  requireValue(typeof value.deprecation === 'boolean', 'deprecation must be true or false');
  const budget = value.budget;
  for (const key of ['maxIterations', 'maxNoProgress', 'timeoutMs']) {
    requireValue(budget && Number.isSafeInteger(budget[key]) && budget[key] > 0, `budget.${key} must be a positive integer`);
  }
  requireValue(budget.timeoutMs <= 2147483647, 'budget.timeoutMs exceeds the process timer range');
  const tickets = new Map();
  const criteriaIds = new Set();
  const sources = [spec];
  for (const ticket of value.tickets) {
    requireValue(identifier(ticket.id) && !tickets.has(ticket.id), 'ticket ids must be unique identifiers');
    requireValue(Array.isArray(ticket.dependsOn) && ticket.dependsOn.every(identifier), `ticket ${ticket.id} needs dependsOn`);
    requireValue(Array.isArray(ticket.criteria) && ticket.criteria.length > 0, `ticket ${ticket.id} needs acceptance criteria`);
    for (const criterion of ticket.criteria) {
      requireValue(identifier(criterion.id) && !criteriaIds.has(criterion.id), 'criterion ids must be globally unique identifiers');
      criteriaIds.add(criterion.id);
      requireValue(text(criterion.description), `criterion ${criterion.id} needs a description`);
      requireValue(Array.isArray(criterion.checks) && criterion.checks.length > 0 && criterion.checks.every((id) => checkIds.has(id)), `criterion ${criterion.id} must reference required checks`);
    }
    sources.push(source(root, ticket.path, `ticket ${ticket.id}.path`));
    tickets.set(ticket.id, ticket);
  }
  const order = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    requireValue(tickets.has(id), `unknown ticket dependency ${id}`);
    requireValue(!visiting.has(id), 'ticket dependency cycle');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of tickets.get(id).dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }
  for (const id of tickets.keys()) visit(id);
  const phases = [...REVIEW_PHASES];
  if (value.deprecation) phases.push('deprecation-and-migration');
  phases.push('shipping-and-launch');
  const digest = createHash('sha256').update(JSON.stringify({ value, sources })).digest('hex');
  return { value, sources, order, phases, digest };
}

// Reports record model judgments; the controller separately executes checks and verifies freshness.
export function validateLoopReport(report, phase, contract) {
  const fail = (message) => { throw new OperatorError(`invalid ${phase} report: ${message}`); };
  if (!report || !['pass', 'fix', 'blocked'].includes(report.outcome)) fail('outcome must be pass, fix, or blocked');
  if (!text(report.evidence)) fail('evidence is required');
  if (!Array.isArray(report.findings) || report.findings.some((finding) => !text(finding.id) || !text(finding.summary) || !text(finding.evidence))) fail('findings need id, summary, and evidence');
  if (report.outcome === 'pass' && report.findings.length > 0) fail('pass cannot have unresolved findings');
  if (report.outcome === 'fix' && report.findings.length === 0) fail('fix needs findings');
  if (report.outcome === 'blocked' && !text(report.reason)) fail('blocked needs an actionable reason');
  if (phase === 'implement' && report.outcome === 'pass') {
    const expected = contract.tickets.flatMap((ticket) => ticket.criteria.map((criterion) => ({ ticket: ticket.id, criterion: criterion.id })));
    if (!Array.isArray(report.criteria) || report.criteria.length !== expected.length) fail('every ticket criterion needs evidence');
    const seen = new Set();
    for (const proof of report.criteria) {
      const key = `${proof.ticket}/${proof.criterion}`;
      if (seen.has(key) || !expected.some((item) => item.ticket === proof.ticket && item.criterion === proof.criterion) || !text(proof.evidence)) fail('criterion evidence is missing, duplicated, or unknown');
      seen.add(key);
    }
  }
  return report;
}
