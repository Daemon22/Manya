export const MANYA_FOUNDATION = {
  name: "Manya",
  principle: "synchronized tools with distinct product ownership"
};

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

export const usingaManifest = createToolManifest({
  id: "usinga-api-nexus",
  name: "uSINGA - API NEXUS",
  purpose: "API provider wallet, credit visibility, provider health, and smart provider routing.",
  owns: ["apiKeyVault", "providerHealth", "providerCredits", "smartProviderRouting"],
  handsOff: ["workflowDagBuilder", "workflowExecutionLogs"],
  syncChannels: ["connection-reference", "provider-route-decision", "audit-event"]
});

export const helixFlowManifest = createToolManifest({
  id: "helixflow",
  name: "HelixFlow",
  purpose: "Visual workflow DAG design, dependency-aware execution, run logs, retries, and failure policies.",
  owns: ["workflowDagBuilder", "dependencyScheduler", "workflowExecutionLogs", "workflowFailurePolicies"],
  handsOff: ["apiKeyVault", "providerHealth", "providerCredits", "smartProviderRouting"],
  syncChannels: ["connection-reference", "route-decision-request", "workflow-run-event"]
});
