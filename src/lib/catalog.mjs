import path from 'node:path';
import { readJson } from './fsutil.mjs';

/**
 * @typedef {{
 *   id: string,
 *   repo: string,
 *   skills: string[],
 * }} CatalogSource
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 * }} CatalogAgent
 *
 * @typedef {{
 *   version: number,
 *   ownSkills: string[],
 *   sources: CatalogSource[],
 *   legacySkills: string[],
 *   agents: CatalogAgent[],
 * }} Catalog
 */

/** @param {string} packageRoot */
export function catalogPath(packageRoot) {
  return path.join(packageRoot, 'src', 'catalog.json');
}

/** @param {string} packageRoot */
export function loadCatalog(packageRoot) {
  /** @type {Catalog} */
  const catalog = readJson(catalogPath(packageRoot));
  if (!Array.isArray(catalog.sources) || catalog.sources.length === 0) {
    throw new Error('catalog.json is missing sources');
  }
  if (!Array.isArray(catalog.agents) || catalog.agents.length === 0) {
    throw new Error('catalog.json is missing agents');
  }
  return catalog;
}

/** @param {Catalog} catalog */
export function allCatalogSkills(catalog) {
  return catalog.sources.flatMap((source) => source.skills);
}

/**
 * Every skill Operator installs: its own skills, then pstack.
 * @param {Catalog} catalog
 */
export function managedSkillNames(catalog) {
  return [...ownSkillNames(catalog), ...allCatalogSkills(catalog)];
}

/**
 * Skills Operator writes itself, shipped from `src/payload/skills/<name>/`.
 * @param {Catalog} catalog
 */
export function ownSkillNames(catalog) {
  return [...(catalog.ownSkills ?? [])];
}

/**
 * v2 skill names (Matt Pocock, Addy Osmani, the v2 `operator` router) to remove on update.
 * @param {Catalog} catalog
 */
export function legacySkillNames(catalog) {
  return [...(catalog.legacySkills ?? [])];
}

/**
 * Legacy names that are not also own skills: installed copies are leftovers to remove.
 * Same-named ones (`implement`, `retro`, …) are overwritten by the own skill instead.
 * @param {Catalog} catalog
 */
export function legacyOnlySkillNames(catalog) {
  const own = new Set(ownSkillNames(catalog));
  return legacySkillNames(catalog).filter((name) => !own.has(name));
}

/** @param {string} packageRoot */
export function payloadDir(packageRoot) {
  return path.join(packageRoot, 'src', 'payload');
}

/** @param {string} packageRoot */
export function agentsBlockPath(packageRoot) {
  return path.join(packageRoot, 'src', 'payload', 'agents-block.md');
}
