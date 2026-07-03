/**
 * Manya Weaver — Connection Rules Engine.
 *
 * The intelligence behind the interactive Weaver visualization. Knows what
 * can connect to what, and why. Used by the Weaver to:
 *   - Show "connection possible" feedback when dragging nodes together
 *   - Attract + establish valid connections
 *   - Repel + reject invalid connections
 *
 * Node types:
 *   - tool     — a Manya tool (forge, research-academic, lycon-browser, ...)
 *   - identity — a federated identity
 *   - type     — an identifier type (orcid, doi, imo, container, ...)
 *
 * Connection rules:
 *   tool ↔ tool      : share a sync channel, or consumer→provider via handsOff, or unify bridges
 *   identity ↔ type  : always possible (primary or linked identifier)
 *   identity ↔ tool  : tool owns identityLinking, or tool has linked this identity
 *   tool ↔ type      : tool owns a capability that validates/processes that identifier type
 *   type ↔ type      : NOT directly possible (bridged via vocabulary translation, which is tool-mediated)
 *   identity ↔ identity : NOT directly possible (connected via shared types or mergeIdentities)
 */

import { capabilityOwners } from '@manya/toolkit';

/**
 * Map of identifier type → the capability that validates/processes it.
 * Used by the tool ↔ type connection rule.
 */
const TYPE_TO_CAPABILITY = {
  orcid: 'citationValidation',
  doi: 'citationValidation',
  arxiv: 'citationValidation',
  pmid: 'citationValidation',
  nct: 'citationValidation',
  ror: 'citationValidation',
  isbn: 'citationValidation',
  imo: 'transportIdentifierValidation',
  awb: 'transportIdentifierValidation',
  container: 'transportIdentifierValidation',
  wagon: 'transportIdentifierValidation',
  hs_code: 'customsCompliance',
  email: 'dataRedaction',
  phone: 'dataRedaction',
};

/**
 * Map of identifier type → the tool that owns the validating capability.
 * Derived from capabilityOwners + TYPE_TO_CAPABILITY.
 */
const TYPE_TO_TOOL = {};
for (const [type, cap] of Object.entries(TYPE_TO_CAPABILITY)) {
  TYPE_TO_TOOL[type] = capabilityOwners[cap];
}

/**
 * Checks whether a connection between two nodes is possible.
 * @param {object} nodeA - First node { id, kind, ... }
 * @param {object} nodeB - Second node { id, kind, ... }
 * @param {object} [context] - Additional context { tools, identities, existingEdges }
 * @returns {{ possible: boolean, reason: string, edgeType: string|null, strength: number }}
 */
export function canConnect(nodeA, nodeB, context = {}) {
  if (!nodeA || !nodeB) {
    return { possible: false, reason: 'Missing node', edgeType: null, strength: 0 };
  }
  if (nodeA.id === nodeB.id) {
    return { possible: false, reason: 'Cannot connect a node to itself', edgeType: null, strength: 0 };
  }

  const kinds = [nodeA.kind, nodeB.kind].sort().join('-');

  switch (kinds) {
    case 'identity-type':
      return checkIdentityToType(nodeA, nodeB);

    case 'identity-tool':
      return checkIdentityToTool(nodeA, nodeB, context);

    case 'tool-tool':
      return checkToolToTool(nodeA, nodeB, context);

    case 'tool-type':
      return checkToolToType(nodeA, nodeB);

    case 'identity-identity':
      return checkIdentityToIdentity(nodeA, nodeB, context);

    case 'type-type':
      return {
        possible: false,
        reason: 'Identifier types do not connect to each other directly. They are bridged via vocabulary translation, which is tool-mediated.',
        edgeType: null,
        strength: 0,
      };

    default:
      return {
        possible: false,
        reason: `Unknown node kind combination: ${kinds}`,
        edgeType: null,
        strength: 0,
      };
  }
}

/**
 * Identity ↔ Type: always possible. The identity can have this type as its
 * primary identifier or as a linked identifier.
 */
function checkIdentityToType(nodeA, nodeB) {
  const identity = nodeA.kind === 'identity' ? nodeA : nodeB;
  const type = nodeA.kind === 'type' ? nodeA : nodeB;
  const isPrimary = identity.primaryType === type.typeId;
  const isLinked = identity.linkedTypes?.includes(type.typeId);

  if (isPrimary) {
    return {
      possible: true,
      reason: `${identity.label} has ${type.typeId} as primary identifier`,
      edgeType: 'primary',
      strength: 1.0,
    };
  }
  if (isLinked) {
    return {
      possible: true,
      reason: `${identity.label} has ${type.typeId} as a linked identifier`,
      edgeType: 'linked',
      strength: 0.8,
    };
  }
  return {
    possible: true,
    reason: `${identity.label} can link ${type.typeId} as a new identifier`,
    edgeType: 'potential-linked',
    strength: 0.5,
  };
}

/**
 * Identity ↔ Tool: possible if the tool owns identityLinking, or if the tool
 * has already linked this identity (via the Lycon adapter or similar).
 */
function checkIdentityToTool(nodeA, nodeB, context) {
  const identity = nodeA.kind === 'identity' ? nodeA : nodeB;
  const tool = nodeA.kind === 'tool' ? nodeA : nodeB;

  // The unify tool owns identityLinking — it can connect any identity
  if (tool.toolId === 'unify') {
    return {
      possible: true,
      reason: `${tool.label} owns identityLinking — can federate any identity`,
      edgeType: 'federation',
      strength: 0.9,
    };
  }

  // The lycon-browser can link browser profiles to identities
  if (tool.toolId === 'lycon-browser') {
    return {
      possible: true,
      reason: `${tool.label} can link browser profiles to federated identities`,
      edgeType: 'browser-identity',
      strength: 0.7,
    };
  }

  // Check if the tool has already linked this identity (from context)
  const toolLinks = context.identityLinks?.[tool.toolId] || [];
  if (toolLinks.includes(identity.identityId)) {
    return {
      possible: true,
      reason: `${tool.label} has already linked ${identity.label}`,
      edgeType: 'established',
      strength: 1.0,
    };
  }

  return {
    possible: false,
    reason: `${tool.label} does not own identityLinking and has not linked ${identity.label}`,
    edgeType: null,
    strength: 0,
  };
}

/**
 * Tool ↔ Tool: possible if they share a sync channel, or one tool's handsOff
 * includes a capability the other owns (consumer → provider), or unify bridges them.
 */
function checkToolToTool(nodeA, nodeB, context) {
  const toolA = nodeA;
  const toolB = nodeB;

  // Check for shared sync channels
  const sharedChannels = (toolA.syncChannels || []).filter(ch => (toolB.syncChannels || []).includes(ch));
  if (sharedChannels.length > 0) {
    return {
      possible: true,
      reason: `${toolA.label} and ${toolB.label} share ${sharedChannels.length} sync channel(s): ${sharedChannels.slice(0, 2).join(', ')}${sharedChannels.length > 2 ? '...' : ''}`,
      edgeType: 'sync-channel',
      strength: 0.8,
    };
  }

  // Check for consumer → provider relationship (one tool handsOff a capability the other owns)
  const capsOwnedByB = context.capabilitiesByTool?.[toolB.toolId] || [];
  const capsOwnedByA = context.capabilitiesByTool?.[toolA.toolId] || [];
  const aConsumesFromB = (toolA.handsOff || []).filter(cap => capsOwnedByB.includes(cap));
  const bConsumesFromA = (toolB.handsOff || []).filter(cap => capsOwnedByA.includes(cap));

  if (aConsumesFromB.length > 0) {
    return {
      possible: true,
      reason: `${toolA.label} consumes ${aConsumesFromB[0]} from ${toolB.label}`,
      edgeType: 'consumer-provider',
      strength: 0.7,
    };
  }
  if (bConsumesFromA.length > 0) {
    return {
      possible: true,
      reason: `${toolB.label} consumes ${bConsumesFromA[0]} from ${toolA.label}`,
      edgeType: 'consumer-provider',
      strength: 0.7,
    };
  }

  // The unify tool can bridge any two tools (it owns capabilityDispatch)
  if (toolA.toolId === 'unify' || toolB.toolId === 'unify') {
    const other = toolA.toolId === 'unify' ? toolB : toolA;
    const unify = toolA.toolId === 'unify' ? toolA : toolB;
    return {
      possible: true,
      reason: `${unify.label} can dispatch capabilities to ${other.label}`,
      edgeType: 'capability-dispatch',
      strength: 0.6,
    };
  }

  return {
    possible: false,
    reason: `${toolA.label} and ${toolB.label} share no sync channels, no consumer-provider relationship, and neither is unify`,
    edgeType: null,
    strength: 0,
  };
}

/**
 * Tool ↔ Type: possible if the tool owns the capability that validates/processes
 * that identifier type.
 */
function checkToolToType(nodeA, nodeB) {
  const tool = nodeA.kind === 'tool' ? nodeA : nodeB;
  const type = nodeA.kind === 'type' ? nodeA : nodeB;

  const expectedTool = TYPE_TO_TOOL[type.typeId];
  if (expectedTool && expectedTool === tool.toolId) {
    const cap = TYPE_TO_CAPABILITY[type.typeId];
    return {
      possible: true,
      reason: `${tool.label} owns ${cap} which validates ${type.typeId} identifiers`,
      edgeType: 'validates',
      strength: 0.9,
    };
  }

  // The unify tool can translate between vocabularies, so it can interact with any type
  if (tool.toolId === 'unify') {
    return {
      possible: true,
      reason: `${tool.label} can bridge ${type.typeId} via vocabulary translation`,
      edgeType: 'vocabulary-bridge',
      strength: 0.5,
    };
  }

  return {
    possible: false,
    reason: `${tool.label} does not own a capability that validates ${type.typeId} identifiers`,
    edgeType: null,
    strength: 0,
  };
}

/**
 * Identity ↔ Identity: NOT directly possible. They connect via shared types
 * or via mergeIdentities (unify tool).
 */
function checkIdentityToIdentity(nodeA, nodeB, context) {
  const idA = nodeA;
  const idB = nodeB;

  // Check for shared identifier types
  const typesA = new Set([idA.primaryType, ...(idA.linkedTypes || [])]);
  const typesB = new Set([idB.primaryType, ...(idB.linkedTypes || [])]);
  const sharedTypes = [...typesA].filter(t => typesB.has(t));

  if (sharedTypes.length > 0) {
    return {
      possible: true,
      reason: `${idA.label} and ${idB.label} share ${sharedTypes.length} identifier type(s): ${sharedTypes.join(', ')}`,
      edgeType: 'shared-type',
      strength: 0.6,
    };
  }

  // mergeIdentities can consolidate two identities
  return {
    possible: true,
    reason: `${idA.label} and ${idB.label} can be merged via unify's mergeIdentities`,
    edgeType: 'mergeable',
    strength: 0.3,
  };
}

/**
 * Returns all node pairs that CAN connect, given the current graph state.
 * Useful for suggesting potential connections to the user.
 * @param {object[]} nodes - All nodes in the graph.
 * @param {object} context - { tools, identities, existingEdges, capabilitiesByTool, identityLinks }
 * @returns {Array<{ from: object, to: object, rule: object }>}
 */
export function findPotentialConnections(nodes, context = {}) {
  const potentials = [];
  const existingSet = new Set((context.existingEdges || []).map(e => `${e.from}|${e.to}`));

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const key = `${a.id}|${b.id}`;
      const reverseKey = `${b.id}|${a.id}`;
      if (existingSet.has(key) || existingSet.has(reverseKey)) continue;

      const rule = canConnect(a, b, context);
      if (rule.possible) {
        potentials.push({ from: a, to: b, rule });
      }
    }
  }
  return potentials;
}

/**
 * Returns the map of identifier type → owning tool.
 * @returns {Record<string, string>}
 */
export function getTypeToToolMap() {
  return { ...TYPE_TO_TOOL };
}

/**
 * Returns the map of identifier type → validating capability.
 * @returns {Record<string, string>}
 */
export function getTypeToCapabilityMap() {
  return { ...TYPE_TO_CAPABILITY };
}

/**
 * Builds the context object needed by canConnect from the raw tools + identities.
 * @param {object[]} tools - List of tool summaries (from listTools()).
 * @param {object[]} identities - List of federated identities.
 * @returns {object} The context object with capabilitiesByTool, identityLinks, etc.
 */
export function buildContext(tools = [], identities = []) {
  const capabilitiesByTool = {};
  for (const tool of tools) {
    capabilitiesByTool[tool.toolId] = tool.owns || [];
  }

  const identityLinks = {};
  // If identities have linked info with source tools, map them
  for (const identity of identities) {
    for (const link of identity.linked || []) {
      if (link.source) {
        if (!identityLinks[link.source]) identityLinks[link.source] = [];
        if (!identityLinks[link.source].includes(identity.id)) {
          identityLinks[link.source].push(identity.id);
        }
      }
    }
  }

  return { capabilitiesByTool, identityLinks };
}
