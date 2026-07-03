/**
 * Manya CLI — tool registry.
 *
 * Maps each of the 15 Manya tool ids to its manifest and an API loader.
 * The loader uses async dynamic import() to fetch the tool's actual API
 * object so dispatch() can invoke methods on it. We use lazy loading so
 * the CLI only loads a tool's source when it's actually needed.
 */

import {
  forgeManifest,
  pulseManifest,
  primarySectorManifest,
  cybersecurityManifest,
  transportLogisticsManifest,
  researchAcademicManifest,
  unifyManifest,
  lyconManifest,
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
    id: 'lycon-browser',
    manifest: lyconManifest,
    apiLoader: async () => {
      // The Lycon browser's manya integration layer
      const m = await import('../../lycon-browser/manya/index.js');
      // Export the adapter factory + event factories + constants as the API
      return {
        createAdapter: m.createAdapter,
        createNavigationEvent: m.createNavigationEvent,
        createShieldBlockedEvent: m.createShieldBlockedEvent,
        createBookmarkEvent: m.createBookmarkEvent,
        createDownloadEvent: m.createDownloadEvent,
        LYCON_SYNC_CHANNELS: m.LYCON_SYNC_CHANNELS,
        LYCON_CAPABILITIES: m.LYCON_CAPABILITIES,
      };
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
