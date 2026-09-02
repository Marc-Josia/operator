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
 *   repo: string,
 *   branch: string,
 *   dir: string,
 *   files: string[],
 * }} CatalogReferences
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 * }} CatalogAgent
 *
 * @typedef {{
 *   version: number,
 *   sources: CatalogSource[],
 *   operatorSkill: string,
 *   skip: string[],
 *   agents: CatalogAgent[],
 *   references: CatalogReferences,
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

/** @param {Catalog} catalog */
export function managedSkillNames(catalog) {
  return [...allCatalogSkills(catalog), catalog.operatorSkill];
}

/** @param {string} packageRoot */
export function payloadDir(packageRoot) {
  return path.join(packageRoot, 'src', 'payload');
}

/** @param {string} packageRoot */
export function operatorSkillDir(packageRoot) {
  return path.join(payloadDir(packageRoot), 'skills', 'operator');
}

/** @param {string} packageRoot */
export function agentsBlockPath(packageRoot) {
  return path.join(packageRoot, 'src', 'payload', 'agents-block.md');
}
