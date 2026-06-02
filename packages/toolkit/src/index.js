/**
 * Foundation identity for the Manya tool ecosystem.
 * All tool manifests reference this as their foundation.
 */
export const MANYA_FOUNDATION = {
  name: "Manya",
  principle: "synchronized tools with distinct product ownership"
};

/**
 * Maps each capability to the tool that owns it.
 * Used to enforce the rule that no two tools own the same capability.
 */
export const capabilityOwners = {
  apiKeyVault: "usinga-api-nexus",
  providerHealth: "usinga-api-nexus",
  providerCredits: "usinga-api-nexus",
  smartProviderRouting: "usinga-api-nexus",
  workflowDagBuilder: "helixflow",
  dependencyScheduler: "helixflow",
  workflowExecutionLogs: "helixflow",
  workflowFailurePolicies: "helixflow"
};

/**
 * Creates a frozen tool manifest that declares a tool's identity,
 * owned capabilities, off-limit capabilities, and sync channels.
 *
 * @param {object} input
 * @param {string} input.id - Unique identifier for the tool.
 * @param {string} input.name - Human-readable tool name.
 * @param {string} input.purpose - What the tool does.
 * @param {string[]} [input.owns=[]] - Capabilities this tool owns exclusively.
 * @param {string[]} [input.handsOff=[]] - Capabilities this tool must not touch.
 * @param {string[]} [input.syncChannels=[]] - Channels the tool uses for cross-tool sync.
 * @returns {Readonly<ToolManifest>} The immutable manifest.
 */
export function createToolManifest({
  id,
  name,
  purpose,
  owns = [],
  handsOff = [],
  syncChannels = []
}) {
  if (!id || !name || !purpose) {
    throw new Error("Tool manifest requires id, name, and purpose.");
  }
  return Object.freeze({
    foundation: MANYA_FOUNDATION.name,
    id,
    name,
    purpose,
    owns: [...owns],
    handsOff: [...handsOff],
    syncChannels: [...syncChannels]
  });
}

/**
 * Checks whether a set of manifests have distinct capability ownership.
 * Returns overlap details if two or more manifests claim the same capability.
 *
 * @param {ToolManifest[]} manifests - Manifests to check.
 * @returns {{ distinct: boolean, overlaps: CapabilityOverlap[] }}
 */
export function assertDistinctCapabilities(manifests) {
  const owners = new Map();
  const overlaps = [];

  for (const manifest of manifests) {
    for (const capability of manifest.owns ?? []) {
      const currentOwner = owners.get(capability);
      if (currentOwner && currentOwner !== manifest.id) {
        overlaps.push({ capability, owners: [currentOwner, manifest.id] });
      }
      owners.set(capability, manifest.id);
    }
  }

  return {
    distinct: overlaps.length === 0,
    overlaps
  };
}

/**
 * Pre-built manifest for uSINGA - API NEXUS.
 * Owns API key vault, provider health, credits, and smart routing.
 */
export const usingaManifest = createToolManifest({
  id: "usinga-api-nexus",
  name: "uSINGA - API NEXUS",
  purpose: "API provider wallet, credit visibility, provider health, and smart provider routing.",
  owns: ["apiKeyVault", "providerHealth", "providerCredits", "smartProviderRouting"],
  handsOff: ["workflowDagBuilder", "workflowExecutionLogs"],
  syncChannels: ["connection-reference", "provider-route-decision", "audit-event"]
});

/**
 * Pre-built manifest for HelixFlow.
 * Owns workflow DAG design, dependency scheduling, execution logs, and failure policies.
 */
export const helixFlowManifest = createToolManifest({
  id: "helixflow",
  name: "HelixFlow",
  purpose: "Visual workflow DAG design, dependency-aware execution, run logs, retries, and failure policies.",
  owns: ["workflowDagBuilder", "dependencyScheduler", "workflowExecutionLogs", "workflowFailurePolicies"],
  handsOff: ["apiKeyVault", "providerHealth", "providerCredits", "smartProviderRouting"],
  syncChannels: ["connection-reference", "route-decision-request", "workflow-run-event"]
});
