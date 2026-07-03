/**
 * Manya Unify — Connective tissue for the Manya ecosystem.
 *
 * Federates identities across tools (ORCID, DOI, ROR, IMO, container, AWB,
 * HS code), routes events through declared sync channels, bridges
 * vocabularies (HS↔industry, UN/LOCODE↔country, industry↔sector/domain),
 * and dispatches capability-based calls to the tool that owns each
 * capability.
 *
 * Everything Connected. Everyone Unified.
 */

import {
  registerTool,
  unregisterTool,
  getTool,
  listTools,
  route,
  dispatch,
  getSyncChannels,
  findConsumers,
  _resetMesh,
} from './mesh.js';

import {
  createIdentity,
  linkIdentity,
  resolveIdentity,
  findByIdentitySource,
  mergeIdentities,
  listIdentities,
  identityCount,
  _resetFederation,
  _hydrateIdentities,
} from './federation.js';

import {
  createBus,
  subscribe,
  publish,
  route as routeEvent,
  replay,
  busStats,
} from './eventbus.js';

import {
  translate,
  getIndustryDomainMap,
  getHsChapterMap,
  listTranslations,
} from './vocabularies.js';

export const unify = {
  // Mesh
  registerTool,
  unregisterTool,
  getTool,
  listTools,
  route,
  dispatch,
  getSyncChannels,
  findConsumers,
  // Federation
  createIdentity,
  linkIdentity,
  resolveIdentity,
  findByIdentitySource,
  mergeIdentities,
  listIdentities,
  identityCount,
  // Event Bus
  createBus,
  subscribe,
  publish,
  routeEvent,
  replay,
  busStats,
  // Vocabularies
  translate,
  getIndustryDomainMap,
  getHsChapterMap,
  listTranslations,
};

export {
  // Mesh
  registerTool,
  unregisterTool,
  getTool,
  listTools,
  route,
  dispatch,
  getSyncChannels,
  findConsumers,
  _resetMesh,
  // Federation
  createIdentity,
  linkIdentity,
  resolveIdentity,
  findByIdentitySource,
  mergeIdentities,
  listIdentities,
  identityCount,
  _resetFederation,
  _hydrateIdentities,
  // Event Bus
  createBus,
  subscribe,
  publish,
  routeEvent,
  replay,
  busStats,
  // Vocabularies
  translate,
  getIndustryDomainMap,
  getHsChapterMap,
  listTranslations,
};

export default unify;
