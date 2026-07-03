/**
 * Manya Unify — Mesh: tool registry, capability routing, and sync-channel
 * coordination.
 *
 * The mesh is the runtime equivalent of the @manya/toolkit manifests. Each
 * tool registers itself with its manifest and API object; the mesh then
 * routes capability-based calls to the owning tool and exposes the union of
 * all declared sync channels for the event bus.
 */

import { capabilityOwners } from '@manya/toolkit';
import { randomUUID } from 'node:crypto';

/**
 * In-memory tool registry. Each entry maps toolId -> { manifest, api, registeredAt }.
 * @type {Map<string, { manifest: object, api: object, registeredAt: string }>}
 */
const registry = new Map();

/**
 * Registers a tool with the mesh.
 * @param {object} input - Registration input.
 * @param {object} input.manifest - The tool manifest (from @manya/toolkit).
 * @param {object} input.api - The tool's unified API object (default export).
 * @returns {{ toolId: string, registeredAt: string, owns: string[], syncChannels: string[] }}
 * @throws {Error} If manifest is missing id, or api is not an object, or tool already registered.
 */
export function registerTool({ manifest, api }) {
  if (!manifest || !manifest.id) {
    throw new Error('registerTool requires a manifest with an id');
  }
  if (!api || typeof api !== 'object') {
    throw new Error('registerTool requires an api object');
  }
  if (registry.has(manifest.id)) {
    throw new Error(`Tool "${manifest.id}" is already registered with the mesh`);
  }
  const registeredAt = new Date().toISOString();
  registry.set(manifest.id, { manifest, api, registeredAt });
  return {
    toolId: manifest.id,
    registeredAt,
    owns: [...(manifest.owns || [])],
    syncChannels: [...(manifest.syncChannels || [])],
  };
}

/**
 * De-registers a tool from the mesh.
 * @param {string} toolId - The tool identifier.
 * @returns {boolean} True if the tool was removed, false if it was not registered.
 */
export function unregisterTool(toolId) {
  return registry.delete(toolId);
}

/**
 * Retrieves a registered tool by id.
 * @param {string} toolId - The tool identifier.
 * @returns {{ manifest: object, api: object, registeredAt: string }|null}
 */
export function getTool(toolId) {
  return registry.get(toolId) || null;
}

/**
 * Lists all registered tools with summary info.
 * @returns {Array<{ toolId: string, name: string, purpose: string, owns: string[], syncChannels: string[], registeredAt: string }>}
 */
export function listTools() {
  return Array.from(registry.values()).map(({ manifest, registeredAt }) => ({
    toolId: manifest.id,
    name: manifest.name,
    purpose: manifest.purpose,
    owns: [...(manifest.owns || [])],
    syncChannels: [...(manifest.syncChannels || [])],
    registeredAt,
  }));
}

/**
 * Routes a capability to the tool that owns it.
 * @param {string} capability - The capability identifier (e.g. 'citationValidation').
 * @returns {{ toolId: string, api: object }|null} The owning tool's id and API, or null if unowned.
 */
export function route(capability) {
  const toolId = capabilityOwners[capability];
  if (!toolId) return null;
  const entry = registry.get(toolId);
  if (!entry) {
    // Capability is declared in the toolkit but the owning tool is not registered.
    return { toolId, api: null, registered: false };
  }
  return { toolId, api: entry.api, registered: true };
}

/**
 * Dispatches a method call to the tool that owns a capability.
 * @param {string} capability - The capability identifier.
 * @param {string} method - The method name on the tool's API object.
 * @param {Array} [args=[]] - Arguments to pass to the method.
 * @returns {any} The return value of the method.
 * @throws {Error} If the capability is unowned, the tool is not registered, or the method doesn't exist.
 */
export function dispatch(capability, method, args = []) {
  const routeResult = route(capability);
  if (!routeResult) {
    throw new Error(`Capability "${capability}" is not owned by any tool`);
  }
  if (!routeResult.registered || !routeResult.api) {
    throw new Error(`Tool "${routeResult.toolId}" (owner of "${capability}") is not registered with the mesh`);
  }
  const fn = routeResult.api[method];
  if (typeof fn !== 'function') {
    throw new Error(`Tool "${routeResult.toolId}" does not expose method "${method}"`);
  }
  return fn(...args);
}

/**
 * Collects the union of all sync channels declared by registered tools.
 * @returns {Array<{ channel: string, owners: string[] }>}
 */
export function getSyncChannels() {
  const channelMap = new Map();
  for (const { manifest } of registry.values()) {
    for (const channel of manifest.syncChannels || []) {
      if (!channelMap.has(channel)) channelMap.set(channel, []);
      channelMap.get(channel).push(manifest.id);
    }
  }
  return Array.from(channelMap.entries()).map(([channel, owners]) => ({ channel, owners }));
}

/**
 * Finds all tools that have declared a given capability in their `handsOff` list.
 * Useful for impact analysis before changing a capability's contract.
 * @param {string} capability - The capability identifier.
 * @returns {Array<string>} Tool ids that have handsOff on this capability.
 */
export function findConsumers(capability) {
  const consumers = [];
  for (const { manifest } of registry.values()) {
    if ((manifest.handsOff || []).includes(capability)) {
      consumers.push(manifest.id);
    }
  }
  return consumers;
}

/**
 * Resets the mesh registry. Primarily for testing.
 * @returns {void}
 */
export function _resetMesh() {
  registry.clear();
}

/**
 * Generates a deterministic-ish identifier for mesh operations.
 * @returns {string}
 */
export function _meshId() {
  return `mesh-${randomUUID().slice(0, 8)}`;
}
