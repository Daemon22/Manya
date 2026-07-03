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
  workflowFailurePolicies: "helixflow",
  keyDerivation: "forge",
  passphraseStrength: "forge",
  keyRotation: "forge",
  multiAlgorithmHash: "forge",
  compressionAnalytics: "craft-engine",
  timestampProof: "stamp",
  provenanceChain: "stamp",
  auditTrail: "stamp",
  encryptedStorage: "vault",
  secretManagement: "vault",
  dataDetection: "lens",
  dataRedaction: "lens",
  sensitivityClassification: "lens",
  accessControl: "shield",
  roleManagement: "shield",
  accessAudit: "shield",
  secureMessaging: "signal",
  messageSigning: "signal",
  envelopeEncryption: "signal",
  industryPresets: "pulse",
  complianceTemplates: "pulse",
  industryPolicyTemplates: "pulse",
  industrySignalTypes: "pulse",
  sectorValidation: "primary-sector",
  sectorCompliance: "primary-sector",
  sectorPresets: "primary-sector",
  coordinateValidation: "primary-sector",
  productionReporting: "primary-sector",
  threatIntelligence: "cybersecurity",
  vulnerabilityAssessment: "cybersecurity",
  securityCompliance: "cybersecurity",
  digitalForensics: "cybersecurity",
  incidentResponse: "cybersecurity",
  transportModePresets: "transport-logistics",
  transportIdentifierValidation: "transport-logistics",
  shipmentTracking: "transport-logistics",
  customsCompliance: "transport-logistics",
  dangerousGoodsClassification: "transport-logistics",
  sanctionsScreening: "transport-logistics",
  researchDomainPresets: "research-academic",
  citationValidation: "research-academic",
  reproducibilityManifests: "research-academic",
  peerReviewProvenance: "research-academic",
  researchDataManagement: "research-academic",
  toolFederation: "unify",
  identityLinking: "unify",
  syncChannelRouting: "unify",
  vocabularyBridging: "unify",
  capabilityDispatch: "unify",
  webBrowsing: "lycon-browser",
  adBlocking: "lycon-browser",
  bookmarkManagement: "lycon-browser",
  downloadManagement: "lycon-browser",
  privateBrowsing: "lycon-browser",
  browserHistoryManagement: "lycon-browser",
  activityTracking: "upmp",
  stuckPointDetection: "upmp",
  discoveryLogging: "upmp",
  intelligenceEngagement: "upmp",
  progressMonitoring: "upmp",
  discussionExport: "upmp",
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
  handsOff: ["apiKeyVault", "providerHealth", "providerCredits", "smartProviderRouting", "keyDerivation", "passphraseStrength"],
  syncChannels: ["connection-reference", "route-decision-request", "workflow-run-event"]
});

/**
 * Pre-built manifest for Forge.
 * Owns key derivation, passphrase strength analysis, key rotation, and multi-algorithm hashing.
 */
export const forgeManifest = createToolManifest({
  id: "forge",
  name: "Forge",
  purpose: "Key derivation, passphrase strength scoring, key rotation, and multi-algorithm hashing for the Manya ecosystem.",
  owns: ["keyDerivation", "passphraseStrength", "keyRotation", "multiAlgorithmHash"],
  handsOff: ["apiKeyVault", "providerHealth", "workflowDagBuilder", "workflowExecutionLogs"],
  syncChannels: ["key-rotation-event", "strength-audit", "hash-verification"]
});

/**
 * Pre-built manifest for Craft Engine.
 * Owns compression, encryption, integrity, and compression analytics.
 */
export const craftEngineManifest = createToolManifest({
  id: "craft-engine",
  name: "Craft Engine",
  purpose: "7-Fold adaptive compression, AES-256-GCM encryption, integrity verification, multi-file archiving, and compression analytics.",
  owns: ["compressionAnalytics"],
  handsOff: ["keyDerivation", "passphraseStrength", "apiKeyVault"],
  syncChannels: ["compression-report", "archive-event"]
});

/**
 * Pre-built manifest for Stamp.
 * Owns timestamp proof, provenance chains, and audit trails.
 */
export const stampManifest = createToolManifest({
  id: "stamp",
  name: "Stamp",
  purpose: "Tamper-proof timestamping, provenance chains, and audit trails for compliance and accountability across industries.",
  owns: ["timestampProof", "provenanceChain", "auditTrail"],
  handsOff: ["keyDerivation", "passphraseStrength", "accessControl", "encryptedStorage"],
  syncChannels: ["timestamp-event", "chain-verification", "audit-record"]
});

/**
 * Pre-built manifest for Vault.
 * Owns encrypted storage and secret management.
 */
export const vaultManifest = createToolManifest({
  id: "vault",
  name: "Vault",
  purpose: "Encrypted key-value store for secrets, configuration, and credential management across all industries.",
  owns: ["encryptedStorage", "secretManagement"],
  handsOff: ["keyDerivation", "timestampProof", "accessControl", "messageSigning"],
  syncChannels: ["vault-seal", "vault-access", "secret-rotation"]
});

/**
 * Pre-built manifest for Lens.
 * Owns data detection, redaction, and sensitivity classification.
 */
export const lensManifest = createToolManifest({
  id: "lens",
  name: "Lens",
  purpose: "Data format detection, PII/PHI redaction, and sensitivity classification for compliance across Healthcare, Finance, Legal, and data pipelines.",
  owns: ["dataDetection", "dataRedaction", "sensitivityClassification"],
  handsOff: ["encryptedStorage", "accessControl", "messageSigning", "timestampProof"],
  syncChannels: ["scan-result", "classification-event", "redaction-report"]
});

/**
 * Pre-built manifest for Shield.
 * Owns access control, role management, and access audit.
 */
export const shieldManifest = createToolManifest({
  id: "shield",
  name: "Shield",
  purpose: "Role-based and attribute-based access control engine with audit logging for HIPAA, SOX, clearance, and multi-tenant compliance.",
  owns: ["accessControl", "roleManagement", "accessAudit"],
  handsOff: ["encryptedStorage", "messageSigning", "timestampProof", "dataRedaction"],
  syncChannels: ["access-decision", "role-change", "audit-event"]
});

/**
 * Pre-built manifest for Signal.
 * Owns secure messaging, message signing, and envelope encryption.
 */
export const signalManifest = createToolManifest({
  id: "signal",
  name: "Signal",
  purpose: "Secure encrypted message envelopes with cryptographic signatures for Healthcare comms, Finance signals, IoT commands, and team messaging.",
  owns: ["secureMessaging", "messageSigning", "envelopeEncryption"],
  handsOff: ["accessControl", "encryptedStorage", "timestampProof", "dataRedaction"],
  syncChannels: ["message-sealed", "signature-verified", "envelope-transit"]
});

/**
 * Pre-built manifest for Pulse.
 * Owns industry presets, compliance templates, policy templates, and signal type configurations.
 */
export const pulseManifest = createToolManifest({
  id: "pulse",
  name: "Pulse",
  purpose: "Industry presets engine that composes Lens, Shield, Stamp, Vault, and Signal into industry-specific configurations for Healthcare, Finance, Legal, IoT, Government, Education, Retail, Energy, Telecom, and Gaming.",
  owns: ["industryPresets", "complianceTemplates", "industryPolicyTemplates", "industrySignalTypes"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "messageSigning"],
  syncChannels: ["industry-preset-loaded", "compliance-check", "policy-template-applied"]
});

/**
 * Pre-built manifest for Primary Sector.
 * Owns sector validation, sector compliance, sector presets, coordinate validation, and production reporting.
 */
export const primarySectorManifest = createToolManifest({
  id: "primary-sector",
  name: "Primary Sector",
  purpose: "Data tools for Agriculture, Mining, Forestry, and Fishing industries with sector-specific compliance, GPS validation, commodity verification, production reporting, and environmental audit capabilities.",
  owns: ["sectorValidation", "sectorCompliance", "sectorPresets", "coordinateValidation", "productionReporting"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "messageSigning", "dataRedaction", "industryPresets"],
  syncChannels: ["sector-data-validated", "compliance-check-sector", "production-report-filed"]
});

/**
 * Pre-built manifest for Cybersecurity.
 * Owns threat intelligence, vulnerability assessment, security compliance, digital forensics, and incident response.
 */
export const cybersecurityManifest = createToolManifest({
  id: "cybersecurity",
  name: "Cybersecurity",
  purpose: "Threat intelligence, CVSS vulnerability assessment, security framework compliance (NIST/ISO/SOC2/PCI-DSS), digital forensics with chain of custody, and incident response classification for the Manya ecosystem.",
  owns: ["threatIntelligence", "vulnerabilityAssessment", "securityCompliance", "digitalForensics", "incidentResponse"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "dataRedaction", "industryPresets", "sectorValidation"],
  syncChannels: ["threat-classified", "vulnerability-scored", "incident-escalated", "evidence-collected"]
});

/**
 * Pre-built manifest for Transport & Logistics.
 * Owns transport mode presets, identifier validation, shipment tracking with geofencing,
 * customs compliance, dangerous-goods classification, and sanctions screening across
 * Aviation, Maritime, Road, Rail, and Multimodal freight.
 */
export const transportLogisticsManifest = createToolManifest({
  id: "transport-logistics",
  name: "Transport & Logistics",
  purpose: "Transport mode presets for Aviation, Maritime, Road, Rail, and Multimodal freight; identifier validation (AWB, IMO, ISO 6346, UIC, flight, HS, TIR); shipment tracking with geofencing and ETA; customs declarations, dangerous-goods classification (IMDG/IATA-DGR/ADR/RID), and sanctions screening.",
  owns: ["transportModePresets", "transportIdentifierValidation", "shipmentTracking", "customsCompliance", "dangerousGoodsClassification", "sanctionsScreening"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "messageSigning", "dataRedaction", "industryPresets", "sectorValidation", "threatIntelligence"],
  syncChannels: ["shipment-event-recorded", "geofence-triggered", "customs-declaration-issued", "dg-declaration-signed", "sanctions-screened"]
});

/**
 * Pre-built manifest for Research & Academic.
 * Owns research domain presets, citation validation (DOI/ORCID/arXiv/PMID/NCT/ROR/ISBN),
 * reproducibility manifests, peer-review provenance, and research-data management (DMP, FAIR).
 */
export const researchAcademicManifest = createToolManifest({
  id: "research-academic",
  name: "Research & Academic",
  purpose: "Research domain presets for Life Sciences, Physical Sciences, Social Sciences, and Computational Sciences; citation validation (DOI, ORCID, arXiv, PMID, NCT, ROR, ISBN-13); reproducibility manifests with FAIR assessment; peer-review lifecycle and integrity verification; and Data Management Plan (DMP) templates.",
  owns: ["researchDomainPresets", "citationValidation", "reproducibilityManifests", "peerReviewProvenance", "researchDataManagement"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "messageSigning", "dataRedaction", "industryPresets", "sectorValidation", "transportModePresets"],
  syncChannels: ["citation-verified", "manifest-verified", "review-event-recorded", "dmp-issued", "fair-assessed"]
});

/**
 * Pre-built manifest for Unify — the connective tissue of the Manya ecosystem.
 * Owns tool federation (cross-tool identity linking), sync channel routing
 * (event bus), vocabulary bridging (HS↔industry, UN/LOCODE↔country,
 * industry↔sector/domain), and capability-based dispatch (routing calls to
 * the tool that owns each capability). Makes 'Everything Connected. Everyone
 * Unified.' true at runtime.
 */
export const unifyManifest = createToolManifest({
  id: "unify",
  name: "Manya Unify",
  purpose: "Connective tissue for the Manya ecosystem: federates identities across tools (ORCID, DOI, ROR, IMO, container, AWB, HS code), routes events through declared sync channels, bridges vocabularies between tools, and dispatches capability-based calls to the owning tool. The runtime embodiment of 'Everything Connected. Everyone Unified.'",
  owns: ["toolFederation", "identityLinking", "syncChannelRouting", "vocabularyBridging", "capabilityDispatch"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "messageSigning", "dataRedaction", "industryPresets", "sectorValidation", "transportModePresets", "citationValidation", "shipmentTracking"],
  syncChannels: ["identity-linked", "event-routed", "capability-dispatched", "vocabulary-translated"]
});

/**
 * Pre-built manifest for Lycon Browser — the privacy-first web browser
 * integrated with the Manya ecosystem. Owns web browsing, ad/tracker blocking
 * (Lycon Shields), bookmark management, download management, private browsing,
 * and browser history. Browser events flow into Manya's event bus on the
 * lycon:* sync channels, and browser profiles can be linked to Manya
 * federated identities.
 */
export const lyconManifest = createToolManifest({
  id: "lycon-browser",
  name: "Lycon Browser",
  purpose: "Privacy-first web browser with ad/tracker blocking (Lycon Shields), multi-tab browsing, bookmarks, history, downloads, and private mode. Browser events (navigation, shield-blocked, bookmark-added, download) flow into Manya's event bus, and browser profiles can be linked to Manya federated identities. Browse wild. Browse free. Everything Connected.",
  owns: ["webBrowsing", "adBlocking", "bookmarkManagement", "downloadManagement", "privateBrowsing", "browserHistoryManagement"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "messageSigning", "dataRedaction", "industryPresets", "citationValidation", "shipmentTracking", "toolFederation", "identityLinking"],
  syncChannels: ["lycon:navigation", "lycon:bookmark-added", "lycon:download", "lycon:shield-blocked", "lycon:tab-opened", "lycon:tab-closed", "lycon:identity-linked"]
});

/**
 * Pre-built manifest for UPMP — Universal Progress Monitoring with Active
 * Device Tracker. Owns activity tracking, stuck-point detection, discovery
 * logging, intelligence engagement (Gardner's 9 + custom), 15-layer progress
 * monitoring, and discussion artifact export. Activity events flow into
 * Manya's event bus, and intelligences can be linked to federated identities.
 */
export const upmpManifest = createToolManifest({
  id: "upmp",
  name: "UPMP",
  purpose: "Universal Progress Monitoring with Active Device Tracker. Captures writing/activity sessions with stuck-point detection, logs discoveries from scrolling, tracks intelligence engagement (Gardner's 9 + custom), and generates 15-layer progress reports. Activity events flow into Manya's event bus on upmp:* sync channels, and intelligences can be linked to Manya federated identities — so your linguistic intelligence profile is part of who you are.",
  owns: ["activityTracking", "stuckPointDetection", "discoveryLogging", "intelligenceEngagement", "progressMonitoring", "discussionExport"],
  handsOff: ["keyDerivation", "encryptedStorage", "accessControl", "messageSigning", "dataRedaction", "industryPresets", "citationValidation", "shipmentTracking", "toolFederation", "webBrowsing"],
  syncChannels: ["upmp:session-started", "upmp:session-ended", "upmp:stuck-point", "upmp:stuck-resolved", "upmp:discovery", "upmp:intelligence-engaged", "upmp:breakthrough"]
});
