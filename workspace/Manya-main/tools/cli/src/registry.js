/**
 * Manya CLI — tool registry.
 *
 * Maps each CLI-accessible Manya tool id to its manifest and an API loader.
 * The loader uses async dynamic import() to fetch the tool's actual API
 * object so dispatch() can invoke methods on it. We use lazy loading so
 * the CLI only loads a tool's source when it's actually needed.
 *
 * foundation/knowledge/transport are the Manya 1.1 connective packages:
 * their module namespaces expose the domain factories, and the serve layer
 * binds them to live domain instances. Dispatching their capabilities from
 * the plain CLI returns the module-level factories; use `manya serve` (or
 * @manya/core-runtime) for instance-bound calls.
 */

import {
  forgeManifest,
  pulseManifest,
  primarySectorManifest,
  cybersecurityManifest,
  transportLogisticsManifest,
  researchAcademicManifest,
  unifyManifest,
  foundationManifest,
  knowledgeManifest,
  transportManifest,
} from '@manya/toolkit';

const TOOL_DEFS = [
  {
    id: 'forge',
    manifest: forgeManifest,
    apiLoader: async () => {
      const m = await import('../../forge/src/index.js');
      return m.forge || m.default || m;
    },
  },
  {
    id: 'pulse',
    manifest: pulseManifest,
    apiLoader: async () => {
      const m = await import('../../pulse/src/index.js');
      return m.pulse || m.default || m;
    },
  },
  {
    id: 'primary-sector',
    manifest: primarySectorManifest,
    apiLoader: async () => {
      const m = await import('../../primary-sector/src/index.js');
      return m.primarySector || m.default || m;
    },
  },
  {
    id: 'cybersecurity',
    manifest: cybersecurityManifest,
    apiLoader: async () => {
      const m = await import('../../cybersecurity/src/index.js');
      return m.cybersecurity || m.default || m;
    },
  },
  {
    id: 'transport-logistics',
    manifest: transportLogisticsManifest,
    apiLoader: async () => {
      const m = await import('../../transport-logistics/src/index.js');
      return m.transportLogistics || m.default || m;
    },
  },
  {
    id: 'research-academic',
    manifest: researchAcademicManifest,
    apiLoader: async () => {
      const m = await import('../../research-academic/src/index.js');
      return m.researchAcademic || m.default || m;
    },
  },
  {
    id: 'unify',
    manifest: unifyManifest,
    apiLoader: async () => {
      const m = await import('../../unify/src/index.js');
      return m.unify || m.default || m;
    },
  },
  {
    id: 'foundation',
    manifest: foundationManifest,
    apiLoader: async () => {
      const m = await import('../../../packages/foundation/src/index.js');
      return m.default || m;
    },
  },
  {
    id: 'knowledge',
    manifest: knowledgeManifest,
    apiLoader: async () => {
      const m = await import('../../../packages/knowledge/src/index.js');
      return m.default || m;
    },
  },
  {
    id: 'transport',
    manifest: transportManifest,
    apiLoader: async () => {
      const m = await import('../../../packages/transport/src/index.js');
      return m.default || m;
    },
  },
];

/**
 * Returns the tool definition for a given id.
 * @param {string} id
 * @returns {{ id: string, manifest: object, apiLoader: () => Promise<object> }|null}
 */
export function getToolDef(id) {
  return TOOL_DEFS.find(t => t.id === id) || null;
}

/**
 * Returns the list of all known tool ids.
 * @returns {string[]}
 */
export function knownToolIds() {
  return TOOL_DEFS.map(t => t.id);
}

/**
 * Returns all tool definitions.
 * @returns {typeof TOOL_DEFS}
 */
export function allToolDefs() {
  return [...TOOL_DEFS];
}
