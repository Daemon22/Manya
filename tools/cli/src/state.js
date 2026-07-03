/**
 * Manya CLI — state persistence.
 *
 * The mesh and identity store are in-memory in @manya/unify. To make them
 * survive across CLI invocations, we persist their state to a JSON file
 * (default: ~/.manya/state.json) and hydrate the unify modules on each
 * command invocation.
 *
 * State shape:
 *   {
 *     tools: [{ manifest, registeredAt }],  // api objects are not serializable; rebuilt on load
 *     identities: FederatedIdentity[],
 *     bus: { events: EnrichedEvent[], subscribers: [] }  // subscribers are not serializable
 *   }
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const DEFAULT_STATE_PATH = join(homedir(), '.manya', 'state.json');

/**
 * Returns the resolved state file path.
 * @param {string} [override] - Optional override path.
 * @returns {string}
 */
export function statePath(override) {
  return override || process.env.MANYA_STATE || DEFAULT_STATE_PATH;
}

/**
 * Loads state from disk. Returns an empty state structure if the file
 * does not exist or is unreadable.
 * @param {string} [path] - Optional path override.
 * @returns {{ tools: any[], identities: any[], busEvents: any[] }}
 */
export function loadState(path) {
  const resolved = statePath(path);
  if (!existsSync(resolved)) {
    return { tools: [], identities: [], busEvents: [] };
  }
  try {
    const raw = readFileSync(resolved, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      identities: Array.isArray(parsed.identities) ? parsed.identities : [],
      busEvents: Array.isArray(parsed.busEvents) ? parsed.busEvents : [],
    };
  } catch (err) {
    return { tools: [], identities: [], busEvents: [] };
  }
}

/**
 * Saves state to disk, creating parent directories as needed.
 * @param {object} state - State to save.
 * @param {string} [path] - Optional path override.
 * @returns {string} The path the state was written to.
 */
export function saveState(state, path) {
  const resolved = statePath(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, JSON.stringify(state, null, 2), 'utf8');
  return resolved;
}

/**
 * Resets state by deleting the state file.
 * @param {string} [path] - Optional path override.
 * @returns {boolean} True if the file was deleted, false if it didn't exist.
 */
export function resetState(path) {
  const resolved = statePath(path);
  if (!existsSync(resolved)) return false;
  writeFileSync(resolved, JSON.stringify({ tools: [], identities: [], busEvents: [] }, null, 2), 'utf8');
  return true;
}

/**
 * Returns the default state path (for diagnostics).
 * @returns {string}
 */
export function defaultStatePath() {
  return DEFAULT_STATE_PATH;
}
